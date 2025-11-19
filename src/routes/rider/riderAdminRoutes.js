// src/routes/admin/riderAdminRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const {
  getAllRiders,
  getRiderById,
  createRider,
  updateRider,
  deleteRider,
  updateRiderStatus,
  getRiderStats
} = require('../../controllers/rider/riderController');

const {
  createRider: createRiderSchema,
  updateRider: updateRiderSchema
} = require('../../validation/schemas/riderSchemas');

router.use(auth, role(['admin']));

router.get('/', getAllRiders);
router.get('/stats', getRiderStats);
router.get('/:id', getRiderById);
router.post('/', createRiderSchema, validate, createRider);
router.put('/:id', updateRiderSchema, validate, updateRider);
router.patch('/:id/status', validate, updateRiderStatus);
router.delete('/:id', deleteRider);

module.exports = router;