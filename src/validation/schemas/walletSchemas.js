// src/validation/schemas/walletSchemas.js
const { body, query, param } = require('express-validator');
const mongoose = require('mongoose');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// ── ADMIN CREDIT VALIDATION ──────────────────────────────────────────────
exports.adminCreditWallet = [
  body('userId')
    .trim()
    .notEmpty().withMessage('userId is required')
    .custom(isValidObjectId).withMessage('userId must be a valid MongoDB ObjectId'),

  body('amount')
    .trim()
    .notEmpty().withMessage('amount is required')
    .isFloat({ min: 0.01 }).withMessage('amount must be a positive number ≥ 0.01')
    .toFloat(),

  body('description')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 500 }).withMessage('description max 500 characters'),

  body('metadata')
    .optional()
    .isObject().withMessage('metadata must be an object')
];

// ── ADMIN DEBIT VALIDATION ───────────────────────────────────────────────
exports.adminDebitWallet = [
  body('userId')
    .trim()
    .notEmpty().withMessage('userId is required')
    .custom(isValidObjectId).withMessage('userId must be a valid MongoDB ObjectId'),

  body('amount')
    .trim()
    .notEmpty().withMessage('amount is required')
    .isFloat({ min: 0.01 }).withMessage('amount must be a positive number ≥ 0.01')
    .toFloat(),

  body('description')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 500 }).withMessage('description max 500 characters'),

  body('metadata')
    .optional()
    .isObject().withMessage('metadata must be an object')
];

// ── EXPORT TRANSACTIONS VALIDATION (CSV & PDF) ────────────────────────────
exports.exportTransactions = [
  query('fromDate')
    .optional()
    .isISO8601({ strict: true }).withMessage('fromDate must be valid ISO date')
    .toDate(),

  query('toDate')
    .optional()
    .isISO8601({ strict: true }).withMessage('toDate must be valid ISO date')
    .toDate()
    .custom((value, { req }) => {
      if (req.query.fromDate && new Date(value) <= new Date(req.query.fromDate)) {
        throw new Error('toDate must be after fromDate');
      }
      return true;
    }),

  query('type')
    .optional()
    .trim()
    .isIn([
      'credit', 'debit', 'adjustment', 'refund', 'bonus',
      'referral', 'withdrawal', 'cashback'
    ]).withMessage('Invalid transaction type')
];

module.exports = {
  adminCreditWallet: exports.adminCreditWallet,
  adminDebitWallet: exports.adminDebitWallet,
  exportTransactions: exports.exportTransactions,
};