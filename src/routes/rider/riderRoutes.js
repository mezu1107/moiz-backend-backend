// src/routes/rider/riderRoutes.js
const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const controller = require('../../controllers/rider/riderController');
const schema = require('../../validation/schemas/riderSchemas');

// Only approved riders can perform delivery actions
const requireApprovedRider = (req, res, next) => {
  if (req.user.role !== 'rider' || req.user.riderStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only approved riders can perform this action.',
    });
  }
  next();
};

// ==================== APPROVED RIDER ROUTES ====================
router.patch(
  '/location',
  auth,
  role('rider'),
  requireApprovedRider,
  schema.updateLocation,
  validate,
  controller.updateLocation
);

router.patch(
  '/availability',
  auth,
  role('rider'),
  requireApprovedRider,
  controller.toggleAvailability
);

router.patch(
  '/order/:id/location',
  auth,
  role('rider'),
  requireApprovedRider,
  schema.updateOrderLocation,
  validate,
  controller.updateOrderLocation
);

router.get('/orders', auth, role('rider'), requireApprovedRider, controller.getMyOrders);
router.get('/profile', auth, role('rider'), requireApprovedRider, controller.getRiderProfile);
router.get('/current-order', auth, role('rider'), requireApprovedRider, controller.getCurrentOrder);

// Order Actions
router.patch(
  '/orders/:id/accept',
  auth,
  role('rider'),
  requireApprovedRider,
  schema.acceptOrder,
  validate,
  controller.acceptOrder
);

router.patch(
  '/orders/:id/reject',
  auth,
  role('rider'),
  requireApprovedRider,
  schema.rejectOrder,
  validate,
  controller.rejectOrder
);

router.patch(
  '/orders/:id/pickup',
  auth,
  role('rider'),
  requireApprovedRider,
  schema.pickupOrder,
  validate,
  controller.pickupOrder
);

router.patch(
  '/orders/:id/deliver',
  auth,
  role('rider'),
  requireApprovedRider,
  schema.deliverOrder,
  validate,
  controller.deliverOrder
);

router.patch(
  '/orders/:id/collect-cash',
  auth,
  role('rider'),
  requireApprovedRider,
  schema.collectCash,
  validate,
  controller.collectCash
);

// ==================== PUBLIC (Any logged-in user) ====================
router.post('/apply', auth, schema.applyAsRider, validate, controller.applyAsRider);
router.get('/application-status', auth, controller.getApplicationStatus);

module.exports = router;