const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../../controllers/webhook/stripeWebhookController');
const verifyStripeWebhook = require('../../middleware/stripe/verifyStripeWebhook');

// This route receives RAW body — crucial for signature verification
router.post(
  '/',
  express.raw({ type: 'application/json' }), // Only here — not globally
  verifyStripeWebhook,
  handleWebhook
);

module.exports = router;