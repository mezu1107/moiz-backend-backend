// src/routes/admin/refundAdminRoutes.js
// FINAL PRODUCTION — DECEMBER 19, 2025

const router = require('express').Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validateRequest = require('../../middleware/validate/validate');

const {
  getRefundRequests,
  processRefund,
} = require('../../controllers/admin/refundAdminController');

const {
  getRefundRequests: getValidation,
  processRefund: processValidation,
} = require('../../validation/schemas/refundSchemas');

// Protect all routes: Auth + Admin only
router.use(auth, role(['admin', 'finance'])); // Allow finance team too

// GET /api/admin/refunds/requests?status=requested&page=1&limit=20
router.get(
  '/requests',
  getValidation,
  validateRequest,
  getRefundRequests
);

// POST /api/admin/refunds/process/:transactionId
// Body: { "action": "approve" | "reject", "note": "optional note" }
router.post(
  '/process/:transactionId',
  processValidation,
  validateRequest,
  processRefund
);

module.exports = router;