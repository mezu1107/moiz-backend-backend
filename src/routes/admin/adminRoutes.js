// src/routes/admin/adminRoutes.js
const express = require('express');
const router = express.Router();

const {
  addArea,
  updateArea,
  getAllAreasWithZones,
  getAreaById,
  deleteArea,
  toggleAreaActive,
  updateDeliveryZone,
  deleteDeliveryZone,
} = require('../../controllers/admin/adminController');

const { addArea: addAreaSchema, updateArea: updateAreaSchema } = require('../../validation/schemas/areaSchemas');
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

// Protect all admin routes
router.use(auth, role('admin'));

// ==================== AREA MANAGEMENT ====================
router.post('/area', addAreaSchema, validate, addArea);
router.get('/areas', getAllAreasWithZones);                    // Best for Admin Panel
router.get('/area/:id', getAreaById);
router.put('/area/:id', updateAreaSchema, validate, updateArea);
router.delete('/area/:id', deleteArea);
router.put('/area/:id/toggle-active', toggleAreaActive);       // Quick on/off switch

// ==================== DELIVERY ZONE MANAGEMENT ====================
router.put('/delivery-zone/:areaId', updateDeliveryZone);      // UPSERT (create or update)
router.delete('/delivery-zone/:areaId', deleteDeliveryZone);

module.exports = router;