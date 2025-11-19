// src/utils/stripe.js
const stripe = require('../config/stripe');

const stripeUtils = {
  createCustomer: async (user) => {
    return stripe.customers.create({
      email: user.email,
      phone: user.phone,
      name: user.name,
      metadata: { userId: user._id.toString() },
    });
  },

  createPaymentIntent: async (amount, currency = 'pkr', customerId, metadata = {}) => {
    return stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      customer: customerId,
      metadata,
      payment_method_types: ['card'],
    });
  },
};

module.exports = stripeUtils;