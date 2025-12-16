// src/controllers/payment/paymentController.js
// FINAL PRODUCTION — DECEMBER 15, 2025 — PAYMENT FAILURE, RETRY & HISTORY

const Order = require('../../models/order/Order');
const PaymentTransaction = require('../../models/payment/PaymentTransaction');
const stripe = require('../../config/stripe');
const io = global.io;
const admin = require('firebase-admin');

// =============================
// Handle Payment Failure
// =============================
const handlePaymentFailure = async (orderId, reason = 'payment_failed', metadata = {}) => {
  try {
    const order = await Order.findById(orderId).populate('customer', 'fcmTokens');
    if (!order || order.paymentStatus !== 'pending') return;

    order.paymentStatus = 'failed';
    order.status = 'pending_payment'; // Allow retry
    await order.save();

    await PaymentTransaction.updateOne(
      { order: order._id },
      {
        status: 'failed',
        metadata: { ...metadata, failureReason: reason },
      }
    );

    const shortId = order._id.toString().slice(-6).toUpperCase();
    const payload = {
      event: 'paymentFailed',
      orderId: order._id.toString(),
      shortId,
      reason,
      timestamp: new Date(),
    };

    // Socket.IO
    if (order.customer) {
      io?.to(`user:${order.customer}`).emit('paymentUpdate', payload);
    }
    io?.to('admin').emit('paymentUpdate', payload);

    // FCM
    const tokens = order.customer?.fcmTokens || [];
    if (tokens.length > 0) {
      await admin.messaging().sendMulticast({
        tokens,
        notification: {
          title: 'Payment Failed',
          body: `Order #${shortId} payment failed. Tap to retry.`,
        },
        data: { type: 'payment_failed', orderId: order._id.toString() },
      });
    }
  } catch (err) {
    console.error('handlePaymentFailure error:', err);
  }
};

// =============================
// Retry Failed Payment
// =============================
const retryPayment = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.customer?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!['failed', 'pending'].includes(order.paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Cannot retry this payment' });
    }

    if (order.paymentMethod !== 'card') {
      return res.status(400).json({ success: false, message: 'Only card payments can be retried' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.finalAmount * 100),
      currency: 'pkr',
      metadata: {
        orderId: order._id.toString(),
        customerId: req.user._id.toString(),
        retry: true,
      },
      automatic_payment_methods: { enabled: true },
    });

    order.paymentIntentId = paymentIntent.id;
    order.paymentStatus = 'pending';
    order.status = 'pending_payment';
    order.retryCount = (order.retryCount || 0) + 1;
    await order.save();

    await PaymentTransaction.updateOne(
      { order: order._id },
      {
        transactionId: paymentIntent.id,
        status: 'pending',
        metadata: { retry: true, attempt: order.retryCount },
      }
    );

    if (io) {
      io.to(`user:${req.user._id}`).emit('paymentRetryReady', {
        orderId: order._id.toString(),
        clientSecret: paymentIntent.client_secret,
      });
    }

    res.json({
      success: true,
      message: 'Ready to retry payment',
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error('retryPayment error:', err);
    res.status(500).json({ success: false, message: 'Retry failed' });
  }
};

// =============================
// Get Transaction History
// =============================
const getTransactionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, method } = req.query;
    const isAdmin = req.user.role === 'admin';

    let query = {};
    if (!isAdmin) {
      const orders = await Order.find({ customer: req.user._id }).distinct('_id');
      query.order = { $in: orders };
    }

    if (status) query.status = status;
    if (method) query.paymentMethod = method;

    const [transactions, total] = await Promise.all([
      PaymentTransaction.find(query)
        .populate('order', 'finalAmount status placedAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .lean(),
      PaymentTransaction.countDocuments(query),
    ]);

    const methodLabels = {
      cash: 'Cash on Delivery',
      card: 'Card',
      wallet: 'Wallet',
      easypaisa: 'Easypaisa',
      jazzcash: 'JazzCash',
      bank: 'Bank Transfer',
    };

    const history = transactions.map(t => ({
      id: t._id,
      orderShortId: t.order?._id?.toString().slice(-6).toUpperCase() || 'N/A',
      amount: t.amount,
      method: methodLabels[t.paymentMethod] || t.paymentMethod,
      status: t.status,
      refundStatus: t.refundStatus,
      refundAmount: t.refundAmount || 0,
      date: new Date(t.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
      canRetry: t.paymentMethod === 'card' && ['failed', 'pending'].includes(t.status),
    }));

    res.json({
      success: true,
      history,
      pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('getTransactionHistory error:', err);
    res.status(500).json({ success: false, message: 'Failed to load history' });
  }
};

module.exports = {
  handlePaymentFailure,
  retryPayment,
  getTransactionHistory,
};