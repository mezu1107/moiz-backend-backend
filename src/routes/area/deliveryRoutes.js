// src/routes/area/deliveryRoutes.js

const express = require('express');
const router = express.Router();

const { calculateDeliveryFee } = require('../../controllers/admin/adminController');

// Public endpoint - no auth required
router.post('/calculate', calculateDeliveryFee);

module.exports = router;