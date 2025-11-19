// src/validation/schemas/orderSchemas.js


const { body } = require('express-validator');

const createOrder = [
  body('addressId').trim().isMongoId().withMessage('Valid address ID is required'),
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.menuItem').isMongoId().withMessage('Valid menu item ID required'),
  body('items.*.quantity').isInt({ min: 1, max: 50 }).toInt().withMessage('Quantity must be 1–50'),
  body('paymentMethod').optional().isIn(['cash', 'card']).withMessage('Invalid payment method'),
  body('promoCode').optional().trim().isLength({ min: 3, max: 20 })
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Promo code must be uppercase letters/numbers only')
];

const updateStatus = [
  body('status')
    .isIn(['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'rejected'])
    .withMessage('Invalid order status')
];

const assignRider = [
  body('riderId').isMongoId().withMessage('Valid rider ID is required')
];

const rejectOrder = [
  body('reason').optional().trim().isLength({ max: 100 }).withMessage('Reason too long'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Note too long')
];

module.exports = {
  createOrder,
  updateStatus,
  assignRider,
  rejectOrder
};