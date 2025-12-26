// src/controllers/payment/paymentController.js


const Order = require('../../models/order/Order');
const PaymentTransaction = require('../../models/payment/PaymentTransaction');
const stripe = require('../../config/stripe');
const io = global.io;
const admin = require('firebase-admin');

// Helpers
const orderIdShort = (id) => id ? id.toString().slice(-6).toUpperCase() : 'N/A';
const toNumber = (decimal) => decimal ? parseFloat(decimal.toString()) : 0;

// =============================
// Handle Payment Failure (Webhook or Manual)
// =============================
const handlePaymentFailure = async (orderId, reason = 'payment_failed', metadata = {}) => {
  try {
    const order = await Order.findById(orderId)
      .populate('customer', 'fcmToken')
      .lean();

    if (!order || order.paymentStatus !== 'pending') return;

    // Update order
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'failed',
      status: 'pending_payment',
    });

    // Update payment transaction
    await PaymentTransaction.findOneAndUpdate(
      { order: orderId },
      {
        status: 'failed',
        metadata: { ...metadata, failureReason: reason },
      }
    );

    const shortId = orderIdShort(orderId);

    const payload = {
      event: 'paymentFailed',
      orderId: orderId.toString(),
      shortId,
      reason,
      timestamp: new Date(),
    };

    // Socket.IO notifications
    if (order.customer) {
      io?.to(`user:${order.customer._id}`).emit('paymentUpdate', payload);
    }
    io?.to('admin').emit('paymentUpdate', payload);

    // FCM push notification
    if (order.customer?.fcmToken) {
      await admin.messaging().send({
        token: order.customer.fcmToken,
        notification: {
          title: 'Payment Failed',
          body: `Order #${shortId} payment failed. Tap to retry.`,
        },
        data: {
          type: 'payment_failed',
          orderId: orderId.toString(),
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
    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Authorization
    if (order.customer?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Validation
    if (order.paymentMethod !== 'card') {
      return res.status(400).json({ success: false, message: 'Only card payments can be retried' });
    }

    if (!['failed', 'pending'].includes(order.paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Payment cannot be retried at this stage' });
    }

    // Create new PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(toNumber(order.finalAmount) * 100),
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
    await Order.findByIdAndUpdate(orderId, {
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'pending',
      status: 'pending_payment',
      $inc: { retryCount: 1 },
    });

    // Update/create transaction record
    await PaymentTransaction.findOneAndUpdate(
      { order: orderId },
      {
        transactionId: paymentIntent.id,
        stripePaymentIntentId: paymentIntent.id,
        status: 'pending',
        metadata: {
          retry: true,
          attempt: (order.retryCount || 0) + 1,
          previousIntent: order.paymentIntentId,
        },
      },
      { upsert: true }
    );

    // Real-time update
    io?.to(`user:${req.user._id}`).emit('paymentRetryReady', {
      orderId: order._id.toString(),
      shortId: orderIdShort(order._id),
      clientSecret: paymentIntent.client_secret,
    });

    res.json({
      success: true,
      message: 'Payment retry initiated',
      clientSecret: paymentIntent.client_secret,
      orderId: order._id.toString(),
    });
  } catch (err) {
    console.error('retryPayment error:', err);
    res.status(500).json({ success: false, message: 'Failed to prepare payment retry' });
  }
};

// =============================
// Get Payment Transaction History (Customer & Admin)
// =============================
const getTransactionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, method } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(10, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const isAdmin = ['admin', 'finance', 'support'].includes(req.user.role);

    const query = {};
    if (!isAdmin) {
      const customerOrders = await Order.find({ customer: req.user._id }).distinct('_id');
      query.order = { $in: customerOrders };
    }

    if (status) query.status = status;
    if (method) query.paymentMethod = method;

    const [transactions, total] = await Promise.all([
      PaymentTransaction.find(query)
        .populate('order', 'finalAmount status placedAt _id')
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

    const history = transactions.map(t => ({
      id: t._id.toString(),
      orderId: t.order?._id?.toString() || null,
      orderShortId: t.order?._id ? orderIdShort(t.order._id) : 'N/A',
      amount: toNumber(t.amount).toFixed(2),
      method: methodLabels[t.paymentMethod] || t.paymentMethod,
      status: t.status,
      refundStatus: t.refundStatus || 'none',
      refundAmount: toNumber(t.refundAmount).toFixed(2),
      date: new Date(t.createdAt).toLocaleString('en-PK', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      canRetry: t.paymentMethod === 'card' &&
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