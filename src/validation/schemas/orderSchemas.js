// src/validation/schemas/orderSchemas.js
const { body } = require('express-validator');

const createOrder = [
  body('addressId')
    .trim()
    .isMongoId()
    .withMessage('Valid address ID is required'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),

  body('items.*.menuItem')
    .isMongoId()
    .withMessage('Valid menu item ID required'),

  body('items.*.quantity')
    .isInt({ min: 1, max: 50 })
    .toInt()
    .withMessage('Quantity must be between 1 and 50'),

  // Payment method validation (supports all)
  body('paymentMethod')
    .optional()
    .isIn(['cod', 'cash', 'card', 'easypaisa', 'jazzcash', 'bank'])
    .withMessage('Invalid payment method'),

  // Promo code optional
  body('promoCode')
    .optional()
    .trim()
    .isString()
];

const updateStatus = [
  body('status')
    .isIn(['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'rejected'])
    .withMessage('Invalid status')
];

const assignRider = [
  body('riderId')
    .isMongoId()
    .withMessage('Valid rider ID is required'),
];

const rejectOrder = [
  body('reason')
    .optional()
    .isString()
    .trim(),
  body('note')
    .optional()
    .isString()
    .trim(),
];

module.exports = {
  createOrder,
  updateStatus,
  assignRider,
  rejectOrder
};
