// src/validation/schemas/paymentSchemas.js


const { query, param } = require('express-validator');
const mongoose = require('mongoose');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// ── RETRY PAYMENT (POST /payment/retry/:orderId) ──────────────────────────
exports.retryPayment = [
  param('orderId')
    .trim()
    .notEmpty().withMessage('orderId is required')
    .custom(isValidObjectId).withMessage('orderId must be a valid MongoDB ObjectId'),
];

// ── GET TRANSACTION HISTORY (GET /payment/history or /admin/history) ──────
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
    .isIn(['pending', 'paid', 'failed', 'refunded', 'partially_refunded'])
    .withMessage('Invalid status filter'),

  query('method')
    .optional()
    .isIn(['cash', 'card', 'easypaisa', 'jazzcash', 'bank', 'wallet'])
    .withMessage('Invalid payment method filter'),
];

module.exports = {
  retryPayment: exports.retryPayment,
  getTransactionHistory: exports.getTransactionHistory,
};