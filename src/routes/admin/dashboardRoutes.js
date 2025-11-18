// src/routes/admin/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const { getDashboardStats } = require('../../controllers/admin/dashboardController');

router.use(auth, role(['admin']));
router.get('/stats', getDashboardStats);

module.exports = router;