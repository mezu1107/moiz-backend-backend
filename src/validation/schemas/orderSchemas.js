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
// GUEST ORDER – FULLY UPDATED (supports areaId + card payment)
const createGuestOrder = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').isMobilePhone('any', { strictMode: false }).withMessage('Valid phone number required'),
  body('areaId').isMongoId().withMessage('Valid areaId is required'),
  body('address.fullAddress').trim().notEmpty().withMessage('Full address is required'),
  body('address.label').optional().trim(),
  body('address.floor').optional().trim(),
  body('address.instructions').optional().trim(),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.menuItem').isMongoId().withMessage('Valid menu item ID required'),
  body('items.*.quantity').isInt({ min: 1, max: 50 }).toInt().withMessage('Quantity must be 1–50'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'cod', 'card', 'easypaisa', 'jazzcash', 'bank'])
    .withMessage('Invalid payment method'),
  body('promoCode').optional().trim()
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
  createGuestOrder,        // this one was outdated before
  trackByPhone,
  updateStatus,
  assignRider,
  rejectOrder
};
