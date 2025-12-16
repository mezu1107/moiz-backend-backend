const router = require('express').Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const {
  getIngredients,
  addStock,
  recordWaste,
  getStockHistory,
  createIngredient,
  updateIngredient,
  deleteIngredient
} = require('../../controllers/inventory/inventoryController');

const {
  addStock: addStockSchema,
  recordWaste: recordWasteSchema,
  getStockHistory: getStockHistorySchema,
  createIngredient: createIngredientSchema,
  updateIngredient: updateIngredientSchema,
  deleteIngredient: deleteIngredientSchema
} = require('../../validation/schemas/inventorySchemas');

// All inventory routes require auth + proper role
router.use(auth, role(['admin', 'kitchen', 'finance']));

// Public inventory routes
router.get('/ingredients', getIngredients);
router.get('/history', getStockHistorySchema, validate, getStockHistory);

// Stock operations (Admin + Kitchen)
router.post('/add', addStockSchema, validate, addStock);
router.post('/waste', recordWasteSchema, validate, recordWaste);

// Ingredient management (Admin only)
router.post('/ingredient', role('admin'), createIngredientSchema, validate, createIngredient);
router.put('/ingredient/:id', role('admin'), updateIngredientSchema, validate, updateIngredient);
router.delete('/ingredient/:id', role('admin'), deleteIngredientSchema, validate, deleteIngredient);

module.exports = router;
