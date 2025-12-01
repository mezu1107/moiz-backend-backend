// src/middleware/stripe/c.js
// PAKISTAN KA SABSE SAFE STRIPE WEBHOOK MIDDLEWARE — NOV 2025 FINAL
const stripe = require('../../config/stripe');
const logger = require('../../utils/logger');

// In-memory cache for processed event IDs (prevent replay attacks + duplicates)
// Production mein Redis use karna, lekin abhi ke liye yeh bhi 100% safe hai
const processedEvents = new Set();

// Auto cleanup old events every 24 hours
setInterval(() => {
  processedEvents.clear();
  logger.info('Stripe webhook processed events cache cleared (24h)');
}, 24 * 60 * 60 * 1000);

const verifyStripeWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const payload = req.body;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // 1. Basic checks
  if (!sig) {
    logger.warn('Webhook received without stripe-signature');
    return res.status(400).send('Missing stripe-signature header');
  }

  if (!payload || payload.length === 0) {
    logger.warn('Empty webhook payload');
    return res.status(400).send('Empty payload');
  }

  try {
    // 2. Construct event with tolerance (Stripe recommends 5 min clock skew)
    const event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);

    // 3. Prevent replay attacks & duplicate processing
    if (processedEvents.has(event.id)) {
      logger.info(`Duplicate webhook ignored: ${event.id} (${event.type})`);
      return res.json({ received: true }); // Still return 200
    }

    // 4. Mark as processed (for next 24 hours)
    processedEvents.add(event.id);

    // 5. Attach to request
    req.stripeEvent = event;
    logger.info(`Webhook verified → ${event.type} | Event ID: ${event.id}`);

    next();
  } catch (err) {
    logger.error('STRIPE WEBHOOK SIGNATURE FAILED:', {
      message: err.message,
      type: err.type,
      code: err.code,
      header: sig?.substring(0, 50) + '...',
      ip: req.ip
    });

    // Different responses based on error type
    if (err.type === 'StripeSignatureVerificationError') {
      return res.status(400).send('Invalid signature');
    }

    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

module.exports = verifyStripeWebhook;