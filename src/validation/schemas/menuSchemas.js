// src/validation/schemas/menuSchemas.js
const { body, query } = require('express-validator');

const getMenuByLocation = [
  query('lat')
    .exists().withMessage('Latitude is required')
    .isFloat({ min: 24, max: 37 }).withMessage('Valid latitude required'),

  query('lng')
    .exists().withMessage('Longitude is required')
    .isFloat({ min: 60, max: 78 }).withMessage('Valid longitude required')
];

const addMenuItem = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name 2–100 chars'),
  body('price').isFloat({ min: 50 }).withMessage('Price ≥ 50 PKR'),
  body('category').isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']),
  body('isVeg').optional().isBoolean(),
  body('isSpicy').optional().isBoolean(),
  body('availableInAreas').optional().isArray()
];

const updateMenuItem = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('price').optional().isFloat({ min: 50 }),
  body('category').optional().isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']),
  body('isAvailable').optional().isBoolean()
];

// EXPORT LIKE THIS — NOT exports.getMenuByLocation
module.exports = {
  menuSchemas: {
    getMenuByLocation,
    addMenuItem,
    updateMenuItem
  }
};