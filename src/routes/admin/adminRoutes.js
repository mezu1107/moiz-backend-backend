const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const {
  addArea,
  updateArea,
  getAllAreasWithZones,
  getAreaById,
  deleteArea,
  toggleAreaActive,
  toggleDeliveryZone,
  updateDeliveryZone,
  deleteDeliveryZone,
} = require('../../controllers/admin/adminController');

const { addArea: addAreaSchema, updateArea: updateAreaSchema } = require('../../validation/schemas/areaSchemas');

// ====================== MIDDLEWARE ======================
// Use reference to auth middleware (do NOT call it)
router.use(auth);
router.use(role(['admin', 'superadmin']));

// ====================== AREA ROUTES ======================
router.post('/area', addAreaSchema, validate, addArea);
router.put('/area/:id', updateAreaSchema, validate, updateArea);
router.get('/areas', getAllAreasWithZones);
router.get('/area/:id', getAreaById);
router.delete('/area/:id', deleteArea);

// ====================== DELIVERY ZONE ROUTES ======================
router.patch('/area/:id/toggle-active', toggleAreaActive);
router.patch('/delivery-zone/:areaId/toggle', toggleDeliveryZone);
router.put('/delivery-zone/:areaId', updateDeliveryZone);
router.delete('/delivery-zone/:areaId', deleteDeliveryZone);

module.exports = router;
