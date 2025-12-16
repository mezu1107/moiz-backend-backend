// src/validation/schemas/dealSchemas.js
// FINAL — 100% CORRECT EXPORT NAMES

const { body } = require('express-validator');

const createDeal = [
  body('title').trim().notEmpty().isLength({ min: 3, max: 100 }),
  body('code').trim().notEmpty().isLength({ min: 3, max: 20 }).matches(/^[A-Z0-9]+$/),
  body('discountType').isIn(['percentage', 'fixed']),
  body('discountValue').isFloat({ min: 0.01 }).toFloat(),
  body('discountValue').custom((value, { req }) => {
    if (req.body.discountType === 'percentage' && value > 100) throw new Error('Max 100%');
    return true;
  }),
  body('minOrderAmount').optional().isFloat({ min: 0 }).toFloat(),
  body('maxDiscountAmount').optional().isFloat({ min: 1 }).toFloat(),
  body('validFrom').isISO8601().toDate(),
  body('validUntil').isISO8601().toDate(),
  body('validUntil').custom((value, { req }) => {
    if (new Date(value) <= new Date(req.body.validFrom)) throw new Error('validUntil must be after validFrom');
    return true;
  }),
  body('usageLimitPerUser').optional().isInt({ min: 0 }).toInt(),
  body('totalUsageLimit').optional().isInt({ min: 1 }).toInt(),
  body('applicableItems').optional().isArray(),
  body('applicableAreas').optional().isArray(),
];

const updateDeal = [
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
];

const applyDeal = [
  body('code').trim().notEmpty().isLength({ min: 3, max: 20 }).matches(/^[A-Z0-9]+$/),
  body('orderTotal').isFloat({ min: 0.01 }).toFloat()
];

const toggleDealStatus = [
  body('isActive').optional().isBoolean().toBoolean()
];

module.exports = {
  createDeal,
  updateDeal,
  applyDeal,
  toggleDealStatus
};