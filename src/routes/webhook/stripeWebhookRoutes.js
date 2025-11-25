// src/routes/webhook/stripeWebhookRoutes.js
const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../../controllers/webhook/stripeWebhookController');

// NO VERIFICATION IN TESTING MODE — DIRECT HANDLE
// Production mein server.js khud handle karega
router.post('/', handleWebhook);

module.exports = router;