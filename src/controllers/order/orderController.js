// src/controllers/order/orderController.js
// FINAL PRODUCTION — DECEMBER 18, 2025 — BULLETPROOF ORDER SYSTEM

const User = require('../../models/user/User');
const Order = require('../../models/order/Order');
const Address = require('../../models/address/Address');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');
const MenuItem = require('../../models/menuItem/MenuItem');
const Cart = require('../../models/cart/Cart');
const Area = require('../../models/area/Area');
const PaymentTransaction = require('../../models/payment/PaymentTransaction');
const KitchenOrder = require('../../models/kitchen/KitchenOrder');
const Wallet = require('../../models/wallet/Wallet');
const stripe = require('../../config/stripe');
const { applyAndTrackDeal } = require('../deal/dealController');
const PDFDocument = require('pdfkit');
const admin = require('firebase-admin');
const mongoose = require('mongoose');
const { debitWallet } = require('../wallet/walletController');
const io = global.io;

global.pendingOrderTimeouts = global.pendingOrderTimeouts || {};
const AUTO_CANCEL_DELAY = 15 * 60 * 1000; // 15 minutes

const BANK_DETAILS = {
  bankName: process.env.REACT_APP_BANK_NAME,
  accountTitle: process.env.REACT_APP_ACCOUNT_TITLE,
  accountNumber: process.env.REACT_APP_ACCOUNT_NUMBER,
  iban: process.env.REACT_APP_IBAN,
  branch: process.env.REACT_APP_BRANCH,
};

console.log(BANK_DETAILS);


const orderIdShort = (id) => id?.toString().slice(-6).toUpperCase() || 'TEMP';

// Helper: Convert number → Decimal128 safely
const toDecimal = (num) => new mongoose.Types.Decimal128(num.toString());

// Helper: Convert Decimal128 → number for JSON
const toNumber = (decimal) => decimal ? parseFloat(decimal.toString()) : 0;

// ====================== FCM NOTIFICATION ======================
const sendNotification = async (order, type) => {
  try {
    const customerId = order.customer?._id || order.customer || order.guestInfo;
    if (!customerId?._id && !customerId) return;

    const userId = customerId._id || customerId;
    const user = await User.findById(userId).select('fcmToken').lean();
    if (!user?.fcmToken) return;

    const shortId = orderIdShort(order._id);

    const messages = {
      new_order: { title: 'Order Placed!', body: `Your order #${shortId} has been received!` },
      status_updated: { title: 'Order Update', body: `Your order #${shortId} is now: ${order.status.replace(/_/g, ' ')}` },
      rider_assigned: { title: 'Rider Assigned', body: `Your rider is on the way with #${shortId}` },
      order_cancelled: { title: 'Order Cancelled', body: `Order #${shortId} was cancelled.` },
      order_rejected: { title: 'Order Rejected', body: `Sorry, order #${shortId} was rejected.` },
      payment_success: { title: 'Payment Successful', body: `Payment for #${shortId} confirmed!` },
    };

    const msg = messages[type];
    if (!msg) return;

    await admin.messaging().send({
      token: user.fcmToken,
      notification: { title: msg.title, body: msg.body },
      data: {
        type: 'order_update',
        orderId: order._id.toString(),
        status: order.status,
        shortId,
      },
    });
  } catch (err) {
    console.error('FCM Notification Error:', err.message);
  }
};

// ====================== PAYMENT BROADCAST ======================
const broadcastPaymentEvent = (order, event, extra = {}) => {
  if (!io || !order) return;

  const shortId = orderIdShort(order._id);
  const amount = toNumber(order.finalAmount) + (order.walletUsed ? toNumber(order.walletUsed) : 0);

  const payload = {
    event,
    orderId: order._id.toString(),
    shortId,
    amount,
    method: order.paymentMethod,
    timestamp: new Date(),
    ...extra,
  };

  if (order.customer) {
    io.to(`user:${order.customer}`).emit('paymentUpdate', payload);
  }
  io.to('admin').emit('paymentUpdate', payload);
};

