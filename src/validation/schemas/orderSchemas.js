// src/validation/schemas/orderSchemas.js
// FINAL PRODUCTION — DECEMBER 2025
const { body } = require('express-validator');

const createOrderSchema = [
  // Items — always required
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.menuItem')
    .isMongoId()
    .withMessage('Invalid menu item ID'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 50 })
    .toInt()
    .withMessage('Quantity must be 1–50'),

  // Optional fields
  body('paymentMethod')
    .optional()
    .isIn(['cod', 'card', 'easypaisa', 'jazzcash', 'bank', 'wallet', 'mixed'])
    .withMessage('Invalid payment method'),

  body('useWallet')
    .optional()
    .isBoolean()
    .toBoolean(),

  body('promoCode')
    .optional()
    .isString()
    .trim(),

  body('instructions')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Instructions max 300 characters'),

  // === Logged-in User: addressId required ===
  body('addressId')
    .if((value, { req }) => !!req.user)
    .notEmpty()
    .withMessage('Delivery address is required')
    .isMongoId()
    .withMessage('Invalid address ID'),

  // === Guest User: full guest info required ===
  body('guestAddress')
    .if((value, { req }) => !req.user)
    .isObject()
    .withMessage('Guest address object is required'),

  body('guestAddress.fullAddress')
    .if((value, { req }) => !req.user)
    .trim()
    .notEmpty()
    .withMessage('Full address is required'),

  body('guestAddress.areaId')
    .if((value, { req }) => !req.user)
    .isMongoId()
    .withMessage('Valid area ID required'),

  body('guestAddress.label')
    .optional()
    .trim(),

  body('guestAddress.floor')
    .optional()
    .trim(),

  body('guestAddress.instructions')
    .optional()
    .trim(),

  body('name')
    .if((value, { req }) => !req.user)
    .trim()
    .notEmpty()
    .isLength({ min: 2 })
    .withMessage('Name is required for guest'),

  body('phone')
    .if((value, { req }) => !req.user)
    .trim()
    .isLength({ min: 11, max: 11 })
    .matches(/^03[0-9]{9}$/)
    .withMessage('Valid Pakistani number required: 03XXXXXXXXX'),
];

const trackByPhoneSchema = [
  body('phone')
    .trim()
    .notEmpty()
    .isLength({ min: 11, max: 11 })
    .matches(/^03[0-9]{9}$/)
    .withMessage('Valid 11-digit phone required'),
];

const updateStatusSchema = [
  body('status')
    .isIn(['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'rejected'])
    .withMessage('Invalid status'),
];

const assignRiderSchema = [
  body('riderId')
    .isMongoId()
    .withMessage('Valid rider ID required'),
];

const rejectOrderSchema = [
  body('reason')
    .optional()
    .isString()
    .trim(),
  body('note')
    .optional()
    .isString()
    .trim(),
];

const requestRefundSchema = [
  body('amount')
    .isFloat({ min: 1 })
    .toFloat()
    .withMessage('Valid refund amount required'),
  body('reason')
    .trim()
    .notEmpty()
    .isLength({ min: 15, max: 300 })
    .withMessage('Reason must be 15–300 characters'),
];

module.exports = {
  createOrderSchema,
  trackByPhoneSchema,
  updateStatusSchema,
  assignRiderSchema,
  rejectOrderSchema,
  requestRefundSchema
};