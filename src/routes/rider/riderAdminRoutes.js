// src/routes/admin/riderAdminRoutes.js
const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const {
  getAllRiders,
  getRiderById,          // ← Now used
  updateRiderStatus,
  getRiderStats
} = require('../../controllers/rider/riderController');

const { updateRiderStatus: statusSchema } = require('../../validation/schemas/riderSchemas');

router.use(auth, role(['admin']));

// Admin Rider Management - FULL & COMPLETE
router.get('/', getAllRiders);                    // List all riders + search + filter
router.get('/stats', getRiderStats);              // Dashboard stats
router.get('/:id', getRiderById);                 // View single rider details ← CRITICAL
router.patch('/:id/status', statusSchema, validate, updateRiderStatus); // Approve/Reject

module.exports = router;