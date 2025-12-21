// src/models/payment/PaymentTransaction.js
// FINAL PRODUCTION — DECEMBER 19, 2025 — CLEAN & WARNING-FREE

const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'easypaisa', 'jazzcash', 'bank', 'wallet'],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    /**
     * External gateway transaction ID
     * (Stripe / Easypaisa / JazzCash / Bank)
     */
    transactionId: {
      type: String,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ================= REFUND =================
    refundStatus: {
      type: String,
      enum: ['none', 'requested', 'processing', 'completed', 'rejected'],
      default: 'none',
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
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

    stripeRefundId: String,

    // Legacy (kept intentionally)
    refundedAt: Date,
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// ===================== INDEXES =====================

// Order lookup
paymentTransactionSchema.index({ order: 1 });

// Payment state dashboards
paymentTransactionSchema.index({ paymentMethod: 1, status: 1 });
paymentTransactionSchema.index({ status: 1, createdAt: -1 });

// Refund workflows
paymentTransactionSchema.index({ refundStatus: 1, createdAt: -1 });

// External transaction uniqueness (NULL allowed)
paymentTransactionSchema.index(
  { transactionId: 1 },
  { unique: true, sparse: true }
);

module.exports =
  mongoose.models.PaymentTransaction ||
  mongoose.model('PaymentTransaction', paymentTransactionSchema);
