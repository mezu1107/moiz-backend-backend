// src/routes/area/areaRoutes.js
const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const {
  getAreas,
  checkArea,
  addArea,
  setDeliveryZone
} = require('../../controllers/area/areaController');

const {
  addArea: addAreaSchema,
  checkAreaQuery
} = require('../../validation/schemas/areaSchemas');

// Public routes
router.get('/', getAreas);
router.get('/check', checkAreaQuery, validate, checkArea); // ← NOW VALIDATED!

// Admin-only routes
router.use(auth, role(['admin']));

router.post('/', addAreaSchema, validate, addArea);
router.post('/delivery-zone', setDeliveryZone);

module.exports = router;