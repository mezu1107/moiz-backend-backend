// src/validation/schemas/cartSchemas.js
// PRODUCTION-READY — JANUARY 09, 2026
// FIXED: Uses real mongoose ObjectId validation (accepts uppercase hex)
// No more false 400 errors on valid IDs

const { body, param } = require('express-validator');
const mongoose = require('mongoose'); // ← Critical import

const addToCartSchema = [
  body('menuItemId')
    .trim()
    .notEmpty().withMessage('menuItemId is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid menu item ID');
      }
      return true;
    }),

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
    .withMessage('Special instructions too long (max 300 characters)'),

  body('orderNote')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Order note too long (max 500 characters)'),
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
    .isLength({ max: 300 })
    .withMessage('Special instructions too long'),

  body('orderNote')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Order note too long'),
];

const cartItemParamSchema = [
  param('itemId')
    .trim()
    .notEmpty().withMessage('itemId is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid cart item ID');
      }
      return true;
    }),
];

module.exports = {
  addToCartSchema,
  updateCartItemSchema,
  cartItemParamSchema,
};