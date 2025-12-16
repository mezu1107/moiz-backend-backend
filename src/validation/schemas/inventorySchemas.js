const { body, query, param } = require('express-validator');

// ======================
// ADD / PURCHASE STOCK
// ======================
exports.addStock = [
  body('ingredientId')
    .isMongoId()
    .withMessage('Valid ingredient ID is required'),

  body('quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be a positive number')
    .toFloat(),

  body('costPerUnit')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Cost per unit must be a positive number')
    .toFloat(),

  body('note')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Note cannot exceed 200 characters')
];

// ======================
// RECORD WASTE / ADJUSTMENT
// ======================
exports.recordWaste = [
  body('ingredientId')
    .isMongoId()
    .withMessage('Valid ingredient ID is required'),

  body('quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be a positive number')
    .toFloat(),

  body('note')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Note cannot exceed 200 characters')
];

// ======================
// GET STOCK HISTORY
// ======================
exports.getStockHistory = [
  query('ingredientId')
    .optional()
    .isMongoId()
    .withMessage('Invalid ingredient ID'),

  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
    .toInt()
];

// ======================
// CREATE NEW INGREDIENT (ADMIN ONLY)
// ======================
exports.createIngredient = [
  body('name')
    .notEmpty().withMessage('Ingredient name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .trim()
    .escape(),

  body('category')
    .optional()
    .isIn(['meat', 'vegetables', 'spices', 'dairy', 'grains', 'oil', 'packaging', 'other'])
    .withMessage('Invalid category'),

  body('unit')
    .optional()
    .isIn(['kg', 'gram', 'liter', 'ml', 'piece', 'packet', 'bottle', 'dozen'])
    .withMessage('Invalid unit'),

  body('lowStockThreshold')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Threshold must be a positive number')
    .toFloat(),

  body('costPerUnit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost per unit must be a positive number')
    .toFloat(),

  body('supplier')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Supplier name too long')
];

// ======================
// UPDATE INGREDIENT
// ======================
exports.updateIngredient = [
  param('id')
    .isMongoId()
    .withMessage('Valid ingredient ID required'),

  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .trim()
    .escape(),

  body('category')
    .optional()
    .isIn(['meat', 'vegetables', 'spices', 'dairy', 'grains', 'oil', 'packaging', 'other'])
    .withMessage('Invalid category'),

  body('unit')
    .optional()
    .isIn(['kg', 'gram', 'liter', 'ml', 'piece', 'packet', 'bottle', 'dozen'])
    .withMessage('Invalid unit'),

  body('lowStockThreshold')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Threshold must be a positive number')
    .toFloat(),

  body('costPerUnit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost per unit must be a positive number')
    .toFloat(),

  body('supplier')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
];

// ======================
// DELETE / DEACTIVATE INGREDIENT
// ======================
exports.deleteIngredient = [
  param('id')
    .isMongoId()
    .withMessage('Valid ingredient ID required')
];

module.exports = {
  addStock: exports.addStock,
  recordWaste: exports.recordWaste,
  getStockHistory: exports.getStockHistory,
  createIngredient: exports.createIngredient,
  updateIngredient: exports.updateIngredient,
  deleteIngredient: exports.deleteIngredient
};
