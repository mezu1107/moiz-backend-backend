// src/routes/webhook/stripeWebhookRoutes.js
const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../../controllers/webhook/stripeWebhookController');


router.post('/', handleWebhook);

module.exports = router;

