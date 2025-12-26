// models/Wallet.js
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    /* =====================
       Currency & Status
    ====================== */
    currency: {
      type: String,
      enum: ['PKR'], // extend later if needed
      default: 'PKR',
    },

    status: {
      type: String,
      enum: ['active', 'frozen', 'closed'],
      default: 'active',
      index: true,
    },

    /* =====================
       Balances
    ====================== */
    balance: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: () => new mongoose.Types.Decimal128('0.00'),
    },

    lockedBalance: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => new mongoose.Types.Decimal128('0.00'),
    },

    /* =====================
       Lifetime Tracking
    ====================== */
    lifetimeCredits: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => new mongoose.Types.Decimal128('0.00'),
    },

    lifetimeDebits: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => new mongoose.Types.Decimal128('0.00'),
    },

    totalWithdrawn: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => new mongoose.Types.Decimal128('0.00'),
    },

    /* =====================
       Withdrawal Controls
    ====================== */
    lastWithdrawalAt: {
      type: Date,
      index: true,
    },

    withdrawalLimitDaily: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => new mongoose.Types.Decimal128('50000'), // PKR 50,000
    },

    minWithdrawalAmount: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => new mongoose.Types.Decimal128('500'), // PKR 500
    },

    /* =====================
       Metadata
    ====================== */
    lastTransactionAt: Date,
  },
  {
    timestamps: true,
    versionKey: 'version', 
  }
);

module.exports =
  mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);
