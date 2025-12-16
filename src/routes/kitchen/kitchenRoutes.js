// src/routes/kitchen/kitchenRoutes.js
// FINAL PRODUCTION VERSION — FULLY SECURE KITCHEN API (DEC 2025)

const router = require('express').Router();
const { auth } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');
const { role } = require('../../middleware/role/role');

const {
  getKitchenOrders,
  startPreparingItem,
  completeItem
} = require('../../controllers/kitchen/kitchenController');

const {
  startItemSchema,
  completeItemSchema
} = require('../../validation/schemas/kitchenSchemas');

// PROTECT ALL KITCHEN ROUTES
// Only admin + kitchen staff allowed (admin has god mode via role middleware)
router.use(auth, role(['admin', 'kitchen']));

// ==================== ROUTES ====================

// GET: Fetch all active + stats (for kitchen display)
router.get('/orders', getKitchenOrders);

// POST: Start preparing a specific item
router.post(
  '/start-item',
  startItemSchema,
  validate,
  startPreparingItem
);

// POST: Mark item as ready (complete)
router.post(
  '/complete-item',
  completeItemSchema,
  validate,
  completeItem
);

module.exports = router;