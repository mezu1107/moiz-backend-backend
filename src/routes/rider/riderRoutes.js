// src/routes/rider/riderRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const {
  updateLocation,
  toggleAvailability,
  updateOrderLocation,
  getMyOrders,
  getRiderProfile  // ← New clean function
} = require('../../controllers/rider/riderController');

const {
  updateLocation: updateLocationSchema,
  updateOrderLocation: updateOrderLocationSchema
} = require('../../validation/schemas/riderSchemas');

router.use(auth, role(['rider']));

router.patch('/location', updateLocationSchema, validate, updateLocation);
router.patch('/availability', toggleAvailability);
router.patch('/order/:id/location', updateOrderLocationSchema, validate, updateOrderLocation);
router.get('/me/orders', getMyOrders);
router.get('/me', getRiderProfile); 

module.exports = router;