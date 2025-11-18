// src/routes/rider/riderRoutes.js
const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');
const { riderSchemas } = require('../../validation/schemas');
const {
  updateLocation,
  toggleAvailability,
  updateOrderLocation
} = require('../../controllers/rider/riderController');

router.use(auth, role(['rider']));

router.patch('/location', riderSchemas.updateLocation, validate, updateLocation);
router.patch('/availability', toggleAvailability);
router.patch('/order/:id/location', riderSchemas.updateOrderLocation, validate, updateOrderLocation);

module.exports = router;