// ====================== CREATE ORDER ======================
const createOrder = async (req, res) => {
  let session = null;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (err) {
    console.warn('MongoDB transactions not supported — proceeding without session');
  }

  try {
    const {
      items = [],
      addressId,
      guestAddress = {},
      name = '',
      phone = '',
      paymentMethod: rawPaymentMethod = 'cod',
      promoCode,
      useWallet = false,
      instructions = '',
    } = req.body;

    const isGuest = !req.user;
    const customerId = req.user?._id || null;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required' });
    }

    const paymentMethod = rawPaymentMethod.toLowerCase();
    const methodMap = {
      cod: 'cash',
      card: 'card',
      easypaisa: 'easypaisa',
      jazzcash: 'jazzcash',
      bank: 'bank',
      wallet: 'wallet',
    };
    const payment = methodMap[paymentMethod];
    if (!payment) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    // === ADDRESS & AREA VALIDATION ===
    let areaId, deliveryAddress;
    if (isGuest) {
      if (!guestAddress.fullAddress?.trim() || !guestAddress.areaId || !name.trim() || !phone.trim()) {
        return res.status(400).json({ success: false, message: 'Guest details incomplete' });
      }
      if (!mongoose.Types.ObjectId.isValid(guestAddress.areaId)) {
        return res.status(400).json({ success: false, message: 'Invalid area ID' });
      }
      const area = await Area.findById(guestAddress.areaId).lean();
      if (!area) return res.status(400).json({ success: false, message: 'Area not found' });
      areaId = area._id;
      deliveryAddress = {
        fullAddress: guestAddress.fullAddress.trim(),
        label: guestAddress.label || 'Home',
        floor: guestAddress.floor || '',
        instructions: guestAddress.instructions || '',
      };
    } else {
      if (!addressId) return res.status(400).json({ success: false, message: 'Address ID required' });
      const addr = await Address.findOne({ _id: addressId, user: customerId }).populate('area').lean();
      if (!addr?.area) return res.status(404).json({ success: false, message: 'Address not found' });
      areaId = addr.area._id;
      deliveryAddress = {
        fullAddress: addr.fullAddress,
        label: addr.label,
        floor: addr.floor || '',
        instructions: addr.instructions || '',
      };
    }

    const deliveryZone = await DeliveryZone.findOne({ area: areaId, isActive: true }).lean();
    if (!deliveryZone) return res.status(400).json({ success: false, message: 'Delivery not available in this area' });

    // === PROCESS MENU ITEMS ===
    const orderItems = [];
    let subtotal = 0;
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem).lean();
      if (!menuItem?.isAvailable) continue;
      const qty = Math.max(1, Number(item.quantity) || 1);
      const itemTotal = menuItem.price * qty;
      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        image: menuItem.image,
        priceAtOrder: menuItem.price,
        quantity: qty,
      });
      subtotal += itemTotal;
    }

    if (orderItems.length === 0) return res.status(400).json({ success: false, message: 'No available items' });
    if (subtotal < deliveryZone.minOrderAmount) {
      return res.status(400).json({ success: false, message: `Minimum order: PKR ${deliveryZone.minOrderAmount}` });
    }

    // === PROMO CODE ===
    let discount = 0;
    let appliedDeal = null;
    if (promoCode) {
      const result = await applyAndTrackDeal(promoCode.trim().toUpperCase(), subtotal, customerId);
      if (result?.discount > 0) {
        discount = result.discount;
        appliedDeal = { ...result, appliedDiscount: discount };
      }
    }

    let finalAmount = Math.max(0, subtotal + deliveryZone.deliveryFee - discount);
    let walletUsed = 0;

    // === WALLET USAGE (Decimal128 safe) ===
    if (!isGuest && (paymentMethod === 'wallet' || useWallet)) {
      const wallet = await Wallet.findOne({ user: customerId }).session(session).lean();
      if (wallet && toNumber(wallet.balance) > 0) {
        const available = toNumber(wallet.balance);
        walletUsed = Math.min(available, finalAmount);
        finalAmount -= walletUsed;
      }
    }

    const baseData = {
      items: orderItems,
      totalAmount: toDecimal(subtotal),
      deliveryFee: toDecimal(deliveryZone.deliveryFee),
      discountApplied: toDecimal(discount),
      finalAmount: toDecimal(finalAmount),
      walletUsed: toDecimal(walletUsed),
      area: areaId,
      deliveryZone: deliveryZone._id,
      estimatedDelivery: deliveryZone.estimatedTime || '40-55 min',
      appliedDeal,
      paymentMethod: finalAmount === 0 ? 'wallet' : payment,
      addressDetails: deliveryAddress,
      instructions: instructions.trim().slice(0, 300),
      ...(isGuest
        ? { guestInfo: { name: name.trim(), phone: phone.trim(), isGuest: true } }
        : { customer: customerId, address: addressId }),
    };

    let order, clientSecret = null;

    // === PAYMENT HANDLING ===
    if (finalAmount === 0) {
      order = new Order({ ...baseData, status: 'pending', paymentStatus: 'paid', paidAt: new Date() });
    } else if (['cash', 'easypaisa', 'jazzcash'].includes(payment)) {
      order = new Order({
        ...baseData,
        status: 'pending',
        paymentStatus: payment === 'cash' ? 'pending' : 'paid',
        paidAt: payment !== 'cash' ? new Date() : null,
      });
    } else if (payment === 'bank') {
      order = new Order({ ...baseData, status: 'pending_payment', paymentStatus: 'pending' });
      order.bankTransferReference = `${isGuest ? 'GUEST' : 'USER'}-${orderIdShort(order._id)}`;
    } else if (payment === 'card') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalAmount * 100),
        currency: 'pkr',
        metadata: {
          orderId: 'pending',
          customerId: customerId ? customerId.toString() : 'guest',
          walletUsed: walletUsed.toString(),
        },
        automatic_payment_methods: { enabled: true },
      });

      order = new Order({
        ...baseData,
        paymentIntentId: paymentIntent.id,
        status: 'pending_payment',
        paymentStatus: 'pending',
      });

      await stripe.paymentIntents.update(paymentIntent.id, {
        metadata: { orderId: order._id.toString() },
      });

      clientSecret = paymentIntent.client_secret;

      global.pendingOrderTimeouts[order._id.toString()] = setTimeout(async () => {
        try {
          const o = await Order.findById(order._id);
          if (o?.status === 'pending_payment') {
            await Order.findByIdAndUpdate(o._id, { status: 'cancelled', paymentStatus: 'cancelled' });
            await stripe.paymentIntents.cancel(paymentIntent.id);
            await sendNotification(o, 'order_cancelled');
            if (global.emitOrderUpdate) await global.emitOrderUpdate(o._id);
          }
        } catch (e) {
          console.error('Auto-cancel failed:', e);
        }
      }, AUTO_CANCEL_DELAY);
    }

    await order.save({ session });

    // === WALLET DEDUCTION (Atomic via debitWallet) ===
    if (!isGuest && walletUsed > 0) {
      await debitWallet(
        customerId,
        toDecimal(walletUsed),
        order._id,
        session
      );
    }

    // === PAYMENT TRANSACTION RECORD ===
    await PaymentTransaction.create([{
      order: order._id,
      paymentMethod: baseData.paymentMethod,
      amount: toDecimal(toNumber(baseData.finalAmount) + walletUsed),
      status: finalAmount === 0 || payment !== 'cash' ? 'paid' : 'pending',
      transactionId: order.paymentIntentId || order.bankTransferReference || null,
      paidAt: finalAmount === 0 || payment !== 'cash' ? new Date() : null,
      metadata: {
        walletUsed: walletUsed.toString(),
        originalSubtotal: subtotal.toString(),
        discountApplied: discount.toString(),
        deliveryFee: deliveryZone.deliveryFee.toString(),
      },
    }], { session });

    // === KITCHEN ORDER ===
    const customerName = order.guestInfo?.name || (await User.findById(customerId)?.select('name').lean())?.name || 'Guest';
    await KitchenOrder.create([{
      order: order._id,
      shortId: `#${orderIdShort(order._id)}`,
      customerName,
      instructions: order.instructions || '',
      items: order.items.map(i => ({
        menuItem: i.menuItem,
        name: i.name,
        image: i.image,
        quantity: i.quantity,
      })),
    }], { session });

    // === REAL-TIME UPDATES ===
    if (io && global.emitOrderUpdate && global.emitKitchenOrderUpdate && global.emitKitchenStats) {
      io.to('kitchen').emit('newKitchenOrder', {
        shortId: `#${orderIdShort(order._id)}`,
        itemsCount: order.items.reduce((s, i) => s + i.quantity, 0),
        instructions: order.instructions || '',
      });

      await Promise.all([
        global.emitOrderUpdate(order._id),
        global.emitKitchenStats(),
      ]);
    }

    if (finalAmount === 0 || payment !== 'cash') {
      broadcastPaymentEvent(order, 'paymentSuccess', {
        walletUsed,
        paidVia: finalAmount === 0 ? 'wallet' : payment,
      });
    }

    if (session) await session.commitTransaction();

    if (!isGuest) await Cart.deleteOne({ user: customerId });
    await order.populate('area items.menuItem customer rider');
    await sendNotification(order, 'new_order');

    const response = {
      success: true,
      order: {
        ...order.toObject(),
        finalAmount: toNumber(order.finalAmount),
        walletUsed: toNumber(order.walletUsed),
        totalAmount: toNumber(order.totalAmount),
        discountApplied: toNumber(order.discountApplied),
        deliveryFee: toNumber(order.deliveryFee),
      },
      walletUsed,
    };

    if (clientSecret) response.clientSecret = clientSecret;
    if (payment === 'bank') {
      response.bankDetails = { ...BANK_DETAILS, amount: finalAmount, reference: order.bankTransferReference };
    }

    return res.json(response);
  } catch (err) {
    if (session) await session.abortTransaction();
    console.error('createOrder error:', err);
    return res.status(500).json({ success: false, message: 'Order creation failed' });
  } finally {
    if (session) session.endSession();
  }
};





