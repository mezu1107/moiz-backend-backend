// src/validation/schemas/orderSchemas.js
// FINAL PRODUCTION — DECEMBER 16, 2025
// FULLY SYNCHRONIZED WITH orderController.js

const { body } = require('express-validator');

const createOrderSchema = [
  // === ITEMS — REQUIRED ===
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.menuItem')
    .isMongoId()
    .withMessage('Invalid menu item ID'),

  body('items.*.quantity')
    .isInt({ min: 1, max: 50 })
    .toInt()
    .withMessage('Quantity must be between 1 and 50'),

  // === PAYMENT METHOD ===
  body('paymentMethod')
    .optional()
    .isIn(['cod', 'card', 'easypaisa', 'jazzcash', 'bank', 'wallet'])
    .withMessage('Invalid payment method. Allowed: cod, card, easypaisa, jazzcash, bank, wallet'),

  // === WALLET USAGE ===
  body('useWallet')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('useWallet must be true or false'),

  // === PROMO CODE ===
  body('promoCode')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Promo code too long'),

  // === INSTRUCTIONS ===
  body('instructions')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Instructions cannot exceed 300 characters'),

  // === LOGGED-IN USER: addressId required ===
  body('addressId')
    .if((value, { req }) => !!req.user) // Only if authenticated
    .notEmpty()
    .withMessage('Address ID is required for logged-in users')
    .isMongoId()
    .withMessage('Invalid address ID'),

  // === GUEST USER: Full guest details required ===
  body('guestAddress')
    .if((value, { req }) => !req.user)
    .isObject()
    .withMessage('guestAddress object is required for guest checkout'),

  body('guestAddress.fullAddress')
    .if((value, { req }) => !req.user)
    .trim()
    .notEmpty()
    .withMessage('Full address is required for guest'),

  body('guestAddress.areaId')
    .if((value, { req }) => !req.user)
    .isMongoId()
    .withMessage('Valid area ID is required for guest'),

  body('guestAddress.label')
    .optional()
    .trim(),

  body('guestAddress.floor')
    .optional()
    .trim(),

  body('guestAddress.instructions')
    .optional()
    .trim(),

  // === GUEST NAME & PHONE ===
  body('name')
    .if((value, { req }) => !req.user)
    .trim()
    .notEmpty()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name is required and must be 2–50 characters'),

  body('phone')
    .if((value, { req }) => !req.user)
    .trim()
    .notEmpty()
    .isLength({ min: 11, max: 11 })
    .matches(/^03[0-9]{9}$/)
    .withMessage('Valid Pakistani phone number required (e.g., 03XXXXXXXXX)'),
];

const trackByPhoneSchema = [
  body('phone')
    .trim()
    .notEmpty()
    .isLength({ min: 11, max: 11 })
    .matches(/^03[0-9]{9}$/)
    .withMessage('Valid 11-digit Pakistani phone number required'),
];

const updateStatusSchema = [
  body('status')
    .trim()
    .notEmpty()
    .isIn(['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'rejected'])
    .withMessage('Invalid status. Allowed: confirmed, preparing, out_for_delivery, delivered, rejected'),
];

const assignRiderSchema = [
  body('riderId')
    .trim()
    .notEmpty()
    .withMessage('riderId is required')
    .isMongoId()
    .withMessage('Invalid riderId format'),
];

const rejectOrderSchema = [
  body('reason')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason too long'),

  body('note')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Note too long'),
];

const requestRefundSchema = [
  body('amount')
    .isFloat({ gt: 0 })
    .toFloat()
    .withMessage('Amount must be a positive number'),

  body('reason')
    .trim()
    .notEmpty()
    .isLength({ min: 15, max: 300 })
    .withMessage('Refund reason must be between 15 and 300 characters'),
];

module.exports = {
  createOrderSchema,
  trackByPhoneSchema,
  updateStatusSchema,
  assignRiderSchema,
  rejectOrderSchema,
  requestRefundSchema,
};