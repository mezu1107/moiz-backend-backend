const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balance: {
      type: mongoose.Schema.Types.Decimal128,
      default: '0.00',
      min: 0,
    },
    lifetimeCredits: {
      type: mongoose.Schema.Types.Decimal128,
      default: '0.00',
    },
  },
  { timestamps: true }
);

walletSchema.index({ user: 1 });

module.exports = mongoose.model('Wallet', walletSchema);