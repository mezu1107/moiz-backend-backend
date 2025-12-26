// src/routes/admin/paymentAdminRoutes.js

const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validateRequest = require('../../middleware/validate/validate');

const {
  getPaymentsDashboard,
  exportPaymentsToExcel,
} = require('../../controllers/admin/paymentAdminController');

const {
  getPaymentsDashboard: dashboardValidation,
  exportPayments: exportValidation,
} = require('../../validation/schemas/paymentAdminSchemas');

// ── ALL ROUTES REQUIRE AUTH + ADMIN/FINANCE ROLE ──────────────────────────
router.use(auth, role(['admin', 'finance']));

// GET /api/admin/payments/dashboard
// Payments overview dashboard (summary, trends, methods, refunds)
router.get(
  '/dashboard',
  dashboardValidation,
  validateRequest,
  getPaymentsDashboard
);

// GET /api/admin/payments/export-excel
// Export all payments to Excel (full dataset)
router.get(
  '/export-excel',
  exportValidation,
  validateRequest,
  exportPaymentsToExcel
);

module.exports = router;