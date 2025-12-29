// src/validation/schemas/withdrawalSchemas.js
const { body, query, param } = require('express-validator');
const mongoose = require('mongoose');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// ── CREATE WITHDRAWAL REQUEST VALIDATION ─────────────────────────────────
exports.createWithdrawalRequest = [
  body('amount')
    .trim()
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number ≥ 0.01')
    .toFloat(),

  body('paymentMethod')
    .trim()
    .notEmpty().withMessage('Payment method is required')
    .isIn(['bank_transfer', 'easypaisa', 'jazzcash', 'cash_pickup'])
    .withMessage('Invalid payment method'),

  body('bankDetails')
    .if(body('paymentMethod').equals('bank_transfer'))
    .isObject().withMessage('bankDetails must be an object for bank_transfer')
    .custom((value) => {
      if (!value.bankName || !value.accountNumber || !value.accountTitle) {
        throw new Error('bankName, accountNumber, and accountTitle are required for bank transfer');
      }
      return true;
    }),

  body('mobileWalletNumber')
    .if(body('paymentMethod').isIn(['easypaisa', 'jazzcash']))
    .trim()
    .notEmpty().withMessage('Mobile wallet number is required for easypaisa/jazzcash')
    .isMobilePhone('any').withMessage('Invalid mobile wallet number format'),

  body('bankDetails')
    .if(body('paymentMethod').not().equals('bank_transfer'))
    .isEmpty().withMessage('bankDetails should not be provided for this payment method'),

  body('mobileWalletNumber')
    .if(body('paymentMethod').not().isIn(['easypaisa', 'jazzcash']))
    .isEmpty().withMessage('mobileWalletNumber should not be provided for this payment method'),
];

// ── PROCESS WITHDRAWAL (APPROVE/REJECT) VALIDATION ────────────────────────
exports.processWithdrawalRequest = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid withdrawal request ID'),

  body('action')
    .trim()
    .notEmpty().withMessage('Action is required')
    .isIn(['approve', 'reject']).withMessage('Action must be "approve" or "reject"'),

  body('note')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters'),

  body('referenceNumber')
    .optional()
    .trim()
    .isString()
    .isLength({ min: 4, max: 100 }).withMessage('Reference number must be 4-100 characters'),
];

// ── GET WITHDRAWAL HISTORY VALIDATION ─────────────────────────────────────
exports.getWithdrawalHistory = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be integer ≥ 1')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 5, max: 100 }).withMessage('Limit must be between 5 and 100')
    .toInt(),

  query('status')
    .optional()
    .isIn([
      'pending', 'processing', 'approved', 'rejected', 'completed', 'cancelled'
    ]).withMessage('Invalid status filter'),
];

module.exports = {
  createWithdrawalRequest: exports.createWithdrawalRequest,
  processWithdrawalRequest: exports.processWithdrawalRequest,
  getWithdrawalHistory: exports.getWithdrawalHistory,
};