// src/routes/rider/riderDashboardRoutes.js
const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const { getRiderDashboard } = require('../../controllers/rider/riderDashboardController');

// Protect all routes
router.use(auth);
router.use(role('rider'));

// Only approved riders
router.use((req, res, next) => {
  if (req.user.riderStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Rider account not approved yet. Please wait for admin approval.'
    });
  }
  next();
});

// GET /api/rider/dashboard
router.get('/dashboard', getRiderDashboard);

module.exports = router;