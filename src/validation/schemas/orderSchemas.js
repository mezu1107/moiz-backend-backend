// src/validation/schemas/orderSchemas.js
const { body } = require('express-validator');

const createOrderSchema = [
  // === Items (common for both) ===
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

  body('promoCode').optional().trim(),

  // Logged-in user
  body('addressId')
    .if((value, { req }) => req.user)
    .notEmpty()
    .withMessage('Please select a delivery address')
    .isMongoId()
    .withMessage('Valid address ID required'),

  // Guest user
  body('guestAddress')
    .if((value, { req }) => !req.user)
    .isObject()
    .withMessage('Guest address is required'),
  body('guestAddress.fullAddress')
    .if((value, { req }) => !req.user)
    .trim()
    .notEmpty()
    .withMessage('Full delivery address is required'),
  body('guestAddress.areaId')
    .if((value, { req }) => !req.user)
    .isMongoId()
    .withMessage('Valid area ID required'),
  body('guestAddress.label').optional().trim(),
  body('guestAddress.floor').optional().trim(),
  body('guestAddress.instructions').optional().trim(),

  body('name')
    .if((value, { req }) => !req.user)
    .trim()
    .notEmpty()
    .withMessage('Name is required for guest checkout'),
  body('phone')
    .if((value, { req }) => !req.user)
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Valid phone number required'),
];

const trackByPhone = [
  body('phone')
    .isLength({ min: 10, max: 15 })
    .withMessage('Valid phone number required')
];

const updateStatus = [
  body('status')
    .isIn(['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'rejected'])
    .withMessage('Invalid order status')
];

const assignRiderSchema = [  // ← Correct name
  body('riderId')
    .isMongoId()
    .withMessage('Valid rider ID required')
];

const rejectOrder = [
  body('reason').optional().trim(),
  body('note').optional().trim()
];

// EXPORT WITH CORRECT NAME
module.exports = {
  createOrderSchema,
  trackByPhone,
  updateStatus,
  assignRiderSchema,   // ← This must match the import!
  rejectOrder
};