// src/models/stripeCustomer/StripeCustomer.js
const mongoose = require('mongoose');

const stripeCustomerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  stripeCustomerId: { type: String, required: true, unique: true },
  defaultPaymentMethod: String
}, { timestamps: true });

module.exports = mongoose.model('StripeCustomer', stripeCustomerSchema);