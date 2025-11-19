// src/validation/schemas/paymentSchemas.js
const { body } = require('express-validator');

exports.createPaymentIntent = [
  body('orderId').isMongoId()
];