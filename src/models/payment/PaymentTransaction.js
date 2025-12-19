// src/models/payment/PaymentTransaction.js
// FINAL PRODUCTION — DECEMBER 19, 2025 — OPTIMIZED & INDEXED

const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema(
  {
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
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true
    },

    transactionId: {
      type: String,
      sparse: true // allows null/undefined uniquely
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // Refund Fields
    refundStatus: {
      type: String,
      enum: ['none', 'requested', 'processing', 'completed', 'rejected'],
      default: 'none',
      index: true
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    refundRequestedAt: Date,
    refundRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    refundProcessedAt: Date,
    refundProcessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    refundReason: String,
    refundNote: String,

    stripeRefundId: String,

    // Legacy fields (kept for backward compatibility)
    refundedAt: Date,
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Compound indexes for common queries
paymentTransactionSchema.index({ refundStatus: 1, createdAt: -1 });
paymentTransactionSchema.index({ paymentMethod: 1, status: 1 });
paymentTransactionSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
paymentTransactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);