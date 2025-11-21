// src/validation/schemas/menuSchemas.js
const { body, query, param } = require('express-validator');

exports.getMenuByLocation = [
  query('lat')
    .exists({ checkFalsy: true })
    .withMessage('Latitude is required')
    .isFloat({ min: 23.5, max: 37.5 })
    .withMessage('Latitude must be in Pakistan (23.5–37.5)')
    .toFloat(),

  query('lng')
    .exists({ checkFalsy: true })
    .withMessage('Longitude is required')
    .isFloat({ min: 60, max: 78 })
    .withMessage('Longitude must be in Pakistan (60–78)')
    .toFloat()
];

exports.menuItemIdParam = [
  param('id').isMongoId().withMessage('Invalid menu item ID')
];

exports.getAllMenuItemsWithFilters = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('category').optional().isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']),
  query('isVeg').optional().isIn(['true', 'false']),
  query('isSpicy').optional().isIn(['true', 'false']),
  query('minPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('search').optional().trim().isLength({ max: 100 }),
  query('availableOnly').optional().isIn(['true', 'false']),
  query('sort').optional().isIn([
    'name_asc', 'name_desc',
    'price_asc', 'price_desc',
    'newest', 'oldest',
    'category_asc'
  ])
];

exports.addMenuItem = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 50 }).withMessage('Price must be at least 50 PKR')
    .toFloat(),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']),

  body('isVeg').optional().isBoolean().toBoolean(),
  body('isSpicy').optional().isBoolean().toBoolean(),

  body('availableInAreas')
    .optional()
    .isArray()
    .custom((arr) => arr.every(id => mongoose.Types.ObjectId.isValid(id)))
    .withMessage('Invalid area ID in availableInAreas'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description too long')
];

exports.updateMenuItem = [
  param('id').isMongoId().withMessage('Invalid menu item ID'),

  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('price').optional().isFloat({ min: 50 }).toFloat(),
  body('category').optional().isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']),
  body('isVeg').optional().isBoolean().toBoolean(),
  body('isSpicy').optional().isBoolean().toBoolean(),
  body('isAvailable').optional().isBoolean().toBoolean(),

  body('availableInAreas')
    .optional()
    .isArray()
    .custom((arr) => !arr || arr.every(id => mongoose.Types.ObjectId.isValid(id))),

  body('description').optional().trim().isLength({ max: 500 })
];

exports.toggleAvailability = [
  param('id').isMongoId().withMessage('Invalid menu item ID'),
  body('isAvailable').notEmpty().isBoolean().toBoolean()
];