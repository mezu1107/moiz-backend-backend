// src/routes/wallet/walletRoutes.js
// FINAL PRODUCTION — DECEMBER 19, 2025

const router = require('express').Router();
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
} = require('../../controllers/wallet/walletController');

const {
  adminCreditWallet: creditValidation,
  adminDebitWallet: debitValidation,
  exportTransactions: exportValidation,
} = require('../../validation/schemas/walletSchemas');

// ============================================================
// 🔐 ALL ROUTES REQUIRE AUTHENTICATION
// ============================================================
router.use(auth);

// ============================================================
// 👤 CUSTOMER ROUTES
// ============================================================

// GET /api/wallet/me
// → Get current balance + last 50 recent transactions
router.get('/me', role('customer'), getMyWallet);

// GET /api/wallet/transactions?page=1&limit=20
// → Paginated full transaction history
router.get('/transactions', role('customer'), getWalletTransactions);

// GET /api/wallet/export/csv
// → Export own transactions as CSV
router.get(
  '/export/csv',
  role('customer'),
  exportValidation,
  validateRequest,
  exportWalletTransactionsCSV
);

// GET /api/wallet/export/pdf
// → Export own transactions as PDF statement
router.get(
  '/export/pdf',
  role('customer'),
  exportValidation,
  validateRequest,
  exportWalletTransactionsPDF
);

// ============================================================
// 👑 ADMIN ONLY ROUTES
// ============================================================

// POST /api/wallet/admin/credit
router.post(
  '/admin/credit',
  role('admin'),
  creditValidation,
  validateRequest,
  adminCreditWallet
);

// POST /api/wallet/admin/debit
router.post(
  '/admin/debit',
  role('admin'),
  debitValidation,
  validateRequest,
  adminDebitWallet
);

// ============================================================
// 💼 ADMIN / FINANCE / SUPPORT — View & Export Any User's Wallet
// ============================================================

// GET /api/wallet/user/:userId
// → View any user's wallet balance & recent transactions
router.get(
  '/user/:userId',
  role(['admin', 'finance', 'support']),
  (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userId parameter',
      });
    }
    req.targetUserId = req.params.userId;
    next();
  },
  getMyWallet
);

// GET /api/wallet/admin/export/:userId/csv
// → Admin export any user's transactions as CSV
router.get(
  '/admin/export/:userId/csv',
  role(['admin', 'finance', 'support']),
  (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userId parameter',
      });
    }
    req.targetUserId = req.params.userId;
    next();
  },
  exportValidation,
  validateRequest,
  exportWalletTransactionsCSV
);

// GET /api/wallet/admin/export/:userId/pdf
// → Admin export any user's transactions as PDF
router.get(
  '/admin/export/:userId/pdf',
  role(['admin', 'finance', 'support']),
  (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userId parameter',
      });
    }
    req.targetUserId = req.params.userId;
    next();
  },
  exportValidation,
  validateRequest,
  exportWalletTransactionsPDF
);

module.exports = router;