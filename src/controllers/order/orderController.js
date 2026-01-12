// src/controllers/order/orderController.js
// PRODUCTION-READY — DECEMBER 27, 2025 → UPDATED JANUARY 12, 2026
// Enhanced: Strong kitchen new order alerts via emitNewOrderAlert
// Added support for urgent order detection based on instructions

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

// Import EmailRotator singleton
const emailRotator = require('../../utils/emailRotator');

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

// Reusable guest email sender (safe, non-blocking)
const sendGuestEmail = async (order, subject, htmlContent) => {
  if (!order.guestInfo?.email || order.customer) return; // only guests

  const mailOptions = {
    to: order.guestInfo.email,
    subject,
    html: htmlContent,
  };

  try {
    await emailRotator.sendMail(mailOptions);
    console.log(`Guest email sent: ${subject} → ${order.guestInfo.email}`);
  } catch (err) {
    console.error(`Guest email failed (${subject}):`, err.message);
  }
};

// Send email notification to admin(s) on new order
const sendAdminNewOrderEmail = async (order) => {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.warn('ADMIN_EMAIL not set in .env — skipping admin notification email');
    return;
  }

  try {
    const shortId = orderIdShort(order._id);
    const customerName = order.guestInfo?.name || order.customer?.name || 'Guest';
    const total = order.finalAmount.toLocaleString('en-PK');
    const payment = order.paymentMethod.toUpperCase();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #e94e77;">New Order Alert! #${shortId}</h2>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Total:</strong> Rs. ${total}</p>
        <p><strong>Payment Method:</strong> ${payment}</p>
        <p><strong>Status:</strong> ${order.status.replace('_', ' ').toUpperCase()}</p>
        <p><strong>Placed:</strong> ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}</p>
        
        <p style="margin: 20px 0;">
          <a href="${process.env.ADMIN_URL || 'https://admin.altawakkalfoods.com'}/orders/${order._id}" 
             style="background: #e94e77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Order Details
          </a>
        </p>
        
        <p style="color: #666; font-size: 14px;">
          This is an automated notification — do not reply directly.
        </p>
      </div>
    `;

    await emailRotator.sendMail({
      to: adminEmail,
      subject: `New Order #${shortId} - Rs. ${total} - ${customerName}`,
      html,
    });

    console.log(`Admin email sent for new order #${shortId}`);
  } catch (err) {
    console.error('Failed to send admin new order email:', err.message);
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
      email = '',
      paymentMethod: rawMethod = 'cash',
      promoCode,
      useWallet = false,
      instructions = '',
    } = req.body;

    const isGuest = !req.user;
    const customerId = req.user?._id || null;

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

    // Process items
    const orderItems = [];
    let subtotal = 0;

    for (const cartItem of items) {
      const qty = Math.max(1, Number(cartItem.quantity) || 1);
      const priceAtOrder = Number(cartItem.priceAtAdd || 0);

      if (priceAtOrder <= 0 || qty < 1) continue;

      const menu = await MenuItem.findById(cartItem.menuItem)
        .select('name image unit isAvailable pricedOptions')
        .lean();

      if (!menu || !menu.isAvailable) continue;

      const itemTotal = priceAtOrder * qty;

      const enrichOptions = (names, type) => {
        return (names || []).map(name => {
          const opt = menu.pricedOptions?.[type]?.find(o => o.name === name);
          return {
            name,
            price: opt?.price || 0,
            unit: opt?.unit || menu.unit
          };
        });
      };

      orderItems.push({
        menuItem: menu._id,
        name: menu.name,
        image: menu.image,
        unit: menu.unit,
        priceAtOrder,
        quantity: qty,
        sides: enrichOptions(cartItem.sides, 'sides'),
        drinks: enrichOptions(cartItem.drinks, 'drinks'),
        addOns: enrichOptions(cartItem.addOns, 'addOns'),
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
        ? {
            guestInfo: {
              name: name.trim(),
              phone: phone.trim(),
              email: email?.trim() || null,
              isGuest: true
            }
          }
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
      await debitWallet({
        userId: customerId,
        amount: toDecimal(walletUsed),
        orderId: order._id,
        description: `Payment for order #${orderIdShort(order._id)}`,
        session,
      });
    }

    await PaymentTransaction.create([{
      order: order._id,
      paymentMethod: order.paymentMethod,
      amount: toDecimal(finalAmount + walletUsed),
      status: finalAmount === 0 || paymentMethod !== 'cash' ? 'succeeded' : 'pending',
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

    if (!isGuest) {
      await Cart.deleteOne({ user: customerId });
    }

    await order.populate('area items.menuItem customer rider');

    // ── Guest confirmation email ─────────────────────────────
    if (isGuest && order.guestInfo?.email) {
      const shortId = orderIdShort(order._id);
      const trackingUrl = `${process.env.CLIENT_URL || 'https://altawakkalfoods.com'}/track/${order._id}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #e94e77;">Order Received! 🎉</h2>
          <p>Dear ${order.guestInfo.name || 'Customer'},</p>
          <p>Thank you for ordering from <strong>Altawakkal Foods</strong>!</p>
          
          <h3>Order #${shortId}</h3>
          <p><strong>Placed on:</strong> ${new Date().toLocaleString('en-PK')}</p>
          <p><strong>Estimated Delivery:</strong> ${order.estimatedDelivery}</p>
          
          <p style="margin: 30px 0;">
            <a href="${trackingUrl}" style="background: #e94e77; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Track Your Order Live
            </a>
          </p>
          
          <p style="color: #555; font-size: 14px;">
            Questions? Reply to this email or call us.
          </p>
          <p style="color: #888; font-size: 12px; margin-top: 30px;">
            This is an automated message — please do not reply.
          </p>
        </div>
      `;

      sendGuestEmail(order, `Order Received #${shortId} - Altawakkal Foods`, html);
    }

    // ── Admin & Kitchen notifications ────────────────────────────────
    await sendAdminNewOrderEmail(order);

    if (global.io) {
      // Classic new order event (admin panel list)
      global.io.to('admin').emit('newOrder', {
        orderId: order._id.toString(),
        shortId: orderIdShort(order._id),
        customerName,
        totalAmount: order.finalAmount,
        paymentMethod: order.paymentMethod,
        status: order.status,
        timestamp: new Date().toISOString(),
      });

      // Strong kitchen-focused new order alert (main improvement)
      await global.emitNewOrderAlert(order._id);

      // Normal order update to all relevant parties
      if (global.emitOrderUpdate) {
        await global.emitOrderUpdate(order._id);
      }
    }

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

// ── STATUS UPDATE WITH GUEST EMAIL ───────────────────────────────────────
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

    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Role permissions check
    if (userRole !== 'admin') {
      if (userRole === 'kitchen') {
        if (!['confirmed', 'preparing'].includes(status)) {
          await session.abortTransaction();
          return res.status(403).json({ success: false, message: 'Kitchen cannot set this status' });
        }
      }
      if (userRole === 'rider') {
        if (!['out_for_delivery', 'delivered'].includes(status)) {
          await session.abortTransaction();
          return res.status(403).json({ success: false, message: 'Rider cannot set this status' });
        }
        if (!order.rider || order.rider.toString() !== req.user.id) {
          await session.abortTransaction();
          return res.status(403).json({ success: false, message: 'You are not assigned to this order' });
        }
      }
    }

    // Invalid transition guard
    const INVALID_TRANSITIONS = {
      delivered: ['confirmed', 'preparing', 'out_for_delivery'],
      rejected: ['delivered'],
      cancelled: ['delivered']
    };

    if (INVALID_TRANSITIONS[order.status] && INVALID_TRANSITIONS[order.status].includes(status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot move from ${order.status} to ${status}`
      });
    }

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

    // Kitchen order sync
    const kitchenOrder = await KitchenOrder.findOne({ order: order._id }).session(session);
    if (kitchenOrder) {
      if (status === 'confirmed') {
        kitchenOrder.status = 'new';
        // Also trigger strong kitchen alert when order is confirmed
        if (global.emitNewOrderAlert) {
          await global.emitNewOrderAlert(order._id);
        }
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

    await session.commitTransaction();
    session.endSession();

    // Guest status email
    const guestNotifyStatuses = ['confirmed', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'];
    if (guestNotifyStatuses.includes(status)) {
      const shortId = orderIdShort(order._id);
      const trackingUrl = `${process.env.APP_URL || 'https://yourapp.com'}/track/${order._id}`;

      const messages = {
        confirmed: "Your order has been confirmed! Our kitchen is now preparing your food 🍳",
        out_for_delivery: "Your order is on the way! 🚀 Our rider is heading to your location",
        delivered: "Your order has been delivered! Enjoy your meal 🎉",
        cancelled: "Your order has been cancelled.",
        rejected: "Sorry, we couldn't process your order at this time."
      };

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
          <h2 style="color: #e94e77;">Order Update #${shortId}</h2>
          <p>${messages[status]}</p>
          <p style="margin: 25px 0;">
            <a href="${trackingUrl}" style="background: #e94e77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Track Your Order
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            Thank you for choosing us!
          </p>
        </div>
      `;

      sendGuestEmail(order, `Order #${shortId} - ${status.replace('_', ' ').toUpperCase()}`, html);
    }

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


const reorderOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
      });
    }

    /** -------------------------
     * Build secure query
     * ------------------------*/
    const query = { _id: orderId };

    if (req.user) {
      query.$or = [
        { customer: req.user._id },
        {
          'guestInfo.phone': req.user.phone,
          'guestInfo.isGuest': true,
        },
      ];
    } else {
      query['guestInfo.isGuest'] = true;
    }

    /** -------------------------
     * Fetch original order
     * ------------------------*/
    const original = await Order.findOne(query)
      .populate({
        path: 'items.menuItem',
        select: 'name price image unit isAvailable pricedOptions',
      })
      .lean();

    if (!original) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or permission denied',
      });
    }

    /** -------------------------
     * Rebuild cart items
     * ------------------------*/
    const validItems = [];
    let skippedCount = 0;

    for (const item of original.items) {
      const menuItem = item.menuItem;

      if (!menuItem || !menuItem.isAvailable) {
        skippedCount++;
        continue;
      }

      const enrichOptions = (names, type) =>
        (names || []).map((name) => {
          const opt = menuItem.pricedOptions?.[type]?.find(
            (o) => o.name === name
          );

          return {
            name,
            price: opt?.price || 0,
            unit: opt?.unit || menuItem.unit,
          };
        });

      validItems.push({
        _id: crypto.randomUUID(),
        menuItem: {
          _id: menuItem._id.toString(),
          name: menuItem.name,
          price: menuItem.price,
          unit: menuItem.unit,
          image: menuItem.image || null,
          isAvailable: true,
        },
        quantity: item.quantity,
        priceAtAdd: item.priceAtOrder,
        sides: enrichOptions(item.sides, 'sides'),
        drinks: enrichOptions(item.drinks, 'drinks'),
        addOns: enrichOptions(item.addOns, 'addOns'),
        specialInstructions: item.specialInstructions || '',
        addedAt: new Date().toISOString(),
      });
    }

    if (!validItems.length) {
      return res.status(400).json({
        success: false,
        message: 'No items from this order are currently available',
      });
    }

    /** -------------------------
     * AUTHENTICATED USER
     * ------------------------*/
    if (req.user) {
      let cart = await Cart.findOne({ user: req.user._id });

      if (!cart) {
        cart = new Cart({ user: req.user._id, items: [] });
      }

      cart.items = validItems.map((item) => ({
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
          items: validItems,
          isGuest: false,
        },
        skippedItems: skippedCount || undefined,
      });
    }

    /** -------------------------
     * GUEST USER (Zustand)
     * ------------------------*/
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
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder',
    });
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
    const { status, page = 1, limit = 20, search = '' } = req.query;

    const query = {};

    // Status filter (support comma separated)
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length) query.status = { $in: statuses };
    }

    // Search by shortId, customer name, phone, guest name/phone
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { shortId: searchRegex },
        { 'customer.name': searchRegex },
        { 'customer.phone': searchRegex },
        { 'guestInfo.name': searchRegex },
        { 'guestInfo.phone': searchRegex },
      ];
    }

    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .populate('rider', 'name phone')
      .populate('area', 'name')
      .sort({ placedAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: { page: Number(page), limit: Number(limit), total }
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
      .lean();

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
      const unit = i.unit || 'pc';
      const itemName = `${i.quantity}x ${i.name} (${unit})`;
      doc.text(`${itemName} - PKR ${toNumber(i.priceAtOrder * i.quantity)}`);

      // Show add-ons with units
      [...i.sides, ...i.drinks, ...i.addOns].forEach(opt => {
        if (opt.name) {
          const addonLine = `   + ${opt.name} (${opt.unit || unit}) +PKR ${opt.price}`;
          doc.fontSize(10).text(addonLine);
        }
      });
    });

    doc.moveDown();
    doc.text(`Subtotal: PKR ${toNumber(order.totalAmount)}`);
    doc.text(`Delivery Fee: PKR ${toNumber(order.deliveryFee)}`);
    if (order.discountApplied > 0) doc.text(`Discount: -PKR ${toNumber(order.discountApplied)}`);
    if (order.walletUsed > 0) doc.text(`Wallet Used: -PKR ${toNumber(order.walletUsed)}`);
    doc.fontSize(16).text(`Total Paid: PKR ${toNumber(order.finalAmount)}`, { bold: true });
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
    return res.status(400).json({ success: false, message: 'Invalid order ID' });
  }

  try {
    const order = await Order.findById(orderId)
      .select(
        'status placedAt totalAmount deliveryFee discountApplied walletUsed finalAmount estimatedDelivery paymentMethod paymentStatus items addressDetails instructions rider review'
      )
      .populate('rider', 'name phone')
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const shortId = orderIdShort(order._id);

    // Calculate subtotal from items as fallback (in case totalAmount is missing or outdated)
    const calculatedSubtotal = order.items.reduce(
      (sum, item) => sum + (item.priceAtOrder * item.quantity),
      0
    );

    const safeOrder = {
      _id: order._id,
      shortId,
      status: order.status,
      placedAt: order.placedAt,
      estimatedDelivery: order.estimatedDelivery,
      payment: {
        method: order.paymentMethod,
        status: order.paymentStatus,
        amount: toNumber(order.finalAmount ?? 0),
      },
      items: order.items.map((item) => ({
        _id: item._id,
        name: item.name,
        unit: item.unit || 'pc',
        image: item.image || null,
        quantity: item.quantity,
        priceAtOrder: item.priceAtOrder,
        addOns: [...(item.sides || []), ...(item.drinks || []), ...(item.addOns || [])].map((o) => ({
          name: o.name,
          unit: o.unit || item.unit || 'pc',
          price: o.price,
        })),
      })),
      // ← CRITICAL FIX: Properly populate totals with fallbacks
      totals: {
        totalAmount: toNumber(order.totalAmount ?? calculatedSubtotal),
        deliveryFee: toNumber(order.deliveryFee ?? 0),
        discountApplied: toNumber(order.discountApplied ?? 0),
        walletUsed: toNumber(order.walletUsed ?? 0),
        finalAmount: toNumber(order.finalAmount ?? 0),
      },
      addressDetails: order.addressDetails || {},
      instructions: order.instructions || null,
      rider: order.rider
        ? {
          _id: order.rider._id,
          name: order.rider.name,
          phone: order.rider.phone,
        }
        : null,
      review: order.review || null,
      trackUrl: `${process.env.APP_URL || 'https://foodapp.pk'}/track/${order._id}`,
    };

    return res.json({ success: true, order: safeOrder });
  } catch (err) {
    console.error('trackOrderById error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
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
