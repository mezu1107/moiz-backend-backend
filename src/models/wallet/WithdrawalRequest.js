// src/models/wallet/WithdrawalRequest.js
const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true
  },

  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    min: 0
  },

  status: {
    type: String,
    enum: ['pending', 'processing', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },

  requestedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  processedAt: Date,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'easypaisa', 'jazzcash', 'cash_pickup'],
    required: true
  },

  // Sensitive fields - should be encrypted in real production
  bankDetails: {
    bankName: String,
    accountTitle: String,
    accountNumber: String, // encrypt!
    iban: String,
    branchCode: String
  },

  mobileWalletNumber: String,

  referenceNumber: String,
  rejectionReason: String,
  adminNote: String,

  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Important indexes for performance
withdrawalRequestSchema.index({ status: 1, requestedAt: -1 });
withdrawalRequestSchema.index({ user: 1, status: 1, requestedAt: -1 });
withdrawalRequestSchema.index({ processedAt: -1 });
withdrawalRequestSchema.index({ processedBy: 1 });

module.exports = mongoose.models.WithdrawalRequest ||
  mongoose.model('WithdrawalRequest', withdrawalRequestSchema);