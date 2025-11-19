// src/validation/schemas/dealSchemas.js
const { body } = require('express-validator');

// ← RENAMED to match your import pattern in routes
const createDealSchema = [
  body('title').trim().notEmpty().isLength({ min: 3, max: 100 }).withMessage('Title is required (3-100 chars)'),
  body('code').trim().notEmpty().isLength({ min: 3, max: 20 }).matches(/^[A-Z0-9]+$/).withMessage('Code must be 3-20 uppercase letters/numbers'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
  body('discountValue').isFloat({ min: 0.01 }).toFloat(),
  body('discountValue').custom((value, { req }) => {
    if (req.body.discountType === 'percentage' && value > 100) throw new Error('Percentage cannot exceed 100');
    if (req.body.discountType === 'fixed' && value > 100000) throw new Error('Fixed discount too high');
    return true;
  }),
  body('minOrderAmount').optional().isFloat({ min: 0 }).toFloat(),
  body('maxDiscountAmount').optional().isFloat({ min: 1 }).toFloat(),
  body('validFrom').isISO8601().toDate().withMessage('Valid date required'),
  body('validUntil').isISO8601().toDate().withMessage('Valid date required'),
  body('validUntil').custom((value, { req }) => {
    if (new Date(value) <= new Date(req.body.validFrom)) throw new Error('validUntil must be after validFrom');
    return true;
  }),
  body('usageLimitPerUser').optional().isInt({ min: 0 }).toInt(),
  body('applicableItems').optional().isArray(),
  body('applicableAreas').optional().isArray()
];

const updateDealSchema = [
  body('title').optional().trim().isLength({ min: 3, max: 100 }),
  body('code').optional().trim().isLength({ min: 3, max: 20 }).matches(/^[A-Z0-9]+$/),
  body('discountType').optional().isIn(['percentage', 'fixed']),
  body('discountValue').optional().isFloat({ min: 0.01 }).toFloat(),
  body('minOrderAmount').optional().isFloat({ min: 0 }).toFloat(),
  body('maxDiscountAmount').optional().isFloat({ min: 1 }).toFloat(),
  body('validFrom').optional().isISO8601().toDate(),
  body('validUntil').optional().isISO8601().toDate(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('usageLimitPerUser').optional().isInt({ min: 0 }).toInt(),
  body('validUntil').custom((value, { req }) => {
    if (value && req.body.validFrom && new Date(value) <= new Date(req.body.validFrom)) {
      throw new Error('validUntil must be after validFrom');
    }
    return true;
  })
];

const applyDealSchema = [
  body('code').trim().notEmpty().isLength({ min: 3, max: 20 }).matches(/^[A-Z0-9]+$/).withMessage('Invalid promo code format'),
  body('orderTotal').isFloat({ min: 0 }).toFloat().withMessage('Order total must be a positive number')
];

const toggleDealStatusSchema = [
  body('isActive').optional().isBoolean().toBoolean()
];

module.exports = {
  createDeal: createDealSchema,
  updateDeal: updateDealSchema,
  applyDeal: applyDealSchema,
  toggleDealStatus: toggleDealStatusSchema
};