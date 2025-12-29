// models/wallet/WalletTransaction.js
// FINAL PRODUCTION VERSION — December 29, 2025

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
      index: true,
    },

    type: {
      type: String,
      enum: [
        'credit',
        'debit',
        'refund',
        'bonus',
        'referral',
        'adjustment',
        'adjustment_credit',
        'adjustment_debit',
        'withdrawal',
        'cashback',
      ],
      required: true,
      index: true,
    },

    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      min: 0,
    },

    balanceAfter: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    // toJSON cleanup
    toJSON: {
      transform: (doc, ret) => {
        if (ret.amount) ret.amount = Number(ret.amount.toString());
        if (ret.balanceAfter) ret.balanceAfter = Number(ret.balanceAfter.toString());
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Optimized indexes
walletTransactionSchema.index({ wallet: 1, createdAt: -1 });
walletTransactionSchema.index({ wallet: 1, type: 1, createdAt: -1 });
walletTransactionSchema.index({ order: 1 });
walletTransactionSchema.index({ createdBy: 1, createdAt: -1 });
walletTransactionSchema.index({ type: 1, createdAt: -1 });

// Export the MODEL
module.exports =
  mongoose.models.WalletTransaction ||
  mongoose.model('WalletTransaction', walletTransactionSchema);