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
  getDealById,
  createDeal,
  updateDeal,
  deleteDeal,
  toggleDealStatus,
  applyDeal,
  getDealAnalytics,
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

// Rate limit: 20 attempts per 15 mins per IP (prevents brute force)
const applyDealLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please try again later.'
  }
});

// Public routes
router.get('/active', getActiveDeals);
router.get('/:id', getDealById);

// Authenticated + rate-limited
router.post('/apply', auth, applyDealLimiter, applyDealSchema, validate, applyDeal);

// Admin-only routes (protected after this point)
router.use(auth, role(['admin']));

router.get('/', getAllDeals);
router.post('/', createDealSchema, validate, createDeal);
router.put('/:id', updateDealSchema, validate, updateDeal);
router.delete('/:id', deleteDeal);
router.patch('/:id/toggle', toggleDealStatusSchema, validate, toggleDealStatus);

router.get('/analytics', getDealAnalytics);
router.get('/stats/:id', getSingleDealStats);
router.get('/chart/usage', getDealUsageChart);
router.get('/chart/top', getTopDealsChart);
router.get('/chart/impact', getDiscountImpactChart);

module.exports = router;