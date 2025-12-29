// src/routes/wallet/withdrawalRoutes.js
// PRODUCTION READY — December 29, 2025
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validateRequest = require('../../middleware/validate/validate');

const {
  createWithdrawalRequest,
  getPendingWithdrawals,
  processWithdrawal,
  getMyWithdrawalHistory,
} = require('../../controllers/wallet/withdrawalController');

const {
  createWithdrawalRequest: createRequestValidation,
  processWithdrawalRequest: processValidation,
  getWithdrawalHistory: historyValidation,
} = require('../../validation/schemas/withdrawalSchemas');

// Helper: Validate MongoDB ObjectId in params
const validateObjectId = (field = 'id') => (req, res, next) => {
  const id = req.params[field];
  if (id && !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${field}: must be a valid MongoDB ObjectId`,
    });
  }
  next();
};

// All routes require authentication
router.use(auth);

// ── RIDER / USER ROUTES ───────────────────────────────────────────────────

// POST /api/wallet/withdrawals/request
// Create new withdrawal request
router.post(
  '/request',
  createRequestValidation,
  validateRequest,
  createWithdrawalRequest
);

// GET /api/wallet/withdrawals/my-history
// Get own withdrawal history (paginated + filtered)
router.get(
  '/my-history',
  historyValidation,
  validateRequest,
  getMyWithdrawalHistory
);

// ── ADMIN / FINANCE ROUTES ────────────────────────────────────────────────

// GET /api/wallet/withdrawals/pending
// List all pending withdrawal requests (admin view)
router.get(
  '/pending',
  role(['admin', 'finance']),
  getPendingWithdrawals
);

// PATCH /api/wallet/withdrawals/:id/process
// Approve or Reject withdrawal request
router.patch(
  '/:id/process',
  role(['admin', 'finance']),
  validateObjectId('id'),
  processValidation,
  validateRequest,
  processWithdrawal
);

module.exports = router;