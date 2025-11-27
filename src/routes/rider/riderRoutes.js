// src/routes/rider/riderRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const controller = require('../../controllers/rider/riderController');
const schema = require('../../validation/schemas/riderSchemas');

const requireApprovedRider = (req, res, next) => {
  if (req.user.riderStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Rider account not approved yet'
    });
  }
  next();
};

// APPROVED RIDER ROUTES
router.patch('/location', auth, role('rider'), requireApprovedRider, schema.updateLocation, validate, controller.updateLocation);
router.patch('/availability', auth, role('rider'), requireApprovedRider, controller.toggleAvailability);
router.patch('/order/:id/location', auth, role('rider'), requireApprovedRider, schema.updateOrderLocation, validate, controller.updateOrderLocation);
router.get('/orders', auth, role('rider'), requireApprovedRider, controller.getMyOrders);
router.get('/profile', auth, role('rider'), requireApprovedRider, controller.getRiderProfile);

// PUBLIC (ANY LOGGED-IN USER) ROUTES
router.post('/apply', auth, schema.applyAsRider, validate, controller.applyAsRider);
router.get('/application-status', auth, controller.getApplicationStatus);

module.exports = router;