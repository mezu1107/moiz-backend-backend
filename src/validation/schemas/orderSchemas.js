// src/validation/schemas/orderSchemas.js
const { body } = require('express-validator');

// ====================== CUSTOMER ORDER ======================
const createOrder = [
  body('addressId')
    .isMongoId()
    .withMessage('Valid address ID required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.menuItem')
    .isMongoId()
    .withMessage('Valid menu item ID required'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 50 })
    .withMessage('Quantity must be between 1 and 50')
    .toInt(),
  body('paymentMethod')
    .optional()
    .isIn(['cod', 'card', 'easypaisa', 'jazzcash', 'bank'])
    .withMessage('Invalid payment method'),
  body('promoCode')
    .optional()
    .trim()
];

// ====================== GUEST ORDER ======================
const createGuestOrder = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').isMobilePhone('any').withMessage('Valid phone number required'),
  body('address.fullAddress').notEmpty().withMessage('Delivery address is required'),
  body('address.area').notEmpty().withMessage('Area name is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item required'),
  body('items.*.menuItem')
    .isMongoId()
    .withMessage('Valid menu item ID'),
  body('items.*.quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1')
    .toInt(),
  body('paymentMethod')
    .optional()
    .isIn(['cod', 'cash', 'easypaisa', 'jazzcash', 'bank'])
    .withMessage('Invalid payment method')
];

// ====================== TRACK BY PHONE ======================
const trackByPhone = [
  body('phone')
    .isLength({ min: 10, max: 15 })
    .withMessage('Valid phone number required')
];

// ====================== UPDATE ORDER STATUS ======================
const updateStatus = [
  body('status')
    .isIn(['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'rejected'])
    .withMessage('Invalid order status')
];

// ====================== ASSIGN RIDER ======================
const assignRider = [
  body('riderId')
    .isMongoId()
    .withMessage('Valid rider ID required')
];

// ====================== REJECT ORDER ======================
const rejectOrder = [
  body('reason').optional().trim(),
  body('note').optional().trim()
];

module.exports = {
  createOrder,
  createGuestOrder,
  trackByPhone,
  updateStatus,
  assignRider,
  rejectOrder
};
