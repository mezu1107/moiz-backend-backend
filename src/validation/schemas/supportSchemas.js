// src/validation/schemas/supportSchemas.js
const { body } = require('express-validator');

exports.createTicket = [
  body('orderId')
    .optional()
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('subject')
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 100 })
    .trim(),

  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 1000 })
    .trim(),

  body('images')
    .optional()
    .isArray({ max: 5 })
];

exports.replyTicket = [
  body('message')
    .notEmpty()
    .withMessage('Reply message required')
    .isLength({ max: 1000 })
    .trim()
];