// ====================== CUSTOMER REFUND REQUEST ======================
const requestRefund = async (req, res) => {
  const { reason, amount } = req.body;
  const orderId = req.params.id;

  if (!reason || !amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Reason and valid amount are required',
    });
  }

  try {
    const order = await Order.findOne({
      _id: orderId,
      customer: req.user.id,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only delivered & paid orders are refundable
    if (order.status !== 'delivered' || order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order not eligible for refund',
      });
    }

    // Only card payments support refunds
    if (order.paymentMethod !== 'card') {
      return res.status(400).json({
        success: false,
        message: 'Only card payments can be refunded',
      });
    }

    const transaction = await PaymentTransaction.findOne({ order: order._id });

    // Safety guard
    if (!transaction || transaction.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'No refundable payment found',
      });
    }

    if (transaction.refundStatus && transaction.refundStatus !== 'none') {
      return res.status(400).json({
        success: false,
        message: 'Refund already requested or processed',
      });
    }

    const maxRefund = order.finalAmount;
    if (amount > maxRefund) {
      return res.status(400).json({
        success: false,
        message: `Maximum refundable amount is PKR ${maxRefund}`,
      });
    }

    // === SAVE REFUND REQUEST ===
    transaction.refundStatus = 'requested';
    transaction.refundAmount = amount;
    transaction.refundReason = reason;
    transaction.refundRequestedAt = new Date();
    transaction.refundRequestedBy = req.user.id;
    await transaction.save();

    // === REAL-TIME REFUND REQUEST NOTIFICATIONS ===
    if (io) {
      const shortId = orderIdShort(order._id);

      const payload = {
        event: 'refundRequested',
        orderId: order._id.toString(),
        shortId,
        amount,
        reason,
        timestamp: new Date(),
      };

      // Customer confirmation
      io.to(`user:${req.user.id}`).emit('refundUpdate', {
        ...payload,
        status: 'requested',
        message: 'Your refund request has been submitted',
      });

      // Admin alert
      io.to('admin').emit('newRefundRequest', {
        ...payload,
        customerId: req.user.id,
        customerName: req.user.name,
      });
    }

    if (global.emitOrderUpdate) {
      await global.emitOrderUpdate(order._id);
    }

    return res.json({
      success: true,
      message: 'Refund request submitted successfully. We’ll review it shortly.',
    });

  } catch (err) {
    console.error('requestRefund error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// ====================== CUSTOMER ROUTES ======================
const getCustomerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('items.menuItem', 'name image price')
      .populate('address', 'label fullAddress')
      .populate('area', 'name')
      .populate('rider', 'name phone')
      .sort({ placedAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user.id })
      .populate('items.menuItem address area deliveryZone rider');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await Order.findOne({ _id: orderId, customer: userId }).session(session);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'pending_payment'];
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
    }

    const wasPendingPayment = order.status === 'pending_payment';

    // ================= STRIPE CANCEL =================
    if (wasPendingPayment && order.paymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(order.paymentIntentId);
      } catch (err) {
        console.warn('Stripe cancel failed:', err.message);
      }
    }

    // ================= CLEAR AUTO-CANCEL TIMER =================
    if (global.pendingOrderTimeouts?.[orderId]) {
      clearTimeout(global.pendingOrderTimeouts[orderId]);
      delete global.pendingOrderTimeouts[orderId];
    }

    // ================= WALLET REFUND =================
    if (order.walletUsed > 0 && order.paymentStatus === 'paid') {
      await Wallet.findOneAndUpdate(
        { user: order.customer },
        { $inc: { balance: order.walletUsed } },
        { session }
      );

      await PaymentTransaction.create([{
        order: order._id,
        paymentMethod: 'wallet',
        amount: order.walletUsed,
        status: 'refunded',
        metadata: { reason: 'Order cancelled by customer' },
      }], { session });
    }

    // ================= UPDATE ORDER =================
    order.status = 'cancelled';
    if (order.paymentStatus === 'paid') {
      order.paymentStatus = order.walletUsed > 0 ? 'refunded' : 'refund_pending';
    } else {
      order.paymentStatus = 'cancelled';
    }

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    // ================= NOTIFICATIONS =================
    await sendNotification(order, 'order_cancelled');

    // ================= REAL-TIME UPDATES =================
    if (global.emitOrderUpdate) await global.emitOrderUpdate(order._id);
    if (global.emitKitchenStats) await global.emitKitchenStats();

    return res.json({ success: true, message: 'Order cancelled successfully', order });

  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error('cancelOrder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
};


