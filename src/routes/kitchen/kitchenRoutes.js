// FINAL PRODUCTION VERSION — FULLY SECURE KITCHEN API (DEC 2025)

const router = require('express').Router();
const { auth } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');
const { role } = require('../../middleware/role/role');

const {
  getKitchenOrders,
  startPreparingItem,
  completeItem,
  completeOrder // ✅ IMPORT WAS MISSING
} = require('../../controllers/kitchen/kitchenController');

const {
  startItemSchema,
  completeItemSchema,
  completeOrderSchema
} = require('../../validation/schemas/kitchenSchemas');

// ==================== SECURITY ====================
// Only admin + kitchen staff allowed
router.use(auth, role(['admin', 'kitchen']));

// ==================== ROUTES ====================

// GET: Fetch all kitchen orders + stats
router.get('/orders', getKitchenOrders);

// POST: Start preparing a specific item
router.post(
  '/start-item',
  startItemSchema,
  validate,
  startPreparingItem
);

// POST: Mark item as ready
router.post(
  '/complete-item',
  completeItemSchema,
  validate,
  completeItem
);

// POST: Mark entire order as completed (served/delivered)
router.post(
  '/complete-order',
  completeOrderSchema,
  validate,
  completeOrder
);

module.exports = router;
