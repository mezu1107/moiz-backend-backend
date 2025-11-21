// src/validation/schemas/addressSchemas.js
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

  body('lat')
    .isFloat({ min: 23.5, max: 37.5 })
    .withMessage('Latitude must be in Pakistan range (23.5–37.5)')
    .toFloat(),

  body('lng')
    .isFloat({ min: 60.0, max: 78.0 })
    .withMessage('Longitude must be in Pakistan range (60–78)')
    .toFloat(),

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

  body('lat')
    .optional()
    .isFloat({ min: 23.5, max: 37.5 })
    .toFloat(),

  body('lng')
    .optional()
    .isFloat({ min: 60.0, max: 78.0 })
    .toFloat(),

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