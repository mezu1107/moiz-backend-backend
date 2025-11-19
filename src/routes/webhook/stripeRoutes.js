const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../../controllers/webhook/stripeWebhookController');
const verifyStripeWebhook = require('../../middleware/stripe/verifyStripeWebhook');

router.post(
  '/',
  express.raw({ type: 'application/json' }), // CRITICAL: Raw body for signature
  verifyStripeWebhook,                        // Verifies Stripe signature
  handleWebhook                               // Processes payment success/failure
);

module.exports = router;