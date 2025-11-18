// src/routes/area/areaRoutes.js
const express = require('express');
const router = express.Router();

const { getAreas, checkArea, addArea, setDeliveryZone } = require('../../controllers/area/areaController');
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');
const { areaSchemas } = require('../../validation/schemas');

// Public
router.get('/', getAreas);
router.get('/check', checkArea);

// Admin only
router.use(auth, role(['admin']));

router.post('/', areaSchemas.addArea, validate, addArea);
router.post('/delivery-zone', setDeliveryZone);  // ← THIS IS THE CORRECT PATH

module.exports = router;