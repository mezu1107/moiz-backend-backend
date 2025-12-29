// src/routes/wallet/walletRoutes.js
// FINAL PRODUCTION READY — DECEMBER 26, 2025

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validateRequest = require('../../middleware/validate/validate');

const {
  getMyWallet,
  getWalletTransactions,
  adminCreditWallet,
  adminDebitWallet,
  exportWalletTransactionsCSV,
  exportWalletTransactionsPDF,
  initializeWalletAdmin,
  activateWalletAdmin,
  // getWalletStatsDashboard, // implement later
} = require('../../controllers/wallet/walletController');

const {
  adminCreditWallet: creditValidation,
  adminDebitWallet: debitValidation,
  exportTransactions: exportValidation,
} = require('../../validation/schemas/walletSchemas');

// ────────────────────────────────────────────────
// Helper: Validate MongoDB ObjectId
// ────────────────────────────────────────────────
const validateObjectId = (field = 'userId', location = 'params') => (req, res, next) => {
  const id = location === 'body' ? req.body[field] : req.params[field];
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

// ── USER ROUTES (own wallet) ──────────────────────────────────────────────

// GET /api/wallet/me → own wallet + recent 50 transactions
router.get('/me', getMyWallet);

// GET /api/wallet/transactions → paginated own transactions
router.get('/transactions', getWalletTransactions);

// GET /api/wallet/export/:format → export own transactions (csv | pdf)
router.get(
  '/export/:format',
  exportValidation,
  validateRequest,
  (req, res, next) => {
    const format = req.params.format.toLowerCase();
    if (!['csv', 'pdf'].includes(format)) {
      return res.status(400).json({ success: false, message: 'Invalid export format' });
    }
    req.exportFormat = format;
    next();
  },
  (req, res, next) => {
    if (req.exportFormat === 'csv') return exportWalletTransactionsCSV(req, res, next);
    if (req.exportFormat === 'pdf') return exportWalletTransactionsPDF(req, res, next);
  }
);

// ── ADMIN / FINANCE / SUPPORT ROUTES ──────────────────────────────────────

// GET /api/wallet/user/:userId → view any user's wallet
router.get(
  '/user/:userId',
  role(['admin', 'finance', 'support']),
  validateObjectId('userId'),
  (req, res, next) => {
    req.targetUserId = req.params.userId;
    next();
  },
  getMyWallet
);

// POST /api/wallet/admin/credit → credit any user
router.post(
  '/admin/credit',
  role(['admin', 'finance']),
  validateObjectId('userId', 'body'),
  creditValidation,
  validateRequest,
  adminCreditWallet
);

// POST /api/wallet/admin/debit → debit any user
router.post(
  '/admin/debit',
  role(['admin', 'finance']),
  validateObjectId('userId', 'body'),
  debitValidation,
  validateRequest,
  adminDebitWallet
);
// POST /api/wallet/admin/activate/:userId → activate wallet (set status to active)
router.post(
  '/admin/activate/:userId',
  role(['admin', 'finance']),
  validateObjectId('userId'),
  activateWalletAdmin
);
// src/routes/wallet/walletRoutes.js
router.post(
  '/admin/initialize/:userId',
  role(['admin', 'finance']),
  validateObjectId('userId'),
  initializeWalletAdmin
);
// GET /api/wallet/admin/export/:userId/:format → export any user's wallet (csv | pdf)
router.get(
  '/admin/export/:userId/:format',
  role(['admin', 'finance', 'support']),
  validateObjectId('userId'),
  (req, res, next) => {
    req.targetUserId = req.params.userId;

    const format = req.params.format.toLowerCase();
    if (!['csv', 'pdf'].includes(format)) {
      return res.status(400).json({ success: false, message: 'Invalid export format' });
    }
    req.exportFormat = format;
    next();
  },
  exportValidation,
  validateRequest,
  (req, res, next) => {
    if (req.exportFormat === 'csv') return exportWalletTransactionsCSV(req, res, next);
    if (req.exportFormat === 'pdf') return exportWalletTransactionsPDF(req, res, next);
  }
);



module.exports = router;