// ====================== UPDATE ORDER STATUS ======================
const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const userRole = req.user.role;

  const ALLOWED_STATUSES = [
    'confirmed',
    'preparing',
    'out_for_delivery',
    'delivered',
    'rejected'
  ];

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order status'
    });
  }

  let session;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    // ================= FIND ORDER =================
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // ================= ROLE PERMISSIONS =================
    if (userRole !== 'admin') {

      // 🍳 Kitchen
      if (userRole === 'kitchen') {
        if (!['confirmed', 'preparing'].includes(status)) {
          await session.abortTransaction();
          return res.status(403).json({
            success: false,
            message: 'Kitchen cannot set this status'
          });
        }
      }

      // 🛵 Rider
      if (userRole === 'rider') {
        if (!['out_for_delivery', 'delivered'].includes(status)) {
          await session.abortTransaction();
          return res.status(403).json({
            success: false,
            message: 'Rider cannot set this status'
          });
        }

        if (!order.rider || order.rider.toString() !== req.user.id) {
          await session.abortTransaction();
          return res.status(403).json({
            success: false,
            message: 'You are not assigned to this order'
          });
        }
      }

      // 🚚 Delivery Manager
      if (userRole === 'delivery_manager' && status !== 'out_for_delivery') {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: 'Delivery manager can only dispatch orders'
        });
      }
    }

    // ================= INVALID FLOW GUARD =================
    const INVALID_TRANSITIONS = {
      delivered: ['confirmed', 'preparing', 'out_for_delivery'],
      rejected: ['delivered'],
      cancelled: ['delivered']
    };

    if (
      INVALID_TRANSITIONS[order.status] &&
      INVALID_TRANSITIONS[order.status].includes(status)
    ) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot move from ${order.status} to ${status}`
      });
    }

    // ================= UPDATE ORDER =================
    const now = new Date();
    order.status = status;

    if (status === 'confirmed') order.confirmedAt = now;
    if (status === 'preparing') order.preparingAt = now;
    if (status === 'out_for_delivery') order.outForDeliveryAt = now;

    if (status === 'delivered') {
      order.deliveredAt = now;
      order.paymentStatus = order.paymentStatus || 'paid';
    }

    if (status === 'rejected') {
      order.rejectedBy = req.user.id;
      order.rejectionReason = 'Operational decision';
    }

    await order.save({ session });

    // ================= SYNC KITCHEN ORDER =================
    const kitchenOrder = await KitchenOrder
      .findOne({ order: order._id })
      .session(session);

    if (kitchenOrder) {

      if (status === 'confirmed') {
        kitchenOrder.status = 'new';
      }

      if (status === 'preparing') {
        kitchenOrder.status = 'preparing';
        kitchenOrder.startedAt = now;

        kitchenOrder.items.forEach(item => {
          if (item.status === 'pending') {
            item.status = 'preparing';
            item.startedAt = now;
          }
        });
      }

      if (status === 'out_for_delivery') {
        kitchenOrder.status = 'ready';
        kitchenOrder.readyAt = now;

        kitchenOrder.items.forEach(item => {
          if (item.status !== 'ready') {
            item.status = 'ready';
            item.readyAt = now;
          }
        });
      }

      if (status === 'delivered') {
        kitchenOrder.status = 'completed';
        kitchenOrder.completedAt = now;
      }

      await kitchenOrder.save({ session });
    }

    // ================= COMMIT =================
    await session.commitTransaction();
    session.endSession();

    // ================= REAL-TIME + NOTIFICATIONS =================
    await sendNotification(order, 'status_updated');

    if (global.emitOrderUpdate) {
      await global.emitOrderUpdate(order._id);
    }

    if (global.emitKitchenOrderUpdate && kitchenOrder) {
      await global.emitKitchenOrderUpdate(kitchenOrder);
    }

    if (global.emitKitchenStats) {
      await global.emitKitchenStats();
    }

    return res.json({
      success: true,
      message: 'Order status updated successfully',
      order,
      kitchenOrder
    });

  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    console.error('updateOrderStatus error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};


const assignRider = async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Invalid request body. JSON body with riderId is required.'
    });
  }

  const { riderId } = req.body;

  if (!riderId) {
    return res.status(400).json({
      success: false,
      message: 'riderId is required'
    });
  }

  if (!mongoose.Types.ObjectId.isValid(riderId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid riderId format'
    });
  }

  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { rider: riderId, status: 'confirmed', confirmedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('rider');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await sendNotification(order, 'rider_assigned');

    if (io) {
      io.to(`rider:${riderId}`).emit('newAssignment', {
        orderId: order._id.toString(),
        shortId: orderIdShort(order._id),
        customerName: order.guestInfo?.name || order.customer?.name,
        address: order.addressDetails.fullAddress,
        phone: order.guestInfo?.phone || order.customer?.phone,
        instructions: order.instructions,
        totalAmount: order.finalAmount
      });
    }

    if (global.emitOrderUpdate && global.emitKitchenStats) {
      await global.emitOrderUpdate(order._id);
      await global.emitKitchenStats();
    }

    return res.json({ success: true, message: 'Rider assigned successfully', order });
  } catch (err) {
    console.error('Assign Rider Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign rider',
      error: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .populate('rider', 'name phone')
      .populate('area', 'name')
      .sort({ placedAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit);
    const total = await Order.countDocuments(query);

    res.json({ success: true, orders, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const generateReceipt = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone')
      .populate('address', 'fullAddress')
      .populate('items.menuItem', 'name');

    if (!order || (order.customer && order.customer._id.toString() !== req.user.id && req.user.role !== 'admin')) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Receipt-${order._id}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text('FoodExpress Pakistan', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${order._id}`);
    doc.text(`Short ID: #${orderIdShort(order._id)}`);
    doc.text(`Date: ${new Date(order.placedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`);
    doc.text(`Customer: ${order.guestInfo?.name || order.customer?.name || 'Guest'}`);
    doc.text(`Phone: ${order.guestInfo?.phone || order.customer?.phone || 'N/A'}`);

    if (order.instructions) {
      doc.moveDown();
      doc.fontSize(13).text('Special Instructions:', { underline: true });
      doc.fontSize(11).text(order.instructions, { indent: 20 });
    }

    doc.moveDown();
    doc.text('Items:', { underline: true });
    order.items.forEach(i => {
      doc.text(`${i.quantity}x ${i.menuItem?.name || 'Item'} - PKR ${i.priceAtOrder * i.quantity}`);
    });
    doc.moveDown();
    doc.text(`Subtotal: PKR ${order.totalAmount}`);
    doc.text(`Delivery Fee: PKR ${order.deliveryFee}`);
    if (order.discountApplied > 0) doc.text(`Discount: -PKR ${order.discountApplied}`);
    if (order.walletUsed > 0) doc.text(`Wallet Used: -PKR ${order.walletUsed}`);
    doc.fontSize(16).text(`Total Paid: PKR ${order.finalAmount}`, { bold: true });
    doc.moveDown(2);
    doc.fontSize(10).text('Thank you for your order!', { align: 'center' });
    doc.end();
  } catch (err) {
    console.error('Receipt error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate receipt' });
  }
};

