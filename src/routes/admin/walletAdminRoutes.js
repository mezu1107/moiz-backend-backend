// src/routes/admin/walletAdminRoutes.js
// LAST UPDATED: DECEMBER 26, 2025 — SECURE, ROLE-PROTECTED, VALIDATED

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validateRequest = require('../../middleware/validate/validate');

const {
  getCustomerWallet,
  adjustWallet,
  getWalletStatsDashboard,
} = require('../../controllers/admin/walletAdminController');

const {
  getCustomerWallet: getWalletValidation,
  adjustWallet: adjustValidation,
  getWalletStats: statsValidation,
} = require('../../validation/schemas/walletAdminSchemas');

// Custom middleware: Validate MongoDB ObjectId in params
const validateObjectId = (paramName = 'customerId') => (req, res, next) => {
  const id = req.params[paramName];
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${paramName}: must be a valid MongoDB ObjectId`,
    });
  }
  next();
};

// ── ALL ROUTES REQUIRE AUTH + ADMIN/FINANCE/SUPPORT ROLE ─────────────────
router.use(auth, role(['admin', 'finance', 'support']));

// GET /api/admin/wallet/user/:customerId
// View any user's wallet + recent 50 transactions
router.get(
  '/user/:customerId',
  validateObjectId(),
  getWalletValidation,
  validateRequest,
  getCustomerWallet
);

// POST /api/admin/wallet/adjust/:customerId
// Credit or Debit any user's wallet (with audit log)
router.post(
  '/adjust/:customerId',
  validateObjectId(),
  adjustValidation,
  validateRequest,
  adjustWallet
);

// GET /api/admin/wallet/stats
// Dashboard stats: total balances, withdrawals, top users, etc.
router.get(
  '/stats',
  statsValidation,
  validateRequest,
  getWalletStatsDashboard
);

module.exports = router;