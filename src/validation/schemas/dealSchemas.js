// src/validation/schemas/dealSchemas.js
const { body } = require('express-validator');

exports.createDeal = [
  body('title').trim().isLength({ min: 5, max: 100 }),
  body('discountType').isIn(['percentage', 'fixed']),
  body('discountValue')
    .isFloat({ min: 1, max: 100000 })
    .withMessage('Valid discount value'),

  body('minOrderAmount')
    .optional()
    .isFloat({ min: 0 }),

  body('validFrom').isISO8601(),
  body('validUntil').isISO8601().custom((end, { req }) => {
    if (new Date(end) <= new Date(req.body.validFrom)) {
      throw new Error('validUntil must be after validFrom');
    }
    return true;
  })
];