// src/routes/payment/paymentRoutes.js


const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validateRequest = require('../../middleware/validate/validate');

const {
  retryPayment,
  getTransactionHistory,
  handlePaymentFailure, // Exposed only for admin/testing
} = require('../../controllers/payment/paymentController');

const {
  retryPayment: retryValidation,
  getTransactionHistory: historyValidation,
} = require('../../validation/schemas/paymentSchemas');

// Custom middleware: Validate MongoDB ObjectId in params
const validateObjectId = (paramName = 'orderId') => (req, res, next) => {
  const id = req.params[paramName];
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${paramName}: must be a valid MongoDB ObjectId`,
    });
  }
  next();
};

// ── ALL ROUTES REQUIRE AUTHENTICATION ─────────────────────────────────────
router.use(auth);

// ── CUSTOMER ROUTES ───────────────────────────────────────────────────────

// POST /api/payment/retry/:orderId
// Retry failed/pending card payment
router.post(
  '/retry/:orderId',
  validateObjectId(),
  role('customer'),
  retryValidation,
  validateRequest,
  retryPayment
);

// GET /api/payment/history
// Customer's own payment transaction history
router.get(
  '/history',
  role('customer'),
  historyValidation,
  validateRequest,
  getTransactionHistory
);

// ── ADMIN / FINANCE / SUPPORT ROUTES ──────────────────────────────────────

// GET /api/payment/admin/history
// Admin view of all payment transactions (no customer filter)
router.get(
  '/admin/history',
  role(['admin', 'finance', 'support']),
  historyValidation,
  validateRequest,
  getTransactionHistory
);

// POST /api/payment/admin/failure/:orderId
// Manual trigger payment failure (admin/testing only)
router.post(
  '/admin/failure/:orderId',
  validateObjectId(),
  role('admin'),
  async (req, res) => {
    const { reason = 'manual_failure', metadata = {} } = req.body;
    await handlePaymentFailure(req.params.orderId, reason, metadata);
    res.json({
      success: true,
      message: 'Payment failure handled successfully (manual trigger)',
    });
  }
);

module.exports = router;