// ====================== REJECTION HANDLERS ======================
const adminRejectOrder = async (req, res) => {
  const { reason, note } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Cannot reject delivered order' });
    }

    order.status = 'rejected';
    order.rejectedBy = req.user.id;
    order.rejectionReason = reason || 'Not feasible';
    order.rejectionNote = note || '';
    await order.save();

    await sendNotification(order, 'order_rejected');

    if (global.emitOrderUpdate && global.emitKitchenStats) {
      await global.emitOrderUpdate(order._id);
      await global.emitKitchenStats();
    }

    res.json({ success: true, message: 'Order rejected', order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const customerRejectOrder = async (req, res) => {
  const { reason, note } = req.body;
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot reject at this stage' });
    }

    order.status = 'rejected';
    order.rejectedBy = req.user.id;
    order.rejectionReason = reason || 'Changed mind';
    order.rejectionNote = note || '';
    await order.save();

    await sendNotification(order, 'order_rejected');

    if (global.emitOrderUpdate && global.emitKitchenStats) {
      await global.emitOrderUpdate(order._id);
      await global.emitKitchenStats();
    }

    res.json({ success: true, message: 'Order rejected', order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====================== PUBLIC TRACKING ======================
// src/controllers/order/orderController.js
// ====================== PUBLIC TRACKING ======================
// ====================== PUBLIC TRACKING (NO RESTRICTIONS) ======================
const trackOrderById = async (req, res) => {
  const { orderId } = req.params;

  // ================= VALIDATE ID =================
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID',
    });
  }

  try {
    // ================= FETCH ORDER =================
    const order = await Order.findById(orderId)
      .select(
        '_id status placedAt finalAmount estimatedDelivery paymentMethod paymentStatus ' +
        'guestInfo addressDetails items totalAmount deliveryFee discountApplied walletUsed ' +
        'rider instructions'
      )
      .populate('items.menuItem', 'name image')
      .populate('rider', 'name phone')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const shortId = orderIdShort(order._id);

    // ================= SAFE PUBLIC RESPONSE =================
    const safeOrder = {
      _id: order._id,
      shortId,
      status: order.status,
      placedAt: order.placedAt,
      estimatedDelivery: order.estimatedDelivery,

      payment: {
        method: order.paymentMethod,
        status: order.paymentStatus,
        amount: toNumber(order.finalAmount),
      },

      items: order.items.map(item => ({
        name: item.menuItem?.name || item.name,
        image: item.menuItem?.image || item.image || null,
        quantity: item.quantity,
        priceAtOrder: item.priceAtOrder,
      })),

      address: {
        fullAddress: order.addressDetails?.fullAddress || '',
        label: order.addressDetails?.label || '',
        floor: order.addressDetails?.floor || '',
      },

      instructions: order.instructions || null,

      rider: order.rider
        ? {
            name: order.rider.name,
            phone: order.rider.phone,
          }
        : null,

      trackUrl: `${process.env.APP_URL || 'https://foodapp.pk'}/track/${order._id}`,
    };

    // ================= RESPONSE =================
    return res.json({
      success: true,
      order: safeOrder,
    });

  } catch (err) {
    console.error('trackOrderById error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};



const trackOrdersByPhone = async (req, res) => {
  const { phone } = req.body;

  if (!phone || phone.length < 10) {
    return res.status(400).json({ success: false, message: 'Valid phone required' });
  }

  try {
    const orders = await Order.find({
      'guestInfo.phone': phone.trim(),
      'guestInfo.isGuest': true
    })
      .select('_id status placedAt finalAmount estimatedDelivery paymentMethod paymentStatus')
      .sort({ placedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      orders: orders.map(o => ({
        ...o.toObject(),
        shortId: orderIdShort(o._id),
        trackUrl: `${process.env.APP_URL || 'https://foodapp.pk'}/track/${o._id}`
      }))
    });
  } catch (err) {
    console.error('trackOrdersByPhone error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



const paymentSuccess = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID missing',
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const paymentIntentId =
      req.body?.paymentIntentId ||
      req.query?.payment_intent ||
      null;

    // === IDEMPOTENCY GUARD ===
    if (order.paymentStatus === 'paid') {
      return res.json({
        success: true,
        message: 'Payment already confirmed',
        order,
      });
    }

    // If Stripe hasn't confirmed yet
    if (!paymentIntentId) {
      return res.json({
        success: true,
        message: 'Awaiting Stripe confirmation',
        order,
      });
    }

    // Attach paymentIntent if missing
    if (!order.paymentIntentId) {
      order.paymentIntentId = paymentIntentId;
    }

    // === UPDATE ORDER ===
    order.paymentStatus = 'paid';
    order.paidAt = new Date();

    if (order.status === 'pending_payment') {
      order.status = 'pending';
    }

    await order.save();

    // === CLEAR AUTO-CANCEL TIMER (CRITICAL) ===
    if (global.pendingOrderTimeouts?.[orderId]) {
      clearTimeout(global.pendingOrderTimeouts[orderId]);
      delete global.pendingOrderTimeouts[orderId];
    }

    // === UPDATE PAYMENT TRANSACTION (SAFE) ===
    const transaction = await PaymentTransaction.findOne({ order: order._id });
    if (transaction && transaction.status !== 'paid') {
      transaction.status = 'paid';
      transaction.transactionId = paymentIntentId;
      transaction.paidAt = new Date();
      await transaction.save();
    }

    // === REAL-TIME PAYMENT SUCCESS ===
    broadcastPaymentEvent(order, 'paymentSuccess', {
      paidVia: 'card',
    });

    // === USER NOTIFICATION ===
    await sendNotification(order, 'payment_success');

    // === REAL-TIME ORDER UPDATE ===
    if (global.emitOrderUpdate) {
      await global.emitOrderUpdate(order._id);
    }

    return res.json({
      success: true,
      message: 'Payment confirmed successfully',
      order,
    });

  } catch (err) {
    console.error('paymentSuccess error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


module.exports = {
  createOrder,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  assignRider,
  getAllOrders,
  generateReceipt,
  adminRejectOrder,
  customerRejectOrder,
  trackOrderById,
  trackOrdersByPhone,
  paymentSuccess,
  requestRefund,
  sendNotification
};