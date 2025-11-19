// src/validation/schemas/addressSchemas.js
const { body } = require('express-validator');

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
    .trim()
    .isMongoId()
    .withMessage('Valid areaId is required'),

  body('lat')
    .isFloat({ min: 23.5, max: 37.5 })
    .withMessage('Latitude must be between 23.5 and 37.5')
    .toFloat(),

  body('lng')
    .isFloat({ min: 60.0, max: 78.0 })
    .withMessage('Longitude must be between 60 and 78')
    .toFloat(),

  body('instructions')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('Instructions must be under 150 characters'),

  body('isDefault')
    .optional()
    .isBoolean()
    .toBoolean()
];

exports.updateAddress = [
  body('label')
    .optional()
    .trim()
    .isIn(['Home', 'Work', 'Other'])
    .withMessage('Label must be Home, Work, or Other'),

  body('fullAddress')
    .optional()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Full address must be 10–200 characters'),

  body('areaId')
    .optional()
    .trim()
    .isMongoId()
    .withMessage('Invalid areaId'),

  body('lat')
    .optional()
    .isFloat({ min: 23.5, max: 37.5 })
    .withMessage('Latitude must be between 23.5 and 37.5')
    .toFloat(),

  body('lng')
    .optional()
    .isFloat({ min: 60.0, max: 78.0 })
    .withMessage('Longitude must be between 60 and 78')
    .toFloat(),

  body('instructions')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('Instructions must be under 150 characters'),

  body('isDefault')
    .optional()
    .isBoolean()
    .toBoolean()
];
