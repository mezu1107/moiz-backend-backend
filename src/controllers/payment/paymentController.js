// src/controllers/payment/paymentController.js
const stripe = require('../../config/stripe');
const StripeCustomer = require('../../models/stripeCustomer/StripeCustomer');
const Order = require('../../models/order/Order');

const createPaymentIntent = async (req, res) => {
  const { orderId } = req.body;
  const userId = req.user.id;

  try {
    const order = await Order.findOne({ _id: orderId, customer: userId });
    if (!order || order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Invalid or already paid order' });
    }

    let stripeCustomer = await StripeCustomer.findOne({ user: userId });
    if (!stripeCustomer) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
        phone: req.user.phone,
        metadata: { userId: userId.toString() }
      });
      stripeCustomer = new StripeCustomer({ user: userId, stripeCustomerId: customer.id });
      await stripeCustomer.save();
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(order.finalAmount * 100),
      currency: 'pkr',
      customer: stripeCustomer.stripeCustomerId,
      metadata: { orderId: order._id.toString() },
      automatic_payment_methods: { enabled: true }
    });

    order.paymentIntentId = intent.id;
    await order.save();

    res.json({ success: true, clientSecret: intent.client_secret });
  } catch (err) {
    console.error('createPaymentIntent error:', err);
    res.status(500).json({ success: false, message: 'Payment failed' });
  }
};

module.exports = { createPaymentIntent };