const mongoose = require('mongoose');

const stripeCustomerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  stripeCustomerId: { type: String, required: true, unique: true },
  defaultPaymentMethod: String
}, { timestamps: true });

// unique: true already creates indexes — no manual index needed
module.exports = mongoose.model('StripeCustomer', stripeCustomerSchema);