// src/validation/schemas/walletAdminSchemas.js


const { body, query, param } = require('express-validator');
const mongoose = require('mongoose');

// Reusable ObjectId validator
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// ── VIEW USER WALLET (GET /admin/wallet/user/:customerId) ────────────────
exports.getCustomerWallet = [
  param('customerId')
    .trim()
    .notEmpty().withMessage('customerId is required')
    .custom(isValidObjectId).withMessage('customerId must be valid MongoDB ObjectId'),
];

// ── ADJUST WALLET (POST /admin/wallet/adjust/:customerId) ────────────────
exports.adjustWallet = [
  param('customerId')
    .trim()
    .notEmpty().withMessage('customerId is required')
    .custom(isValidObjectId).withMessage('customerId must be valid MongoDB ObjectId'),

  body('amount')
    .trim()
    .notEmpty().withMessage('amount is required')
    .isFloat({ gt: 0 }).withMessage('amount must be a positive number')
    .toFloat(),

  body('type')
    .trim()
    .notEmpty().withMessage('type is required')
    .isIn(['credit', 'debit']).withMessage('type must be "credit" or "debit"'),

  body('reason')
    .trim()
    .notEmpty().withMessage('reason is required for audit trail')
    .isString()
    .isLength({ min: 10, max: 300 }).withMessage('reason must be 10–300 characters'),

  body('metadata')
    .optional()
    .isObject().withMessage('metadata must be a valid JSON object'),
];

// ── WALLET STATS DASHBOARD (GET /admin/wallet/stats) ─────────────────────
exports.getWalletStats = [
  query('period')
    .optional()
    .isIn(['today', '7d', '30d', '90d', 'all'])
    .withMessage('Invalid period. Allowed: today, 7d, 30d, 90d, all'),
];

module.exports = {
  getCustomerWallet: exports.getCustomerWallet,
  adjustWallet: exports.adjustWallet,
  getWalletStats: exports.getWalletStats,
};