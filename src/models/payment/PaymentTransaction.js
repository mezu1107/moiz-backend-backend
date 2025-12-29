// src/models/payment/PaymentTransaction.js
const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },

  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'easypaisa', 'jazzcash', 'bank', 'wallet'],
    required: true
  },

  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    min: 0
  },

  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'canceled'],
    default: 'pending',
    index: true
  },

  transactionId: {
    type: String,
    sparse: true
  },

  stripePaymentIntentId: {
    type: String,
    sparse: true,
    index: { unique: true, sparse: true }
  },

  stripeChargeId: String,

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Retry tracking
  attemptCount: {
    type: Number,
    default: 1
  },

  // Refund fields
  refundStatus: {
    type: String,
    enum: ['none', 'requested', 'processing', 'partial', 'completed', 'rejected'],
    default: 'none',
    index: true
  },

  refundAmount: {
    type: mongoose.Schema.Types.Decimal128,
    default: () => new mongoose.Types.Decimal128('0')
  },

  refundRequestedAt: Date,
  refundRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  refundProcessedAt: Date,
  refundProcessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  refundReason: String,
  refundNote: String,
  stripeRefundId: String
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      if (ret.amount) ret.amount = Number(ret.amount.toString());
      if (ret.refundAmount) ret.refundAmount = Number(ret.refundAmount.toString());
      return ret;
    }
  }
});

paymentTransactionSchema.index({ order: 1, createdAt: -1 });
paymentTransactionSchema.index({ status: 1, paymentMethod: 1 });
paymentTransactionSchema.index({ refundStatus: 1, refundRequestedAt: -1 });

module.exports = mongoose.models.PaymentTransaction ||
  mongoose.model('PaymentTransaction', paymentTransactionSchema);