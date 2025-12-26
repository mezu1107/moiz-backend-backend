// 1. PaymentTransaction.js
// Updated: Decimal128 for money, better refund fields, version for optimistic concurrency

const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'easypaisa', 'jazzcash', 'bank', 'wallet'],
      required: true,
    },

    // All monetary fields → Decimal128 !!!
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true,
    },

    transactionId: {
      type: String,
      sparse: true,
      index: { unique: true, sparse: true },
    },

    stripePaymentIntentId: String,     // explicit field (better than generic transactionId)
    stripeChargeId: String,            // sometimes useful for disputes

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ── Refund Fields ───────────────────────────────────────────────
    refundStatus: {
      type: String,
      enum: ['none', 'requested', 'processing', 'partial', 'completed', 'rejected'],
      default: 'none',
      index: true,
    },

    refundAmount: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => new mongoose.Types.Decimal128('0'),
    },

    refundRequestedAt: Date,
    refundRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    refundProcessedAt: Date,
    refundProcessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    refundReason: String,
    refundNote: String,
    stripeRefundId: String,           // only for card refunds

    // For optimistic concurrency control (very important for money!)
    __v: { type: Number, select: false }, // mongoose version key
  },
  {
    timestamps: true,
    toJSON: { transform: (doc, ret) => {
      // Convert Decimal128 to string/number for clients
      if (ret.amount) ret.amount = Number(ret.amount.toString());
      if (ret.refundAmount) ret.refundAmount = Number(ret.refundAmount.toString());
      return ret;
    }}
  }
);

// Important compound indexes
paymentTransactionSchema.index({ order: 1, createdAt: -1 });
paymentTransactionSchema.index({ refundStatus: 1, refundRequestedAt: -1 });
paymentTransactionSchema.index({ status: 1, paymentMethod: 1 });

module.exports = mongoose.models.PaymentTransaction ||
  mongoose.model('PaymentTransaction', paymentTransactionSchema);