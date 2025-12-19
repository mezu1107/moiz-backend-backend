// src/validation/schemas/refundSchemas.js
// FINAL PRODUCTION — DECEMBER 19, 2025

const { query, param, body } = require('express-validator');

exports.getRefundRequests = [
  query('status')
    .optional()
    .isIn(['all', 'requested', 'processing', 'completed', 'rejected'])
    .withMessage('Invalid status filter'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be >= 1')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100')
    .toInt(),
];

exports.processRefund = [
  param('transactionId')
    .trim()
    .notEmpty().withMessage('transactionId is required')
    .isMongoId().withMessage('Invalid transactionId'),

  body('action')
    .trim()
    .isIn(['approve', 'reject'])
    .withMessage('action must be "approve" or "reject"'),

  body('note')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 500 }).withMessage('note too long'),
];

module.exports = {
  getRefundRequests: exports.getRefundRequests,
  processRefund: exports.processRefund,
};