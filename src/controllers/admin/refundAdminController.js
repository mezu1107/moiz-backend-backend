// src/controllers/admin/refundAdminController.js
const Order = require('../../models/order/Order');
const PaymentTransaction = require('../../models/payment/PaymentTransaction');
const stripe = require('../../config/stripe');
const io = global.io;

const getRefundRequests = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const query = status !== 'all' ? { refundStatus: status } : { refundStatus: { $ne: 'none' } };

    const [requests, total] = await Promise.all([
      PaymentTransaction.find(query)
        .populate({
          path: 'order',
          populate: [
            { path: 'customer', select: 'name phone' },
            { path: 'rider', select: 'name' }
          ]
        })
        .select('order amount refundAmount refundStatus refundReason refundRequestedAt createdAt')
        .sort({ refundRequestedAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .lean(),
      PaymentTransaction.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        requests: requests.map(r => ({
          id: r._id,
          orderId: r.order?._id?.toString().slice(-6).toUpperCase(),
          fullOrderId: r.order?._id,
          customer: r.order?.customer?.name || r.order?.guestInfo?.name || 'Guest',
          phone: r.order?.customer?.phone || r.order?.guestInfo?.phone || 'N/A',
          originalAmount: r.amount,
          refundAmount: r.refundAmount,
          reason: r.refundReason || 'No reason provided',
          status: r.refundStatus,
          requestedAt: r.refundRequestedAt,
          canProcess: ['card'].includes(r.paymentMethod) && r.refundStatus === 'requested'
        })),
        pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / limit) }
      }
    });
  } catch (err) {
    console.error('Get Refund Requests Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const processRefund = async (req, res) => {
  const { transactionId } = req.params;
  const { action, note } = req.body; // action: 'approve' or 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be approve or reject' });
  }

  try {
    const transaction = await PaymentTransaction.findById(transactionId)
      .populate('order');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.refundStatus !== 'requested') {
      return res.status(400).json({ success: false, message: 'Refund not in requested state' });
    }

    if (action === 'reject') {
      transaction.refundStatus = 'rejected';
      transaction.refundProcessedAt = new Date();
      transaction.refundProcessedBy = req.user.id;
      transaction.refundNote = note || 'Refund rejected by admin';
      await transaction.save();

      // Notify customer
      if (io && transaction.order?.customer) {
        io.to(`user:${transaction.order.customer}`).emit('refundUpdate', {
          orderId: transaction.order._id,
          status: 'rejected',
          message: 'Your refund request was rejected',
          note
        });
      }

      return res.json({ success: true, message: 'Refund request rejected', transaction });
    }

    // === APPROVE REFUND ===
    if (transaction.paymentMethod !== 'card' || !transaction.transactionId) {
      return res.status(400).json({ success: false, message: 'Only Stripe card payments can be refunded' });
    }

    const refundAmount = transaction.refundAmount * 100; // Stripe uses paisa

    const stripeRefund = await stripe.refunds.create({
      payment_intent: transaction.transactionId,
      amount: Math.round(refundAmount),
      reason: 'requested_by_customer',
      metadata: {
        orderId: transaction.order._id.toString(),
        processedBy: req.user.id.toString(),
        reason: transaction.refundReason
      }
    });

    // Update records
    transaction.refundStatus = 'completed';
    transaction.status = 'refunded';
    transaction.stripeRefundId = stripeRefund.id;
    transaction.refundProcessedAt = new Date();
    transaction.refundProcessedBy = req.user.id;
    transaction.refundNote = note || 'Refund processed successfully';

    // Update order
    if (transaction.order) {
      transaction.order.paymentStatus = 'refunded';
      transaction.order.refundedAt = new Date();
      await transaction.order.save();
    }

    await transaction.save();

    // === NOTIFICATIONS ===
    const shortId = transaction.order._id.toString().slice(-6).toUpperCase();
    if (io) {
      if (transaction.order?.customer) {
        io.to(`user:${transaction.order.customer}`).emit('refundUpdate', {
          orderId: transaction.order._id,
          status: 'completed',
          amount: transaction.refundAmount,
          message: `PKR ${transaction.refundAmount} has been refunded to your card`
        });
      }
      io.to('admin').emit('refundProcessed', { transactionId, shortId, amount: transaction.refundAmount });
    }

    res.json({
      success: true,
      message: `Refund of PKR ${transaction.refundAmount} processed successfully`,
      data: { stripeRefundId: stripeRefund.id }
    });
  } catch (err) {
    console.error('Process Refund Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Refund failed' });
  }
};

module.exports = {
  getRefundRequests,
  processRefund
};