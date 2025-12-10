const { body, param } = require('express-validator');

exports.createAddress = [
  body('label')
    .trim()
    .notEmpty()
    .isIn(['Home', 'Work', 'Other'])
    .withMessage('Label must be Home, Work, or Other'),

  body('fullAddress')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Full address must be 10–200 characters'),

  body('areaId')
    .isMongoId()
    .withMessage('Valid area ID required'),

  body('instructions')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('Instructions too long (max 150 chars)'),

  body('isDefault')
    .optional()
    .isBoolean()
    .toBoolean()
];

exports.updateAddress = [
  param('id').isMongoId().withMessage('Invalid address ID'),

  body('label')
    .optional()
    .trim()
    .isIn(['Home', 'Work', 'Other']),

  body('fullAddress')
    .optional()
    .trim()
    .isLength({ min: 10, max: 200 }),

  body('areaId')
    .optional()
    .isMongoId(),

  body('instructions')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 }),

  body('isDefault')
    .optional()
    .isBoolean()
    .toBoolean()
];

exports.addressIdParam = [
  param('id').isMongoId().withMessage('Invalid address ID')
];
