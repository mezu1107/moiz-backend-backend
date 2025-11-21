// src/validation/schemas/cartSchemas.js
const { body, param } = require('express-validator');

exports.addToCart = [
  body('menuItemId')
    .isMongoId()
    .withMessage('Invalid menu item ID'),

  body('quantity')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Quantity must be 1–50')
    .toInt()
];

exports.cartItemParam = [
  param('itemId')
    .isMongoId()
    .withMessage('Invalid cart item ID')
];