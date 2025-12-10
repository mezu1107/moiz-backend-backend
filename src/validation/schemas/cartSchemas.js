// src/validation/schemas/cartSchemas.js
const { body, param } = require('express-validator');

/**
 * POST /api/cart
 */
exports.addToCartSchema = [
  body('menuItemId')
    .trim()
    .notEmpty().withMessage('menuItemId is required')
    .isMongoId().withMessage('Invalid menu item ID'),

  body('quantity')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Quantity must be 1–50')
    .toInt()
];

/**
 * PATCH /api/cart/item/:itemId
 * quantity = 0 → remove item (smart delete)
 */
exports.updateQuantitySchema = [
  body('quantity')
    .notEmpty().withMessage('quantity is required')
    .isInt({ min: 0, max: 50 })
    .withMessage('quantity must be 0–50 (0 removes item)')
    .toInt()
];

/**
 * Used for both PATCH and DELETE /item/:itemId
 */
exports.cartItemParamSchema = [
  param('itemId')
    .trim()
    .notEmpty().withMessage('itemId is required')
    .isMongoId().withMessage('Invalid cart item ID')
];

module.exports = exports;