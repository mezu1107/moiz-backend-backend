// src/routes/admin/adminRoutes.js
const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');
const { areaSchemas } = require('../../validation/schemas');

const {
  addMenuItem,
  addArea,
  setDeliveryZone
} = require('../../controllers/admin/adminController');
const {
getAnalytics
} = require('../../controllers/admin/analyticsController');
// ====================== ADMIN ONLY ======================
router.use(auth);
router.use(role(['admin'])); // Only admin can access these routes

// Menu Management
router.post('/menu', addMenuItem);

// Area & Delivery Zones
router.post('/area', areaSchemas.addArea, validate, addArea);
router.post('/delivery-zone', setDeliveryZone);
// In admin routes
router.get('/analytics', getAnalytics);
module.exports = router;