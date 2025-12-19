// src/validation/schemas/walletSchemas.js
// FINAL PRODUCTION — DECEMBER 19, 2025

const { body } = require('express-validator');

/**
 * Validation for admin wallet credit
 */
exports.adminCreditWallet = [
  body('userId')
    .trim()
    .notEmpty().withMessage('userId is required')
    .isMongoId().withMessage('userId must be a valid MongoDB ObjectId'),

  body('amount')
    .trim()
    .notEmpty().withMessage('amount is required')
    .isFloat({ gt: 0 }).withMessage('amount must be a positive number')
    .toFloat(),

  body('type')
    .optional()
    .trim()
    .isIn(['credit', 'bonus', 'referral', 'refund', 'adjustment'])
    .withMessage('Invalid type. Allowed: credit, bonus, referral, refund, adjustment'),

  body('description')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 500 }).withMessage('description cannot exceed 500 characters'),

  body('metadata')
    .optional()
    .isObject().withMessage('metadata must be a valid JSON object'),
];

/**
 * Validation for admin wallet debit
 */
exports.adminDebitWallet = [
  body('userId')
    .trim()
    .notEmpty().withMessage('userId is required')
    .isMongoId().withMessage('userId must be a valid MongoDB ObjectId'),

  body('amount')
    .trim()
    .notEmpty().withMessage('amount is required')
    .isFloat({ gt: 0 }).withMessage('amount must be a positive number')
    .toFloat(),

  body('description')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 500 }).withMessage('description cannot exceed 500 characters'),

  body('metadata')
    .optional()
    .isObject().withMessage('metadata must be a valid JSON object'),
];

/**
 * Validation for wallet transaction export (CSV/PDF)
 * Used in query params: ?fromDate=...&toDate=...&type=...
 */
exports.exportTransactions = [
  body('fromDate')
    .optional()
    .isISO8601({ strict: true }).withMessage('fromDate must be a valid ISO date (e.g., 2025-01-01)')
    .toDate(),

  body('toDate')
    .optional()
    .isISO8601({ strict: true }).withMessage('toDate must be a valid ISO date')
    .toDate()
    .custom((value, { req }) => {
      if (req.body.fromDate && value < req.body.fromDate) {
        throw new Error('toDate cannot be earlier than fromDate');
      }
      return true;
    }),

  body('type')
    .optional()
    .trim()
    .isIn(['credit', 'debit', 'refund', 'bonus', 'referral', 'adjustment'])
    .withMessage('Invalid transaction type'),
];

module.exports = {
  adminCreditWallet: exports.adminCreditWallet,
  adminDebitWallet: exports.adminDebitWallet,
  exportTransactions: exports.exportTransactions,
};