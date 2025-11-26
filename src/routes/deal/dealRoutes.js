// src/routes/deal/dealRoutes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const {
  getAllDeals,
  getActiveDeals,
  getDealById,           // ← Keep this
  createDeal,
  updateDeal,
  deleteDeal,
  toggleDealStatus,
  applyDeal,
  getDealAnalytics,      // ← These come FIRST now
  getSingleDealStats,
  getDealUsageChart,
  getTopDealsChart,
  getDiscountImpactChart
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

// ========================
// PUBLIC ROUTES
// ========================
router.get('/active', getActiveDeals);

// ========================
// AUTHENTICATED ROUTES
// ========================
router.post('/apply', auth, applyDealLimiter, applyDealSchema, validate, applyDeal);

// ========================
// ADMIN ROUTES (Protected)
// ========================
router.use(auth, role(['admin']));

// ADMIN: Analytics & Charts FIRST (so they don't get caught by :id)
router.get('/analytics', getDealAnalytics);
router.get('/stats/:id', getSingleDealStats);
router.get('/chart/usage', getDealUsageChart);
router.get('/chart/top', getTopDealsChart);
router.get('/chart/impact', getDiscountImpactChart);

// ADMIN: CRUD
router.get('/', getAllDeals);
router.post('/', createDealSchema, validate, createDeal);
router.put('/:id', updateDealSchema, validate, updateDeal);
router.delete('/:id', deleteDeal);
router.patch('/:id/toggle', toggleDealStatusSchema, validate, toggleDealStatus);

// GET SINGLE DEAL — MUST BE LAST!
router.get('/:id', getDealById);  // ← Now safe — won't catch /analytics

module.exports = router;