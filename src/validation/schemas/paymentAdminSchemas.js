// src/validation/schemas/paymentAdminSchemas.js
// LAST UPDATED: DECEMBER 26, 2025 — STRICT & FLEXIBLE

const { query } = require('express-validator');

// ── PAYMENTS DASHBOARD (GET /admin/payments/dashboard) ───────────────────
exports.getPaymentsDashboard = [
  query('period')
    .optional()
    .isIn(['today', '7d', '30d', '90d'])
    .withMessage('Invalid period. Allowed: today, 7d, 30d, 90d (default: 7d)'),

  query('method')
    .optional()
    .isIn(['cash', 'card', 'wallet', 'easypaisa', 'jazzcash', 'bank', 'all'])
    .withMessage('Invalid payment method. Allowed: cash, card, wallet, easypaisa, jazzcash, bank, all'),

  query('status')
    .optional()
    .isIn(['pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'all'])
    .withMessage('Invalid status filter'),
];

// ── EXPORT PAYMENTS TO EXCEL (GET /admin/payments/export-excel) ──────────
exports.exportPayments = [
  // Optional filters (not yet implemented in controller, but ready for future)
  query('fromDate')
    .optional()
    .isISO8601({ strict: true }).withMessage('fromDate must be valid ISO date (YYYY-MM-DD)'),

  query('toDate')
    .optional()
    .isISO8601({ strict: true }).withMessage('toDate must be valid ISO date')
    .custom((value, { req }) => {
      if (req.query.fromDate && new Date(value) < new Date(req.query.fromDate)) {
        throw new Error('toDate cannot be earlier than fromDate');
      }
      return true;
    }),

  query('method')
    .optional()
    .isIn(['cash', 'card', 'wallet', 'easypaisa', 'jazzcash', 'bank'])
    .withMessage('Invalid method filter for export'),
];

module.exports = {
  getPaymentsDashboard: exports.getPaymentsDashboard,
  exportPayments: exports.exportPayments,
};