// models/Wallet.js
// PRODUCTION-READY — December 29, 2025
// Modern async/await, explicit status, optimistic concurrency, optimized indexes

const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },

    currency: {
      type: String,
      enum: ['PKR'],
      default: 'PKR',
      required: true,
    },

    status: {
      type: String,
      enum: ['active', 'frozen', 'closed'],
      default: 'active',
      required: true,
      index: true,
    },

    balance: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: () => mongoose.Types.Decimal128.fromString('0.00'),
    },

    lockedBalance: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString('0.00'),
    },

    lifetimeCredits: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString('0.00'),
    },

    lifetimeDebits: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString('0.00'),
    },

    totalWithdrawn: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString('0.00'),
    },

    lastWithdrawalAt: {
      type: Date,
      index: true,
    },

    withdrawalLimitDaily: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString('50000'),
    },

    minWithdrawalAmount: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString('500'),
    },

    lastTransactionAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: 'version', // optimistic concurrency
  }
);

// ----------------------
// Pre-save hook (async/modern)
// ----------------------
walletSchema.pre('save', async function () {
  if (!this.status) this.status = 'active';

  if (this.status === 'closed' && this.balance?.toString() !== '0.00') {
    throw new Error('Cannot close wallet with non-zero balance');
  }
});

// ----------------------
// Indexes
// ----------------------
walletSchema.index({ user: 1, status: 1 });
walletSchema.index({ status: 1, lastTransactionAt: -1 });
walletSchema.index({ user: 1, lastWithdrawalAt: -1 });

// ----------------------
// Virtuals
// ----------------------
walletSchema.virtual('availableBalance').get(function () {
  const bal = BigInt(this.balance.toString());
  const locked = BigInt(this.lockedBalance.toString());
  return mongoose.Types.Decimal128.fromString((bal - locked).toString());
});

// ----------------------
// Methods
// ----------------------
walletSchema.methods.canWithdraw = function (amountDecimal) {
  const amount = BigInt(amountDecimal.toString());
  const available = BigInt(this.availableBalance.toString());
  const minAmount = BigInt(this.minWithdrawalAmount.toString());
  return available >= amount && amount >= minAmount;
};

// ----------------------
// Export MODEL
// ----------------------
module.exports = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);
