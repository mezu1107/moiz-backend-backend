// src/controllers/admin/refundAdminController.js
// FINAL PRODUCTION — DECEMBER 19, 2025 — HARDENED & OPTIMIZED

const mongoose = require('mongoose');
const Order = require('../../models/order/Order');
const PaymentTransaction = require('../../models/payment/PaymentTransaction');
const stripe = require('../../config/stripe');
const io = global.io;

// Helper: Short Order ID
const orderIdShort = (id) => (id ? id.toString().slice(-6).toUpperCase() : 'N/A');

// =============================
// GET All Refund Requests (Paginated)
// =============================
const getRefundRequests = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20)); // cap limit
    const skip = (pageNum - 1) * limitNum;

    let query = { refundStatus: { $ne: 'none' } };
    if (status !== 'all' && ['requested', 'processing', 'completed', 'rejected'].includes(status)) {
      query.refundStatus = status;
    }

    const [requests, total] = await Promise.all([
      PaymentTransaction.find(query)
        .populate({
          path: 'order',
          select: '_id customer guestInfo finalAmount status placedAt',
          populate: { path: 'customer', select: 'name phone' }
        })
        .select(
          'order paymentMethod amount refundAmount refundStatus refundReason ' +
          'refundRequestedAt refundRequestedBy createdAt transactionId status'
        )
        .sort({ refundRequestedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      PaymentTransaction.countDocuments(query)
    ]);

    const formatted = requests.map(t => {
      const isRegistered = t.order?.customer && mongoose.Types.ObjectId.isValid(t.order.customer._id);
      return {
        transactionId: t._id.toString(),
        orderId: t.order?._id?.toString() || null,
        orderShortId: orderIdShort(t.order?._id),
        customerName: isRegistered
          ? t.order.customer.name
          : t.order?.guestInfo?.name || 'Guest',
        customerPhone: isRegistered
          ? t.order.customer.phone
          : t.order?.guestInfo?.phone || 'N/A',
        originalAmount: Number(t.amount.toFixed(2)),
        refundAmount: Number(t.refundAmount.toFixed(2)),
        paymentMethod: t.paymentMethod,
        transactionStatus: t.status, // paid, refunded, etc.
        refundStatus: t.refundStatus,
        reason: t.refundReason || 'No reason provided',
        requestedAt: t.refundRequestedAt,
        requestedBy: t.refundRequestedBy?.toString() || null,
        canProcess: t.paymentMethod === 'card' &&
                    t.status === 'paid' &&
                    t.refundStatus === 'requested',
      };
    });

    res.json({
      success: true,
      data: {
        requests: formatted,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1,
        }
      }
    });
  } catch (err) {
    console.error('getRefundRequests error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch refund requests' });
  }
};

// =============================
// POST Process Refund (Approve / Reject)
// =============================
const processRefund = async (req, res) => {
  const { transactionId } = req.params;
  const { action, note = '' } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action: must be "approve" or "reject"' });
  }

  try {
    // Deep populate to safely access customer data
    const transaction = await PaymentTransaction.findById(transactionId)
      .populate({
        path: 'order',
        populate: { path: 'customer', select: '_id name phone' }
      });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.refundStatus !== 'requested') {
      return res.status(400).json({ success: false, message: 'Refund is not in requested state' });
    }

    const order = transaction.order;
    if (!order) {
      return res.status(400).json({ success: false, message: 'Associated order not found' });
    }

    const shortId = orderIdShort(order._id);
    const customerId = order.customer?._id || order.customer;
    const isRegisteredUser = customerId && mongoose.Types.ObjectId.isValid(customerId);

    // === REJECT REFUND ===
    if (action === 'reject') {
      transaction.refundStatus = 'rejected';
      transaction.refundProcessedAt = new Date();
      transaction.refundProcessedBy = req.user._id;
      transaction.refundNote = note.trim() || 'Rejected by admin';

      await transaction.save();

      if (io && isRegisteredUser) {
        io.to(`user:${customerId}`).emit('refundUpdate', {
          event: 'refundRejected',
          orderId: order._id.toString(),
          shortId,
          message: 'Your refund request was rejected.',
          note: transaction.refundNote,
        });
      }

      if (io) {
        io.to('admin').emit('refundProcessed', {
          transactionId: transaction._id.toString(),
          orderShortId: shortId,
          amount: transaction.refundAmount,
          status: 'rejected',
          note: transaction.refundNote,
        });
      }

      return res.json({
        success: true,
        message: 'Refund request rejected successfully',
        data: { transactionId: transaction._id.toString() }
      });
    }

    // === APPROVE REFUND (Card Only) ===
    if (transaction.paymentMethod !== 'card') {
      return res.status(400).json({ success: false, message: 'Only card payments can be refunded via Stripe' });
    }

    if (!transaction.transactionId) {
      return res.status(400).json({ success: false, message: 'Missing Stripe PaymentIntent ID' });
    }

    if (transaction.status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot refund: original payment was not successful' });
    }

    // Verify PaymentIntent status with Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(transaction.transactionId);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          message: `Cannot refund: PaymentIntent is ${paymentIntent.status}`
        });
      }
    } catch (err) {
      console.error('Stripe retrieve error:', err);
      return res.status(500).json({ success: false, message: 'Failed to verify payment with Stripe' });
    }

    // Process Stripe refund
    let stripeRefund;
    try {
      stripeRefund = await stripe.refunds.create({
        payment_intent: transaction.transactionId,
        amount: Math.round(transaction.refundAmount * 100),
        reason: 'requested_by_customer',
        metadata: {
          orderId: order._id.toString(),
          transactionId: transaction._id.toString(),
          processedBy: req.user._id.toString(),
          adminNote: note.trim(),
          customerReason: transaction.refundReason || 'N/A'
        }
      });
    } catch (err) {
      console.error('Stripe refund failed:', err);
      return res.status(400).json({
        success: false,
        message: `Stripe refund failed: ${err.message}`
      });
    }

    // Update records
    transaction.refundStatus = 'completed';
    transaction.status = 'refunded';
    transaction.stripeRefundId = stripeRefund.id;
    transaction.refundProcessedAt = new Date();
    transaction.refundProcessedBy = req.user._id;
    transaction.refundNote = note.trim() || 'Refund processed successfully';

    order.paymentStatus = 'refunded';
    order.refundedAt = new Date();

    await Promise.all([transaction.save(), order.save()]);

    // === Real-time Notifications ===
    if (io) {
      // Notify registered customer only
      if (isRegisteredUser) {
        io.to(`user:${customerId}`).emit('refundUpdate', {
          event: 'refundApproved',
          orderId: order._id.toString(),
          shortId,
          amount: transaction.refundAmount,
          message: `PKR ${transaction.refundAmount.toFixed(2)} has been refunded to your card.`,
          note: transaction.refundNote,
        });
      }

      // Always notify admin dashboard
      io.to('admin').emit('refundProcessed', {
        transactionId: transaction._id.toString(),
        orderShortId: shortId,
        amount: transaction.refundAmount,
        status: 'completed',
        customerName: isRegisteredUser
          ? order.customer.name
          : order.guestInfo?.name || 'Guest',
      });
    }

    res.json({
      success: true,
      message: `Refund of PKR ${transaction.refundAmount.toFixed(2)} processed successfully`,
      data: {
        stripeRefundId: stripeRefund.id,
        transactionId: transaction._id.toString(),
      }
    });

  } catch (err) {
    console.error('processRefund critical error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during refund processing' });
  }
};

module.exports = {
  getRefundRequests,
  processRefund,
};