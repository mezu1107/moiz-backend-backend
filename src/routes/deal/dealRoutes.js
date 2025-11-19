// src/routes/deal/dealRoutes.js
const express = require('express');
const router = express.Router();
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

router.get('/', getAllDeals);
router.get('/active', getActiveDeals);
router.get('/:id', getDealById);
router.post('/apply', auth, applyDealSchema, validate, applyDeal);

router.use(auth, role(['admin']));

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