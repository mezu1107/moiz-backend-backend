// src/validation/schemas/addressSchemas.js
const { body } = require('express-validator');

exports.createAddress = [
  body('label')
    .trim()
    .notEmpty()
    .withMessage('Address label is required')
    .isIn(['Home', 'Work', 'Other'])
    .withMessage('Label must be Home, Work or Other'),

  body('fullAddress')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Full address must be between 10 and 200 characters'),

  body('areaId')
    .trim()
    .isMongoId()
    .withMessage('Please select a valid delivery area'),

  body('lat')
    .isFloat({ min: 23.5, max: 37.5 })
    .withMessage('Invalid latitude for Pakistan')
    .toFloat(),

  body('lng')
    .isFloat({ min: 60.0, max: 78.0 })
    .withMessage('Invalid longitude for Pakistan')
    .toFloat(),

  body('instructions')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('Delivery instructions cannot exceed 150 characters'),

  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be true or false')
    .toBoolean()
];

exports.updateAddress = [
  body('label')
    .optional()
    .trim()
    .isIn(['Home', 'Work', 'Other'])
    .withMessage('Label must be Home, Work or Other'),

  body('fullAddress')
    .optional()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Full address must be between 10 and 200 characters'),

  body('areaId')
    .optional()
    .trim()
    .isMongoId()
    .withMessage('Invalid area ID'),

  body('lat')
    .optional()
    .isFloat({ min: 23.5, max: 37.5 })
    .withMessage('Invalid latitude for Pakistan')
    .toFloat(),

  body('lng')
    .optional()
    .isFloat({ min: 60.0, max: 78.0 })
    .withMessage('Invalid longitude for Pakistan')
    .toFloat(),

  body('instructions')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('Instructions max 150 characters'),

  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be true or false')
    .toBoolean()
];