const stripe = require('../../config/stripe');

const verifyStripeWebhook = (req, res, next) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.log('Missing stripe-signature header');
    return res.status(400).send('Missing Stripe signature');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body, // This must be raw buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    req.stripeEvent = event;
    next();
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

module.exports = verifyStripeWebhook;