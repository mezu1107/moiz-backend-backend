
// src/validation/schemas/paymentSchemas.js
// FINAL PRODUCTION — DECEMBER 19, 2025

const { query, param, body} = require('express-validator');


exports.createPaymentIntent = [
  body('orderId').isMongoId()
];

/**
 * Validation for getTransactionHistory
 */
exports.getTransactionHistory = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
    .toInt(),

  query('status')
    .optional()
    .isIn(['pending', 'paid', 'failed', 'refunded'])
    .withMessage('Invalid status'),

  query('method')
    .optional()
    .isIn(['cash', 'card', 'easypaisa', 'jazzcash', 'bank', 'wallet'])
    .withMessage('Invalid payment method'),
];

/**
 * Validation for retryPayment param
 */
exports.retryPayment = [
  param('orderId')
    .trim()
    .notEmpty().withMessage('orderId is required')
    .isMongoId().withMessage('orderId must be a valid MongoDB ObjectId'),
];

module.exports = {
  getTransactionHistory: exports.getTransactionHistory,
  retryPayment: exports.retryPayment,
};