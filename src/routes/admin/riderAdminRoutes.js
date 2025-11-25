// src/routes/deal/dealRoutes.js
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
  permanentlyBanRider: banSchema
} = require('../../validation/schemas/riderSchemas');

router.use(auth, role('admin'));

router.get('/stats', getRiderStats);
router.get('/blocked', getBlockedRiders);
router.get('/permanently-banned', getPermanentlyBannedRiders);
router.get('/', getAllRiders);
router.get('/:id', getRiderById);

router.patch('/:id/status', statusSchema, validate, updateRiderStatus);
router.post('/:id/approve', approveRider);
router.post('/:id/reject', rejectRider);
router.post('/:id/promote-to-rider', promoteSchema, validate, promoteUserToRider);
router.patch('/:id/block', blockRider);
router.patch('/:id/unblock', unblockRider);
router.delete('/:id', softDeleteRider);
router.patch('/:id/restore', restoreRider);
router.post('/:id/permanent-ban', banSchema, validate, permanentlyBanRider);

module.exports = router;