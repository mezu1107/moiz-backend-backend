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
  toggleDeliveryZone, // ← ADD THIS
} = require('../../controllers/admin/adminController');

const { addArea: addAreaSchema, updateArea: updateAreaSchema } = require('../../validation/schemas/areaSchemas');
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

// Protect all routes
router.use(auth, role('admin'));

// Area Management
router.post('/area', addAreaSchema, validate, addArea);
router.get('/areas', getAllAreasWithZones);
router.get('/area/:id', getAreaById);
router.put('/area/:id', updateAreaSchema, validate, updateArea);
router.delete('/area/:id', deleteArea);
router.patch('/area/:id/toggle-active', toggleAreaActive);        // inService toggle

// Delivery Zone Management
router.put('/delivery-zone/:areaId', updateDeliveryZone);         // Full update
router.delete('/delivery-zone/:areaId', deleteDeliveryZone);
router.patch('/delivery-zone/:areaId/toggle', toggleDeliveryZone); // hasDeliveryZone toggle

module.exports = router;