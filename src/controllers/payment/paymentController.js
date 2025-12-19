// src/controllers/payment/paymentController.js
// FINAL PRODUCTION — DECEMBER 19, 2025 — PAYMENT FAILURE, RETRY & HISTORY

const Order = require('../../models/order/Order');
const PaymentTransaction = require('../../models/payment/PaymentTransaction');
const stripe = require('../../config/stripe');
const io = global.io;
const admin = require('firebase-admin');

// Helper: Short Order ID
const orderIdShort = (id) => (id ? id.toString().slice(-6).toUpperCase() : 'N/A');

// =============================
// Handle Payment Failure (Webhook or Manual)
// =============================
const handlePaymentFailure = async (orderId, reason = 'payment_failed', metadata = {}) => {
  try {
    const order = await Order.findById(orderId).populate('customer', 'fcmTokens');
    if (!order || order.paymentStatus !== 'pending') return;

    // Update order
    order.paymentStatus = 'failed';
    order.status = 'pending_payment'; // Allow customer to retry
    await order.save();

    // Update payment transaction
    await PaymentTransaction.updateOne(
      { order: order._id },
      {
        status: 'failed',
        metadata: { ...metadata, failureReason: reason },
      }
    );

    const shortId = orderIdShort(order._id);

    const payload = {
      event: 'paymentFailed',
      orderId: order._id.toString(),
      shortId,
      reason,
      timestamp: new Date(),
    };

    // Real-time: Socket.IO
    if (order.customer) {
      io?.to(`user:${order.customer._id}`).emit('paymentUpdate', payload);
    }
    io?.to('admin').emit('paymentUpdate', payload);

    // Push Notification: FCM
    const tokens = order.customer?.fcmTokens || [];
    if (tokens.length > 0) {
      await admin.messaging().sendMulticast({
        tokens,
        notification: {
          title: 'Payment Failed',
          body: `Order #${shortId} payment failed. Tap to retry.`,
        },
        data: {
          type: 'payment_failed',
          orderId: order._id.toString(),
          shortId,
        },
      });
    }
  } catch (err) {
    console.error('handlePaymentFailure error:', err);
  }
};

// =============================
// Retry Failed Card Payment
// =============================
const retryPayment = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Authorization check
    if (order.customer?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Only allow retry for card payments that are failed/pending
    if (order.paymentMethod !== 'card') {
      return res.status(400).json({ success: false, message: 'Only card payments can be retried' });
    }

    if (!['failed', 'pending'].includes(order.paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Payment cannot be retried at this stage' });
    }

    // Create new Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.finalAmount * 100),
      currency: 'pkr',
      metadata: {
        orderId: order._id.toString(),
        customerId: req.user._id.toString(),
        retry: 'true',
        originalIntent: order.paymentIntentId || 'none',
      },
      automatic_payment_methods: { enabled: true },
    });

    // Update order
    order.paymentIntentId = paymentIntent.id;
    order.paymentStatus = 'pending';
    order.status = 'pending_payment';
    order.retryCount = (order.retryCount || 0) + 1;
    await order.save();

    // Update or create payment transaction
    await PaymentTransaction.findOneAndUpdate(
      { order: order._id },
      {
        transactionId: paymentIntent.id,
        status: 'pending',
        metadata: {
          retry: true,
          attempt: order.retryCount,
          previousIntent: order.paymentIntentId,
        },
      },
      { upsert: true }
    );

    // Real-time notification
    if (io) {
      io.to(`user:${req.user._id}`).emit('paymentRetryReady', {
        orderId: order._id.toString(),
        shortId: orderIdShort(order._id),
        clientSecret: paymentIntent.client_secret,
      });
    }

    res.json({
      success: true,
      message: 'Payment retry ready',
      clientSecret: paymentIntent.client_secret,
      orderId: order._id.toString(),
    });
  } catch (err) {
    console.error('retryPayment error:', err);
    res.status(500).json({ success: false, message: 'Failed to prepare payment retry' });
  }
};

// =============================
// Get Payment Transaction History
// =============================
const getTransactionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, method } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const isAdmin = ['admin', 'finance', 'support'].includes(req.user.role);

    let query = {};

    if (!isAdmin) {
      // Customer: only their own orders
      const customerOrders = await Order.find({ customer: req.user._id }).distinct('_id');
      query.order = { $in: customerOrders };
    }

    if (status) query.status = status;
    if (method) query.paymentMethod = method;

    const [transactions, total] = await Promise.all([
      PaymentTransaction.find(query)
        .populate({
          path: 'order',
          select: 'finalAmount status placedAt _id',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PaymentTransaction.countDocuments(query),
    ]);

    const methodLabels = {
      cash: 'Cash on Delivery',
      card: 'Credit/Debit Card',
      wallet: 'Wallet',
      easypaisa: 'Easypaisa',
      jazzcash: 'JazzCash',
      bank: 'Bank Transfer',
    };

    const history = transactions.map((t) => ({
      id: t._id.toString(),
      orderId: t.order?._id?.toString() || null,
      orderShortId: t.order?._id ? orderIdShort(t.order._id) : 'N/A',
      amount: t.amount.toFixed(2),
      method: methodLabels[t.paymentMethod] || t.paymentMethod,
      status: t.status,
      refundStatus: t.refundStatus || 'none',
      refundAmount: t.refundAmount ? t.refundAmount.toFixed(2) : '0.00',
      date: new Date(t.createdAt).toLocaleString('en-PK', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      canRetry:
        t.paymentMethod === 'card' &&
        ['failed', 'pending'].includes(t.status) &&
        t.order?.status === 'pending_payment',
      failureReason: t.metadata?.failureReason || null,
    }));

    res.json({
      success: true,
      history,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
    });
  } catch (err) {
    console.error('getTransactionHistory error:', err);
    res.status(500).json({ success: false, message: 'Failed to load payment history' });
  }
};

module.exports = {
  handlePaymentFailure,
  retryPayment,
  getTransactionHistory,
};