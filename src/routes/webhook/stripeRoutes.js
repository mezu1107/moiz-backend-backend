// src/routes/webhook/stripeWebhookRoutes.js
const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../../controllers/webhook/stripeWebhookController');
const verifyStripeWebhook = require('../../middleware/stripe/verifyStripeWebhook');

// CRITICAL: Must use raw body parser BEFORE middleware
router.post(
  '/',
  express.raw({ type: 'application/json' }), 
  verifyStripeWebhook,
  handleWebhook
);

module.exports = router;