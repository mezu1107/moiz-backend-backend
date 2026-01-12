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
  getPermanentlyBannedRiders,
  assignOrderToRider,
  getAvailableRiders,
} = require('../../controllers/admin/riderAdminController');

const schema = require('../../validation/schemas/riderSchemas');

// Admin only
router.use(auth, role('admin'));

// Dashboard Stats
router.get('/stats', getRiderStats);
router.get('/blocked', getBlockedRiders);
router.get('/permanently-banned', getPermanentlyBannedRiders);
// Available Riders (for order assignment)
router.get('/available', getAvailableRiders);
// List & Details
router.get('/', getAllRiders);
router.get('/:id', schema.validateRiderId, validate, getRiderById);

// Application Flow
router.patch('/:id/approve', schema.validateRiderId, validate, approveRider);
router.patch(
  '/:id/reject',
  schema.validateRiderId,
  validate,
  schema.rejectRider,
  validate,
  rejectRider
);

// VIP Promotion
router.post(
  '/:id/promote-to-rider',
  schema.validateRiderId,
  validate,
  schema.promoteUserToRider,
  validate,
  promoteUserToRider
);

// Rider Management
router.patch(
  '/:id/status',
  schema.validateRiderId,
  validate,
  schema.updateRiderStatus,
  validate,
  updateRiderStatus
);

router.patch(
  '/:id/block',
  schema.validateRiderId,
  validate,
  schema.blockRider,
  validate,
  blockRider
);

router.patch('/:id/unblock', schema.validateRiderId, validate, unblockRider);
router.delete('/:id/soft-delete', schema.validateRiderId, validate, softDeleteRider);
router.patch('/:id/restore', schema.validateRiderId, validate, restoreRider);

router.post(
  '/:id/permanent-ban',
  schema.validateRiderId,
  validate,
  schema.permanentlyBanRider,
  validate,
  permanentlyBanRider
);

// Manual Order Assignment
router.patch(
  '/:orderId/assign-rider',
  schema.assignOrderToRider,
  validate,
  assignOrderToRider
);

module.exports = router;