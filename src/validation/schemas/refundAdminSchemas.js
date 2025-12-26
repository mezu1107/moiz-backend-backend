// src/validation/schemas/refundAdminSchemas.js


const { query, param, body } = require('express-validator');
const mongoose = require('mongoose');

// Reusable ObjectId validator
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// ── LIST REFUND REQUESTS (GET /admin/refunds/requests) ────────────────────
exports.getRefundRequests = [
  query('status')
    .optional()
    .isIn(['all', 'requested', 'processing', 'completed', 'rejected'])
    .withMessage('Invalid status filter. Allowed: all, requested, processing, completed, rejected'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be >= 1')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
    .toInt(),
];

// ── PROCESS REFUND (POST /admin/refunds/process/:transactionId) ───────────
exports.processRefund = [
  param('transactionId')
    .trim()
    .notEmpty().withMessage('transactionId is required')
    .custom(isValidObjectId).withMessage('transactionId must be valid MongoDB ObjectId'),

  body('action')
    .trim()
    .notEmpty().withMessage('action is required')
    .isIn(['approve', 'reject']).withMessage('action must be "approve" or "reject"'),

  body('note')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 500 }).withMessage('note cannot exceed 500 characters'),
];

module.exports = {
  getRefundRequests: exports.getRefundRequests,
  processRefund: exports.processRefund,
};