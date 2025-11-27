// src/routes/admin/riderAdminRoutes.js
const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const {
  getAllRiders,
  getRiderById,
  updateRiderStatus,
  getRiderStats,
  approveRider,
  rejectRider,
  promoteUserToRider,
  blockRider,
  unblockRider,
  softDeleteRider,
  restoreRider,
  permanentlyBanRider,
  getBlockedRiders,
  getPermanentlyBannedRiders
} = require('../../controllers/admin/riderAdminController');

const {
  updateRiderStatus: statusSchema,
  promoteUserToRider: promoteSchema,
  permanentlyBanRider: banSchema,
  rejectRider: rejectSchema
} = require('../../validation/schemas/riderSchemas');

// ========== ALL ROUTES PROTECTED: ADMIN ONLY ==========
router.use(auth, role('admin'));

// Dashboard & Stats
router.get('/stats', getRiderStats);
router.get('/blocked', getBlockedRiders);
router.get('/permanently-banned', getPermanentlyBannedRiders);

// List & Details
router.get('/', getAllRiders);
router.get('/:id', getRiderById);

// ========== RIDER APPLICATION ACTIONS (PATCH is Standard) ==========
router.patch('/:id/approve', approveRider);                    // APPROVE
router.patch('/:id/reject', rejectSchema, validate, rejectRider); // REJECT

// Force promote any user (VIP / internal)
router.post('/:id/promote-to-rider', promoteSchema, validate, promoteUserToRider);

// ========== RIDER ACCOUNT MANAGEMENT ==========
router.patch('/:id/status', statusSchema, validate, updateRiderStatus);

router.patch('/:id/block', blockRider);
router.patch('/:id/unblock', unblockRider);

router.delete('/:id', softDeleteRider);
router.patch('/:id/restore', restoreRider);

router.post('/:id/permanent-ban', banSchema, validate, permanentlyBanRider);

module.exports = router;