// src/validation/schemas/riderSchemas.js
const { body } = require('express-validator');

exports.updateLocation = [
  body('lat').isFloat({ min: 24, max: 37 }).withMessage('Valid Pakistan latitude'),
  body('lng').isFloat({ min: 60, max: 78 }).withMessage('Valid Pakistan longitude')
];

exports.updateOrderLocation = [
  body('lat').isFloat({ min: 24, max: 37 }),
  body('lng').isFloat({ min: 60, max: 78 })
];

exports.updateRiderStatus = [
  body('isAvailable').isBoolean().withMessage('isAvailable must be true/false')
];