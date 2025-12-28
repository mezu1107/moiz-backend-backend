// src/controllers/order/orderController.js
// PRODUCTION-READY — DECEMBER 27, 2025
// Fixed: reorderOrder crash on missing menu items
// Fixed: Cart automatically cleared after successful order

const mongoose = require('mongoose');
const Order = require('../../models/order/Order');
const PaymentTransaction = require('../../models/payment/PaymentTransaction');
const KitchenOrder = require('../../models/kitchen/KitchenOrder');
const Cart = require('../../models/cart/Cart');
const Wallet = require('../../models/wallet/Wallet');
const Address = require('../../models/address/Address');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');
const MenuItem = require('../../models/menuItem/MenuItem');
const Area = require('../../models/area/Area');
const User = require('../../models/user/User');
const stripe = require('../../config/stripe');
const admin = require('firebase-admin');
const PDFDocument = require('pdfkit');
const io = global.io;

const { debitWallet, creditWallet, toNumber, toDecimal } = require('../wallet/walletController');
const { applyAndTrackDeal } = require('../deal/dealController');

global.pendingOrderTimeouts = global.pendingOrderTimeouts || {};
const AUTO_CANCEL_DELAY = 15 * 60 * 1000; // 15 minutes

const BANK_DETAILS = {
  bankName: process.env.BANK_NAME || 'Bank AL Habib',
  accountTitle: process.env.ACCOUNT_TITLE || 'FoodExpress Pvt Ltd',
  accountNumber: process.env.ACCOUNT_NUMBER || '0000-00000000-00',
  iban: process.env.IBAN || 'PK00BANK0000000000000000',
  branch: process.env.BRANCH || 'Main Branch, Rawalpindi',
};

// ── Helpers ──────────────────────────────────────────────────────────────
const orderIdShort = (id) => id?.toString().slice(-6).toUpperCase() || 'TEMP';

const sendNotification = async (order, type, extraData = {}) => {
  try {
    const userId = order.customer?._id || order.customer;
    if (!userId) return;

    const user = await User.findById(userId).select('fcmToken').lean();
    if (!user?.fcmToken) return;

    const shortId = orderIdShort(order._id);

    const templates = {
      new_order: { title: 'Order Placed!', body: `Your order #${shortId} has been received!` },
      status_updated: { title: 'Order Update', body: `Your order #${shortId} is now ${order.status.replace(/_/g, ' ')}.` },
      rider_assigned: { title: 'Rider Assigned', body: `Rider is on the way with #${shortId}` },
      order_cancelled: { title: 'Order Cancelled', body: `Order #${shortId} cancelled.` },
      order_rejected: { title: 'Order Rejected', body: `Sorry, order #${shortId} was rejected.` },
      payment_success: { title: 'Payment Confirmed', body: `Payment for #${shortId} successful!` },
      refund_requested: { title: 'Refund Requested', body: `Refund request for #${shortId} submitted.` },
      refund_processed: { title: 'Refund Processed', body: `Refund for #${shortId} has been processed.` },
    };

    const msg = templates[type];
    if (!msg) return;

    await admin.messaging().send({
      token: user.fcmToken,
      notification: msg,
      data: {
        type: 'order_update',
        orderId: order._id.toString(),
        status: order.status,
        shortId,
        ...extraData,
      },
    });
  } catch (err) {
    console.error('FCM notification error:', err.message);
  }
};

const broadcastOrderEvent = (order, event, extra = {}) => {
  if (!io) return;

  const payload = {
    event,
    orderId: order._id.toString(),
    shortId: orderIdShort(order._id),
    status: order.status,
    timestamp: new Date(),
    ...extra,
  };

  if (order.customer) io.to(`user:${order.customer}`).emit('orderUpdate', payload);
  io.to('admin').emit('orderUpdate', payload);
  io.to('kitchen').emit('orderUpdate', payload);
};

