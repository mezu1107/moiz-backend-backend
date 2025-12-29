// src/models/auditLog/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'wallet_credit',
      'wallet_debit',
      'wallet_adjustment',
      'withdrawal_request',
      'withdrawal_approved',
      'withdrawal_rejected',
      'withdrawal_completed',
      'order_payment',
      'order_refund_to_wallet',
      'admin_wallet_operation',
      'wallet_initialized_by_admin',
    ]
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },

  role: String,

  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    sparse: true
  },

  targetModel: {
    type: String,
    sparse: true,
    enum: [
      'Wallet',
      'WalletTransaction',
      'WithdrawalRequest',
      'Order',
      'PaymentTransaction'
    ]
  },

  amount: mongoose.Schema.Types.Decimal128,
  before: mongoose.Schema.Types.Mixed,
  after: mongoose.Schema.Types.Mixed,

  ipAddress: String,
  userAgent: String,

  description: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);