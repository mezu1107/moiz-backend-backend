// src/routes/deal/dealRoutes.js
// FINAL — 100% CORRECT & LIVE

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const { auth, optionalAuth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const {
  getAllDeals,
  getActiveDeals,
  getDealById,        // ← THIS IS THE CORRECT NAME
  createDeal,
  updateDeal,
  deleteDeal,
  toggleDealStatus,
  applyDeal,
  getDealAnalytics,
  getSingleDealStats,
  getDealUsageChart,
  getTopDealsChart
} = require('../../controllers/deal/dealController');

const {
  createDeal: createDealSchema,
  updateDeal: updateDealSchema,
  applyDeal: applyDealSchema,
  toggleDealStatus: toggleDealStatusSchema
} = require('../../validation/schemas/dealSchemas');

const applyDealLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many attempts. Try again later.' }
});

// PUBLIC
router.get('/active', getActiveDeals);
router.get('/:id', getDealById); // ← NOW CORRECT: getDealById

// AUTH + RATE LIMIT
router.post('/apply', optionalAuth, applyDealLimiter, applyDealSchema, validate, applyDeal);

// ADMIN ONLY
router.use(auth, role('admin'));

// ADMIN: Analytics first
router.get('/analytics', getDealAnalytics);
router.get('/stats/:id', getSingleDealStats);
router.get('/chart/usage', getDealUsageChart);
router.get('/chart/top', getTopDealsChart);

// ADMIN: CRUD
router.get('/', getAllDeals);
router.post('/', createDealSchema, validate, createDeal);
router.put('/:id', updateDealSchema, validate, updateDeal);
router.delete('/:id', deleteDeal);
router.patch('/:id/toggle', toggleDealStatusSchema, validate, toggleDealStatus);

module.exports = router;