// ── CREATE ORDER ─────────────────────────────────────────────────────────
const createOrder = async (req, res) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (e) {
    console.warn('MongoDB transactions unavailable — proceeding without');
  }

  try {
    const {
      items = [],
      addressId,
      guestAddress = {},
      name = '',
      phone = '',
      paymentMethod: rawMethod = 'cash',
      promoCode,
      useWallet = false,
      instructions = '',
    } = req.body;

    const isGuest = !req.user;
    const customerId = req.user?._id || null;

    // Validation
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item required' });
    }

    const paymentMethod = rawMethod.toLowerCase();
    const validMethods = ['cash', 'card', 'easypaisa', 'jazzcash', 'bank', 'wallet'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    // Address validation
    let areaId, addressDetails;
    if (isGuest) {
      if (!guestAddress.fullAddress?.trim() || !guestAddress.areaId || !name.trim() || !phone.trim()) {
        return res.status(400).json({ success: false, message: 'Incomplete guest details' });
      }
      const area = await Area.findById(guestAddress.areaId).lean();
      if (!area) return res.status(400).json({ success: false, message: 'Area not found' });
      areaId = area._id;
      addressDetails = {
        fullAddress: guestAddress.fullAddress.trim(),
        label: guestAddress.label || 'Home',
        floor: guestAddress.floor || '',
        instructions: guestAddress.instructions || '',
      };
    } else {
      if (!addressId) return res.status(400).json({ success: false, message: 'Address ID required' });
      const addr = await Address.findOne({ _id: addressId, user: customerId })
        .populate('area')
        .lean();
      if (!addr?.area) return res.status(404).json({ success: false, message: 'Address not found' });
      areaId = addr.area._id;
      addressDetails = {
        fullAddress: addr.fullAddress,
        label: addr.label,
        floor: addr.floor || '',
        instructions: addr.instructions || '',
      };
    }

    const zone = await DeliveryZone.findOne({ area: areaId, isActive: true }).lean();
    if (!zone) return res.status(400).json({ success: false, message: 'Delivery not available in this area' });

    // Process items — using priceAtAdd from cart (includes extras)
    const orderItems = [];
    let subtotal = 0;

    for (const cartItem of items) {
      const qty = Math.max(1, Number(cartItem.quantity) || 1);
      const priceAtOrder = Number(cartItem.priceAtAdd || 0);

      if (priceAtOrder <= 0 || qty < 1) continue;

      const menu = await MenuItem.findById(cartItem.menuItem)
        .select('name image isAvailable')
        .lean();

      if (!menu || !menu.isAvailable) continue;

      const itemTotal = priceAtOrder * qty;

      orderItems.push({
        menuItem: menu._id,
        name: menu.name,
        image: menu.image,
        priceAtOrder,
        quantity: qty,
        sides: cartItem.sides || [],
        drinks: cartItem.drinks || [],
        addOns: cartItem.addOns || [],
        specialInstructions: cartItem.specialInstructions || '',
      });

      subtotal += itemTotal;
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid items in cart' });
    }

    if (subtotal < zone.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount: PKR ${zone.minOrderAmount}`,
      });
    }

    // Promo
    let discount = 0;
    let appliedDeal = null;
    if (promoCode?.trim()) {
      const dealResult = await applyAndTrackDeal(promoCode.trim().toUpperCase(), subtotal, customerId);
      if (dealResult?.discount > 0) {
        discount = dealResult.discount;
        appliedDeal = { ...dealResult, appliedDiscount: discount };
      }
    }

    let finalAmount = Math.max(0, subtotal + zone.deliveryFee - discount);
    let walletUsed = 0;

    // Wallet usage
    if (!isGuest && (paymentMethod === 'wallet' || useWallet)) {
      const wallet = await Wallet.findOne({ user: customerId }).session(session).lean();
      if (wallet && toNumber(wallet.balance) > 0) {
        walletUsed = Math.min(toNumber(wallet.balance), finalAmount);
        finalAmount -= walletUsed;
      }
    }

    const orderData = {
      items: orderItems,
      totalAmount: subtotal,
      deliveryFee: zone.deliveryFee,
      discountApplied: discount,
      finalAmount,
      walletUsed,
      area: areaId,
      deliveryZone: zone._id,
      estimatedDelivery: zone.estimatedTime || '40-55 min',
      appliedDeal,
      paymentMethod: finalAmount === 0 ? 'wallet' : paymentMethod,
      addressDetails,
      instructions: instructions.trim().slice(0, 300),
      ...(isGuest
        ? { guestInfo: { name: name.trim(), phone: phone.trim(), isGuest: true } }
        : { customer: customerId, address: addressId }),
    };

    let order;
    let clientSecret = null;

    if (finalAmount === 0) {
      order = new Order({
        ...orderData,
        status: 'pending',
        paymentStatus: 'paid',
        paidAt: new Date(),
      });
    } else if (['cash', 'easypaisa', 'jazzcash'].includes(paymentMethod)) {
      order = new Order({
        ...orderData,
        status: 'pending',
        paymentStatus: paymentMethod === 'cash' ? 'pending' : 'paid',
        paidAt: paymentMethod !== 'cash' ? new Date() : null,
      });
    } else if (paymentMethod === 'bank') {
      order = new Order({
        ...orderData,
        status: 'pending_payment',
        paymentStatus: 'pending',
      });
    } else if (paymentMethod === 'card') {
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(finalAmount * 100),
        currency: 'pkr',
        metadata: { customerId: customerId?.toString() || 'guest' },
        automatic_payment_methods: { enabled: true },
      });

      order = new Order({
        ...orderData,
        paymentIntentId: intent.id,
        status: 'pending_payment',
        paymentStatus: 'pending',
      });

      clientSecret = intent.client_secret;

      global.pendingOrderTimeouts[order._id.toString()] = setTimeout(async () => {
        try {
          const o = await Order.findById(order._id);
          if (o?.status === 'pending_payment') {
            await Order.findByIdAndUpdate(o._id, { status: 'cancelled', paymentStatus: 'cancelled' });
            await stripe.paymentIntents.cancel(intent.id);
            await sendNotification(o, 'order_cancelled');
          }
        } catch (e) {
          console.error('Auto-cancel failed:', e);
        }
      }, AUTO_CANCEL_DELAY);
    }

    await order.save({ session });

    if (paymentMethod === 'bank') {
      order.bankTransferReference = `BANK-${orderIdShort(order._id)}-${Date.now().toString().slice(-4)}`;
      await order.save({ session });
    }

    if (!isGuest && walletUsed > 0) {
      await debitWallet(customerId, toDecimal(walletUsed), order._id, session);
    }

    await PaymentTransaction.create([{
      order: order._id,
      paymentMethod: order.paymentMethod,
      amount: toDecimal(finalAmount + walletUsed),
      status: finalAmount === 0 || paymentMethod !== 'cash' ? 'paid' : 'pending',
      transactionId: order.paymentIntentId || order.bankTransferReference || null,
      paidAt: finalAmount === 0 || paymentMethod !== 'cash' ? new Date() : null,
    }], { session });

    const customerName = order.guestInfo?.name ||
      (await User.findById(customerId)?.select('name').lean())?.name ||
      'Guest';

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

    if (session) await session.commitTransaction();

    // Clear cart after successful order (logged-in users only)
    if (!isGuest) {
      await Cart.deleteOne({ user: customerId });
    }

    await order.populate('area items.menuItem customer rider');

    await sendNotification(order, 'new_order');
    broadcastOrderEvent(order, finalAmount === 0 ? 'paymentSuccess' : 'orderCreated');

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
    };

    if (clientSecret) response.clientSecret = clientSecret;
    if (paymentMethod === 'bank') {
      response.bankDetails = {
        ...BANK_DETAILS,
        amount: toNumber(order.finalAmount),
        reference: order.bankTransferReference,
      };
    }

    res.status(201).json(response);
  } catch (err) {
    if (session) await session.abortTransaction();
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create order' });
  } finally {
    if (session) session.endSession();
  }
};


const reorderOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const query = { _id: orderId };
    if (req.user) {
      query.$or = [
        { customer: req.user._id },
        { 'guestInfo.phone': req.user.phone, 'guestInfo.isGuest': true }
      ];
    } else {
      query['guestInfo.isGuest'] = true;
    }

    const original = await Order.findOne(query)
      .populate('items.menuItem', 'name price image isAvailable')
      .lean();

    if (!original) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission to reorder it',
      });
    }

    const validItems = [];
    let skippedCount = 0;

    for (const item of original.items) {
      const menuItem = item.menuItem;

      if (!menuItem || !menuItem.isAvailable) {
        skippedCount++;
        continue;
      }

      validItems.push({
        _id: crypto.randomUUID(), // Important: generate client-side ID
        menuItem: {
          _id: menuItem._id.toString(),
          name: menuItem.name,
          price: menuItem.price,
          image: menuItem.image || null,
          isAvailable: true,
        },
        quantity: item.quantity,
        priceAtAdd: item.priceAtOrder,
        sides: item.sides || [],
        drinks: item.drinks || [],
        addOns: item.addOns || [],
        specialInstructions: item.specialInstructions || '',
        addedAt: new Date().toISOString(),
      });
    }

    if (validItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items from this order are currently available',
      });
    }

    if (req.user) {
      // Authenticated: save to MongoDB
      let cart = await Cart.findOne({ user: req.user._id });
      if (!cart) cart = new Cart({ user: req.user._id, items: [] });

      cart.items = validItems.map(item => ({
        menuItem: item.menuItem._id,
        quantity: item.quantity,
        priceAtAdd: item.priceAtAdd,
        sides: item.sides,
        drinks: item.drinks,
        addOns: item.addOns,
        specialInstructions: item.specialInstructions,
      }));
      await cart.save();

      await cart.populate('items.menuItem', 'name price image isAvailable');

      return res.json({
        success: true,
        message: `Added ${validItems.length} item(s) to your cart`,
        cart: {
          items: cart.items,
          total: calculateTotal(cart.items),
          orderNote: cart.orderNote || '',
        },
        isGuest: false,
        skippedItems: skippedCount || undefined,
      });
    }

    // Guest: return fully populated items for Zustand
    return res.json({
      success: true,
      message: `Added ${validItems.length} item(s) to your cart`,
      cart: {
        items: validItems,
        isGuest: true,
      },
      skippedItems: skippedCount || undefined,
    });
  } catch (err) {
    console.error('reorderOrder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reorder' });
  }
};


// ====================== CUSTOMER REFUND REQUEST ======================
const requestRefund = async (req, res) => {
  const { reason, amount: refundAmountRaw } = req.body;
  const orderId = req.params.id;

  try {
    if (!reason?.trim()) {
      return res.status(400).json({ success: false, message: 'Refund reason is required' });
    }

    const refundAmount = Number(refundAmountRaw);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid refund amount required' });
    }

    const order = await Order.findOne({ _id: orderId, customer: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Only delivered orders can be refunded' });
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ success: false, message: 'Order payment not completed' });
    }

    if (order.paymentMethod !== 'card') {
      return res.status(400).json({ success: false, message: 'Only card payments are eligible for refund' });
    }

    const transaction = await PaymentTransaction.findOne({ order: order._id });
    if (!transaction || transaction.status !== 'paid' || transaction.refundStatus !== 'none') {
      return res.status(400).json({ success: false, message: 'No refundable transaction found' });
    }

    const maxRefundable = toNumber(order.finalAmount);
    if (refundAmount > maxRefundable) {
      return res.status(400).json({
        success: false,
        message: `Maximum refundable amount is PKR ${maxRefundable}`,
      });
    }

    // Update transaction
    transaction.refundStatus = 'requested';
    transaction.refundAmount = toDecimal(refundAmount);
    transaction.refundReason = reason.trim();
    transaction.refundRequestedAt = new Date();
    transaction.refundRequestedBy = req.user._id;
    await transaction.save();

    await sendNotification(order, 'refund_requested', { amount: refundAmount });
    broadcastOrderEvent(order, 'refundRequested', { amount: refundAmount });

    res.json({
      success: true,
      message: 'Refund request submitted successfully. We will review it shortly.',
    });
  } catch (err) {
    console.error('requestRefund error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit refund request' });
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
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(orderId)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await Order.findOne({ _id: orderId, customer: userId }).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Order not found or not yours' });
    }

    const allowedStatuses = ['pending', 'pending_payment', 'confirmed'];
    if (!allowedStatuses.includes(order.status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order in ${order.status} status`,
      });
    }

    // Cancel Stripe payment intent if pending
    if (order.status === 'pending_payment' && order.paymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(order.paymentIntentId, {
          cancellation_reason: 'requested_by_customer',
        });
      } catch (err) {
        if (err.code === 'payment_intent_unable_to_cancel') {
          console.warn('Stripe payment already canceled, skipping.');
        } else {
          console.warn('Stripe cancel failed:', err.message);
        }
      }
    }

    // Clear auto-cancel timer
    if (global.pendingOrderTimeouts?.[orderId]) {
      clearTimeout(global.pendingOrderTimeouts[orderId]);
      delete global.pendingOrderTimeouts[orderId];
    }

    // Refund wallet if used
    if (toNumber(order.walletUsed) > 0) {
      await creditWallet(
        userId,
        toDecimal(toNumber(order.walletUsed)),
        'refund',
        `Refund for cancelled order #${orderIdShort(order._id)}`,
        order._id,
        { cancelledBy: 'customer' }
      );
    }

    // Update order
    order.status = 'cancelled'; // order status enum is fine
    order.cancelledAt = new Date();
    order.cancelledBy = userId;

    // Set paymentStatus correctly according to schema
    if (order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
      order.refundedAt = new Date();
    } else if (order.paymentStatus === 'pending') {
      order.paymentStatus = 'canceled'; // use single 'l', matches schema
    }

    await order.save({ session });
    await session.commitTransaction();

    // Notifications
    await sendNotification(order, 'order_cancelled');
    broadcastOrderEvent(order, 'orderCancelled');

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order: { ...order.toObject(), finalAmount: toNumber(order.finalAmount) },
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('cancelOrder error:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  } finally {
    session.endSession();
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

    let query = {};

    // Handle comma-separated status values (e.g. "pending,confirmed,preparing")
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length > 0) {
        query.status = { $in: statuses };
      }
    }

    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .populate('rider', 'name phone')
      .populate('area', 'name')
      .sort({ placedAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: { page: +page, limit: +limit, total }
    });
  } catch (err) {
    console.error('getAllOrders error:', err);
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


// ====================== PUBLIC TRACKING (NO RESTRICTIONS) ======================
// ====================== PUBLIC TRACKING (NO RESTRICTIONS) ======================
const trackOrderById = async (req, res) => {
  const { orderId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID',
    });
  }

  try {
    const order = await Order.findById(orderId)
      .select(
        '_id status placedAt finalAmount estimatedDelivery paymentMethod paymentStatus ' +
        'guestInfo addressDetails items totalAmount deliveryFee discountApplied walletUsed ' +
        'rider instructions shortId' // ← Add shortId if you store it
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

      totals: {
        totalAmount: toNumber(order.totalAmount),
        deliveryFee: toNumber(order.deliveryFee),
        discountApplied: toNumber(order.discountApplied),
        walletUsed: toNumber(order.walletUsed),
        finalAmount: toNumber(order.finalAmount),
      },

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

const getOrderTimeline = async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await Order.findOne({
      _id: orderId,
      $or: [
        { customer: req.user._id },
        { 'guestInfo.phone': req.user.phone },
      ],
    }).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or not accessible' });
    }

    const timeline = [];

    if (order.placedAt) {
      timeline.push({
        event: 'Order Placed',
        timestamp: order.placedAt,
        status: 'pending',
      });
    }

    if (order.confirmedAt) {
      timeline.push({
        event: 'Order Confirmed',
        timestamp: order.confirmedAt,
        status: 'confirmed',
      });
    }

    if (order.preparingAt) {
      timeline.push({
        event: 'Order Preparing',
        timestamp: order.preparingAt,
        status: 'preparing',
      });
    }

    if (order.outForDeliveryAt) {
      timeline.push({
        event: 'Out for Delivery',
        timestamp: order.outForDeliveryAt,
        status: 'out_for_delivery',
      });
    }

    if (order.deliveredAt) {
      timeline.push({
        event: 'Order Delivered',
        timestamp: order.deliveredAt,
        status: 'delivered',
      });
    }

    if (order.cancelledAt) {
      timeline.push({
        event: 'Order Cancelled',
        timestamp: order.cancelledAt,
        status: 'cancelled',
        cancelledBy: order.cancelledBy ? 'Customer' : 'System/Admin',
      });
    }

    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({
      success: true,
      timeline,
      currentStatus: order.status,
      orderId: order._id.toString(),
      shortId: orderIdShort(order._id),
    });
  } catch (err) {
    console.error('getOrderTimeline error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch order timeline' });
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
  reorderOrder,
  getOrderTimeline,        
  sendNotification,
};

