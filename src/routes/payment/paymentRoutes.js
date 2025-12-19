// src/routes/payment/paymentRoutes.js
// FINAL PRODUCTION — DECEMBER 19, 2025

const router = require('express').Router();
const mongoose = require('mongoose');

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validateRequest = require('../../middleware/validate/validate');

const {
  handlePaymentFailure,
  retryPayment,
  getTransactionHistory,
} = require('../../controllers/payment/paymentController');

const {
  getTransactionHistory: historyValidation,
  retryPayment: retryValidation,
} = require('../../validation/schemas/paymentSchemas');

// ============================================================
// 🔐 ALL ROUTES REQUIRE AUTHENTICATION
// ============================================================
router.use(auth);

// ============================================================
// 👤 CUSTOMER ROUTES
// ============================================================

// GET /api/payment/history
// → Get own payment transaction history with pagination & filters
router.get(
  '/history',
  role('customer'),
  historyValidation,
  validateRequest,
  getTransactionHistory
);

// POST /api/payment/retry/:orderId
// → Retry a failed/pending card payment
router.post(
  '/retry/:orderId',
  role('customer'),
  retryValidation,
  validateRequest,
  retryPayment
);

// ============================================================
// 👑 ADMIN / FINANCE / SUPPORT ROUTES
// ============================================================

// GET /api/payment/history (Admin sees all)
// → Admins can view all transactions (no customer filter)
router.get(
  '/admin/history',
  role(['admin', 'finance', 'support']),
  historyValidation,
  validateRequest,
  getTransactionHistory
);

// Optional: Admin manual failure trigger (for testing/webhook fallback)
router.post(
  '/admin/failure/:orderId',
  role('admin'),
  (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid orderId' });
    }
    next();
  },
  async (req, res) => {
    const { reason = 'manual_failure', metadata = {} } = req.body;
    await handlePaymentFailure(req.params.orderId, reason, metadata);
    res.json({ success: true, message: 'Payment failure handled manually' });
  }
);

module.exports = router;