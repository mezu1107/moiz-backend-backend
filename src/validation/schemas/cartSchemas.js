const { body, param } = require('express-validator');

/**
 * POST /api/cart - Add item with optional customizations
 */
const addToCartSchema = [
  body('menuItemId')
    .trim()
    .notEmpty().withMessage('menuItemId is required')
    .isMongoId().withMessage('Invalid menu item ID'),

  body('quantity')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Quantity must be between 1 and 50')
    .toInt(),

  // Optional arrays of strings (predefined + custom)
  body('sides')
    .optional()
    .isArray()
    .withMessage('sides must be an array')
    .custom((arr) => arr.every(item => typeof item === 'string' && item.trim().length > 0))
    .withMessage('Each side must be a non-empty string'),

  body('drinks')
    .optional()
    .isArray()
    .withMessage('drinks must be an array')
    .custom((arr) => arr.every(item => typeof item === 'string' && item.trim().length > 0))
    .withMessage('Each drink must be a non-empty string'),

  body('addOns')
    .optional()
    .isArray()
    .withMessage('addOns must be an array')
    .custom((arr) => arr.every(item => typeof item === 'string' && item.trim().length > 0))
    .withMessage('Each add-on must be a non-empty string'),

  body('specialInstructions')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Special instructions cannot exceed 300 characters'),

  body('orderNote')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Order note cannot exceed 500 characters')
];

/**
 * PATCH /api/cart/item/:itemId
 * Allow updating any field: quantity, customizations, or global orderNote
 * At least one field must be provided
 */
const updateCartItemSchema = [
  body()
    .custom((value, { req }) => {
      const updatableFields = [
        'quantity',
        'sides',
        'drinks',
        'addOns',
        'specialInstructions',
        'orderNote'
      ];
      const hasField = updatableFields.some(field => req.body[field] !== undefined);
      if (!hasField) throw new Error('At least one field must be provided to update');
      return true;
    }),

  body('quantity')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Quantity must be 0–50 (0 removes the item)')
    .toInt(),

  body('sides')
    .optional()
    .isArray()
    .custom((arr) => arr.every(item => typeof item === 'string' && item.trim().length > 0))
    .withMessage('Each side must be a non-empty string'),

  body('drinks')
    .optional()
    .isArray()
    .custom((arr) => arr.every(item => typeof item === 'string' && item.trim().length > 0))
    .withMessage('Each drink must be a non-empty string'),

  body('addOns')
    .optional()
    .isArray()
    .custom((arr) => arr.every(item => typeof item === 'string' && item.trim().length > 0))
    .withMessage('Each add-on must be a non-empty string'),

  body('specialInstructions')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Special instructions cannot exceed 300 characters'),

  body('orderNote')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Order note cannot exceed 500 characters')
];

/**
 * Shared param validation for :itemId routes
 */
const cartItemParamSchema = [
  param('itemId')
    .trim()
    .notEmpty().withMessage('itemId is required')
    .isMongoId().withMessage('Invalid cart item ID')
];

module.exports = {
  addToCartSchema,
  updateCartItemSchema,
  cartItemParamSchema
};