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
  getRiderProfile
} = require('../../controllers/rider/riderController');

const riderSchemas = require('../../validation/schemas/riderSchemas');

// Protect all routes
router.use(auth, role(['rider']));

// Block non-approved riders
router.use((req, res, next) => {
  if (req.user.riderStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Your rider account is not approved yet'
    });
  }
  next();
});

// RIDER ENDPOINTS — FULLY VALIDATED
router.patch('/location', riderSchemas.updateLocation, validate, updateLocation);

router.patch('/availability', toggleAvailability); // No body needed

router.patch(
  '/order/:id/location',
  riderSchemas.updateOrderLocation,
  validate,
  updateOrderLocation
);

router.get('/orders', getMyOrders);
router.get('/profile', getRiderProfile);

module.exports = router;