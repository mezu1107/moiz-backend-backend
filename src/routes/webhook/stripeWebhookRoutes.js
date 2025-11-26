// src/routes/webhook/stripeWebhookRoutes.js
const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../../controllers/webhook/stripeWebhookController');


router.post('/', handleWebhook);

module.exports = router;


// stripe payment_intents confirm pi_3SXQe72NFfD80slA130y3w7y --payment-method pm_card_visa --return-url http://localhost:3000/success