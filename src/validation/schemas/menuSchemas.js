// src/validation/schemas/menuSchemas.js
const { body, param, query } = require('express-validator'); // ← YE LINE ADD KARNA ZAROORI THA!
const mongoose = require('mongoose');

const validateAvailableInAreas = () => {
  return body('availableInAreas')
    .optional()
    .custom((value, { req }) => {
      const raw = req.body.availableInAreas || [];
      let ids = [];

      if (typeof raw === 'string' && raw.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) ids = parsed.map(id => id.toString().trim()).filter(Boolean);
        } catch (e) {
          throw new Error('Invalid JSON in availableInAreas');
        }
      } else if (Array.isArray(raw)) {
        ids = raw.map(id => id.toString().trim()).filter(Boolean);
      } else if (typeof raw === 'string' && raw.trim()) {
        ids = [raw.trim()];
      }

      const invalid = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalid.length > 0) throw new Error(`Invalid area ID: ${invalid[0]}`);

      req.body.availableInAreas = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
      return true;
    });
};

module.exports = {
  getMenuByLocation: [
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    query('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required')
  ],

  getAllMenuItemsWithFilters: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('category').optional().isString(),
    query('isVeg').optional().isIn(['true', 'false']),
    query('isSpicy').optional().isIn(['true', 'false']),
    query('search').optional().trim()
  ],

  menuItemIdParam: [param('id').isMongoId().withMessage('Invalid menu item ID')],

  toggleAvailability: [
    param('id').isMongoId(),
    body('isAvailable').isBoolean().withMessage('isAvailable must be true/false')
  ],

  addMenuItem: [
    body('name').trim().notEmpty().isLength({ min: 2, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('price').notEmpty().isFloat({ min: 50 }).toFloat(),
    body('category').notEmpty().isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']),
    body('isVeg').optional().isBoolean().toBoolean(),
    body('isSpicy').optional().isBoolean().toBoolean(),
    validateAvailableInAreas()
  ],

  updateMenuItem: [
    param('id').isMongoId(),
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('price').optional().isFloat({ min: 50 }).toFloat(),
    body('category').optional().isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']),
    body('isVeg').optional().isBoolean().toBoolean(),
    body('isSpicy').optional().isBoolean().toBoolean(),
    body('isAvailable').optional().isBoolean().toBoolean(),
    validateAvailableInAreas()
  ]
};