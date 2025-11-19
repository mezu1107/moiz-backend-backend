// src/routes/area/areaRoutes.js
const express = require('express');
const router = express.Router();
const { getAreas, checkArea, addArea, setDeliveryZone } = require('../../controllers/area/areaController');
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');
const { addArea: addAreaSchema } = require('../../validation/schemas/areaSchemas');

router.get('/', getAreas);
router.get('/check', checkArea);

router.use(auth, role(['admin']));
router.post('/', addAreaSchema, validate, addArea);
router.post('/delivery-zone', setDeliveryZone);

module.exports = router;