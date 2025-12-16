// src/models/payment/PaymentTransaction.js

const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },

    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'easypaisa', 'jazzcash', 'bank'],
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },

    transactionId: {
      // Stripe PaymentIntent ID, Bank ref, Jazz/Easy ID, etc.
      type: String
    },

    refundedAt: Date,
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    refundReason: String,

    metadata: mongoose.Schema.Types.Mixed,

    // ======================================================
    //                REFUND ENHANCED FIELDS
    // ======================================================

    refundStatus: {
      type: String,
      enum: ['none', 'requested', 'processing', 'completed', 'rejected'],
      default: 'none'
    },

    refundAmount: {
      type: Number,
      default: 0 // supports partial refunds
    },

    refundRequestedAt: {
      type: Date
    },

    refundRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // customer or admin
    },

    refundProcessedAt: {
      type: Date
    },

    refundProcessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // admin only
    },

    refundReason: {
      type: String
    },

    stripeRefundId: {
      type: String
    },

    refundNote: {
      type: String
    }
  },
  { timestamps: true }
);

// Indexes — fast queries
paymentTransactionSchema.index({ paymentMethod: 1 });
paymentTransactionSchema.index({ status: 1 });
paymentTransactionSchema.index({ createdAt: -1 });
paymentTransactionSchema.index({ order: 1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
