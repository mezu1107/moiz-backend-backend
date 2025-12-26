// 4. StripeCustomer.js (enhanced)
const mongoose = require('mongoose');

const stripeCustomerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  stripeCustomerId: {
    type: String,
    required: true,
    unique: true,
  },

  defaultPaymentMethod: String,        // pm_xxx

  // Very useful for support & fraud prevention
  setupIntentStatus: String,
  lastFour: String,
  cardBrand: String,
  expiryMonth: Number,
  expiryYear: Number,

  // For future saved cards (multiple)
  paymentMethods: [{
    id: String,
    last4: String,
    brand: String,
    isDefault: Boolean,
    created: Date,
  }],

}, { timestamps: true });

stripeCustomerSchema.index({ user: 1, 'paymentMethods.id': 1 });

module.exports = mongoose.models.StripeCustomer ||
  mongoose.model('StripeCustomer', stripeCustomerSchema);