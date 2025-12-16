// src/models/wallet/WalletTransaction.js
const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  type: {
    type: String,
    enum: ['credit', 'debit', 'refund', 'bonus', 'referral', 'adjustment'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

walletTransactionSchema.index({ wallet: 1, createdAt: -1 });
walletTransactionSchema.index({ order: 1 });
walletTransactionSchema.index({ type: 1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);