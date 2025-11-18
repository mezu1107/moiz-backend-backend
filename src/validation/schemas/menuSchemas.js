// src/validation/schemas/menuSchemas.js
const { body, query } = require('express-validator');

exports.getMenuByLocation = [
  query('lat')
    .exists().withMessage('Latitude is required')
    .isFloat({ min: 24, max: 37 }).withMessage('Valid Pakistan latitude (24–37)'),

  query('lng')
    .exists().withMessage('Longitude is required')
    .isFloat({ min: 60, max: 78 }).withMessage('Valid Pakistan longitude (60–78)')
];

exports.addMenuItem = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description max 500 chars'),

  body('price')
    .isFloat({ min: 50, max: 50000 }).withMessage('Price must be 50–50,000 PKR'),

  body('category')
    .isIn(['Biryani', 'Pizza', 'Burger', 'Karahi', 'BBQ', 'Drinks', 'Desserts', 'Deals', 'Appetizers'])
    .withMessage('Invalid category'),

  body('isAvailable')
    .optional()
    .isBoolean().withMessage('isAvailable must be boolean'),

  body('availableInAreas')
    .optional()
    .isArray().withMessage('availableInAreas must be array')
    .custom(arr => arr.every(id => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage('Invalid Area ID in availableInAreas')
];

exports.updateMenuItem = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('price').optional().isFloat({ min: 50, max: 50000 }),
  body('category').optional().isString(),
  body('isAvailable').optional().isBoolean()
];