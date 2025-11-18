// src/routes/payment/paymentRoutes.js
const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');
const { paymentSchemas } = require('../../validation/schemas');
const { createPaymentIntent } = require('../../controllers/payment/paymentController');

router.post('/intent', auth, paymentSchemas.createPaymentIntent, validate, createPaymentIntent);

module.exports = router;