// src/routes/admin/paymentAdminRoutes.js
// FINAL PRODUCTION — DECEMBER 19, 2025

const router = require('express').Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');

const {
  getPaymentsDashboard,
  exportPaymentsToExcel,
} = require('../../controllers/admin/paymentAdminController');

// Protect all routes: Auth + Admin only
router.use(auth, role(['admin', 'finance'])); // Allow finance role too

// GET /api/admin/payments/dashboard?period=7d&method=card&status=paid
router.get('/dashboard', getPaymentsDashboard);

// GET /api/admin/payments/export-excel
router.get('/export-excel', exportPaymentsToExcel);

module.exports = router;