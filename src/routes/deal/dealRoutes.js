// src/routes/deal/dealRoutes.js
const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');
const { dealSchemas } = require('../../validation/schemas');
const {
  getActiveDeals,
  createDeal,
  updateDeal,
  deleteDeal
} = require('../../controllers/deal/dealController');

// Public
router.get('/', getActiveDeals);

// Admin only
router.use(auth, role(['admin']));
router.post('/', dealSchemas.createDeal, validate, createDeal);
router.put('/:id', dealSchemas.updateDeal || [], validate, updateDeal);
router.delete('/:id', deleteDeal);

module.exports = router;