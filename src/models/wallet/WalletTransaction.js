// 3. WalletTransaction.js
// Recommended: time-series collection + better categorization

const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
      index: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      sparse: true,
    },

    type: {
      type: String,
      enum: [
        'credit',           // normal top-up, refund to wallet
        'debit',            // order payment
        'refund',           // order cancelled/refunded to wallet
        'bonus',            // promo/referral
        'referral',         // referral reward
        'adjustment',       // admin manual
        'withdrawal',       // rider cash out (future)
        'cashback',         // future loyalty
      ],
      required: true,
    },

    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    balanceAfter: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    description: String,

    metadata: mongoose.Schema.Types.Mixed,

    // Who triggered (very important for audit)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true, // can be system
    },

    // For time-series optimization (MongoDB 7+ recommended)
  },
  {
    timestamps: true,
    // If you use MongoDB 7+ → change to time-series collection:
    // timeseries: {
    //   timeField: 'createdAt',
    //   metaField: 'wallet',
    //   granularity: 'minutes'
    // }
  }
);

// Indexes
walletTransactionSchema.index({ wallet: 1, createdAt: -1 });
walletTransactionSchema.index({ order: 1 });
walletTransactionSchema.index({ type: 1, createdAt: -1 });
walletTransactionSchema.index({ createdBy: 1, createdAt: -1 }); // audit

module.exports = mongoose.models.WalletTransaction ||
  mongoose.model('WalletTransaction', walletTransactionSchema);