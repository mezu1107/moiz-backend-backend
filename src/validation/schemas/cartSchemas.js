// src/validation/schemas/cartSchemas.js
// FIXED: Now correctly validates when only quantity is sent

const { body, param } = require('express-validator');

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

  body('sides').optional().isArray(),
  body('drinks').optional().isArray(),
  body('addOns').optional().isArray(),

  body('specialInstructions')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Special instructions too long'),

  body('orderNote')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Order note too long'),
];

const updateCartItemSchema = [
  // Ensure at least one field is provided
  body().custom((value, { req }) => {
    const fields = ['quantity', 'sides', 'drinks', 'addOns', 'specialInstructions', 'orderNote'];
    const hasField = fields.some(field => req.body[field] !== undefined);
    if (!hasField) {
      throw new Error('At least one field to update is required');
    }
    return true;
  }),

  body('quantity')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Quantity must be 0–50 (0 removes item)')
    .toInt(),

  body('sides').optional().isArray(),
  body('drinks').optional().isArray(),
  body('addOns').optional().isArray(),

  body('specialInstructions')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 300 }),

  body('orderNote')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 }),
];

const cartItemParamSchema = [
  param('itemId')
    .trim()
    .notEmpty().withMessage('itemId is required')
    .isMongoId().withMessage('Invalid cart item ID'),
];

module.exports = {
  addToCartSchema,
  updateCartItemSchema,
  cartItemParamSchema,
};