// src/routes/admin/refundAdminRoutes.js


const express = require('express');
const router = express.Router();

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
} = require('../../validation/schemas/refundAdminSchemas');

// Protect all routes: Auth + Admin/Finance role only
router.use(auth, role(['admin', 'finance']));

// GET /api/admin/refunds/requests
// List all refund requests (paginated + filtered)
router.get(
  '/requests',
  getValidation,
  validateRequest,
  getRefundRequests
);

// POST /api/admin/refunds/process/:transactionId
// Process refund: approve or reject
router.post(
  '/process/:transactionId',
  processValidation,
  validateRequest,
  processRefund
);

module.exports = router;