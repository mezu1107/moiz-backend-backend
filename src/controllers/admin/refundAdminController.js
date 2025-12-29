// src/controllers/admin/refundAdminController.js
// FINAL PRODUCTION — DECEMBER 29, 2025 — ATOMIC, STRIPE-SAFE, AUDIT-READY

const mongoose = require('mongoose');
const Order = require('../../models/order/Order');
const PaymentTransaction = require('../../models/payment/PaymentTransaction');
const stripe = require('../../config/stripe');
const io = global.io;

const orderIdShort = (id) => (id ? id.toString().slice(-6).toUpperCase() : 'N/A');
const toNumber = (decimal) => (decimal ? parseFloat(decimal.toString()) : 0);

// =============================
// GET All Refund Requests (Paginated + Filtered)
// =============================
const getRefundRequests = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(10, parseInt(limit)));

    const query = { refundStatus: { $ne: 'none' } };
    if (status !== 'all' && ['requested', 'processing', 'completed', 'rejected', 'partial'].includes(status)) {
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
          'refundRequestedAt refundRequestedBy refundProcessedAt refundProcessedBy ' +
          'createdAt transactionId stripePaymentIntentId status'
        )
        .sort({ refundRequestedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),

      PaymentTransaction.countDocuments(query)
    ]);

    const formatted = requests.map(t => ({
      transactionId: t._id.toString(),
      orderId: t.order?._id?.toString(),
      orderShortId: orderIdShort(t.order?._id),
      customerName: t.order?.customer?.name || t.order?.guestInfo?.name || 'Guest',
      customerPhone: t.order?.customer?.phone || t.order?.guestInfo?.phone || 'N/A',
      originalAmount: toNumber(t.amount).toFixed(2),
      refundAmount: toNumber(t.refundAmount).toFixed(2),
      paymentMethod: t.paymentMethod,
      originalStatus: t.status,
      refundStatus: t.refundStatus,
      reason: t.refundReason || 'No reason provided',
      requestedAt: t.refundRequestedAt?.toISOString(),
      requestedBy: t.refundRequestedBy?.toString(),
      processedAt: t.refundProcessedAt?.toISOString(),
      processedBy: t.refundProcessedBy?.toString(),
      canProcess: t.paymentMethod === 'card' &&
                  ['paid', 'succeeded'].includes(t.status) &&
                  t.refundStatus === 'requested'
    }));

    res.json({
      success: true,
      requests: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      }
    });
  } catch (err) {
    console.error('getRefundRequests error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch refund requests' });
  }
};

// =============================
// POST Process Refund Request (Approve / Reject)
// Fully atomic + Stripe integration
// =============================
const processRefund = async (req, res) => {
  const { transactionId } = req.params;
  const { action, note = '', amount: requestedRefundAmount } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be "approve" or "reject"' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transaction = await PaymentTransaction.findById(transactionId)
      .populate({
        path: 'order',
        populate: { path: 'customer', select: '_id name phone fcmToken' }
      })
      .session(session);

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.refundStatus !== 'requested') {
      throw new Error('Refund request is not in pending state');
    }

    const order = transaction.order;
    if (!order) {
      throw new Error('Associated order not found');
    }

    const customerId = order.customer?._id;
    const isRegistered = customerId && mongoose.Types.ObjectId.isValid(customerId);
    const shortId = orderIdShort(order._id);

    if (action === 'reject') {
      transaction.refundStatus = 'rejected';
      transaction.refundProcessedAt = new Date();
      transaction.refundProcessedBy = req.user._id;
      transaction.refundNote = note.trim() || 'Rejected - insufficient justification';

      await transaction.save({ session });

      // Notify user & admin
      if (io) {
        if (isRegistered) {
          io.to(`user:${customerId}`).emit('refundUpdate', {
            event: 'refundRejected',
            orderId: order._id.toString(),
            shortId,
            message: 'Your refund request was rejected.',
            note: transaction.refundNote
          });
        }
        io.to('admin').emit('refundProcessed', {
          transactionId: transaction._id.toString(),
          orderShortId: shortId,
          status: 'rejected'
        });
      }

      await session.commitTransaction();
      return res.json({
        success: true,
        message: 'Refund request rejected successfully'
      });
    }

    // === APPROVE REFUND ===
    if (transaction.paymentMethod !== 'card') {
      throw new Error('Only card payments can be refunded via Stripe');
    }

    if (!transaction.stripePaymentIntentId) {
      throw new Error('Missing Stripe PaymentIntent ID');
    }

    if (!['paid', 'succeeded'].includes(transaction.status)) {
      throw new Error('Cannot refund: original payment was not successful');
    }

    // Verify with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(transaction.stripePaymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Cannot refund: PaymentIntent status is ${paymentIntent.status}`);
    }

    const refundAmount = requestedRefundAmount
      ? Math.min(toNumber(transaction.amount), Number(requestedRefundAmount))
      : toNumber(transaction.refundAmount);

    if (refundAmount <= 0 || refundAmount > toNumber(transaction.amount)) {
      throw new Error('Invalid refund amount');
    }

    // Execute Stripe refund
    const stripeRefund = await stripe.refunds.create({
      payment_intent: transaction.stripePaymentIntentId,
      amount: Math.round(refundAmount * 100),
      reason: 'requested_by_customer',
      metadata: {
        orderId: order._id.toString(),
        transactionId: transaction._id.toString(),
        adminId: req.user._id.toString(),
        adminNote: note.trim(),
        customerReason: transaction.refundReason || 'N/A'
      }
    });

    // Update transaction & order
    transaction.refundStatus = refundAmount === toNumber(transaction.amount) ? 'completed' : 'partial';
    transaction.status = 'refunded';
    transaction.stripeRefundId = stripeRefund.id;
    transaction.refundAmount = toDecimal(refundAmount);
    transaction.refundProcessedAt = new Date();
    transaction.refundProcessedBy = req.user._id;
    transaction.refundNote = note.trim() || 'Refund approved';

    order.paymentStatus = 'refunded';
    order.refundedAt = new Date();

    await Promise.all([
      transaction.save({ session }),
      order.save({ session })
    ]);

    await session.commitTransaction();

    // Notifications
    if (io) {
      if (isRegistered) {
        io.to(`user:${customerId}`).emit('refundUpdate', {
          event: 'refundApproved',
          orderId: order._id.toString(),
          shortId,
          amount: refundAmount,
          message: `PKR ${refundAmount.toFixed(2)} refunded to your card.`
        });
      }
      io.to('admin').emit('refundProcessed', {
        transactionId: transaction._id.toString(),
        orderShortId: shortId,
        amount: refundAmount,
        status: transaction.refundStatus
      });
    }

    res.json({
      success: true,
      message: `Refund of PKR ${refundAmount.toFixed(2)} processed successfully`,
      refundId: stripeRefund.id
    });

  } catch (err) {
    await session.abortTransaction();
    console.error('processRefund error:', err);
    const status = err.message?.includes('Cannot') ? 400 : 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Failed to process refund'
    });
  } finally {
    session.endSession();
  }
};

module.exports = {
  getRefundRequests,
  processRefund
};