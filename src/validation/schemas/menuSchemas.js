const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');
const Area = require('../../models/area/Area');

// Custom validator for availableInAreas (used in add & update)
const validateAvailableInAreas = () => {
  return body('availableInAreas')
    .optional({ nullable: true })
    .custom(async (value, { req }) => {
      const raw = req.body.availableInAreas || [];
      let ids = [];

      if (typeof raw === 'string' && raw.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) ids = parsed.map(id => id.toString().trim()).filter(Boolean);
        } catch (e) {
          throw new Error('Invalid JSON format in availableInAreas');
        }
      } else if (Array.isArray(raw)) {
        ids = raw.map(id => id.toString().trim()).filter(Boolean);
      } else if (typeof raw === 'string' && raw.trim()) {
        ids = [raw.trim()];
      }

      const invalidFormat = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidFormat.length > 0) {
        throw new Error(`Invalid area ID format: ${invalidFormat[0]}`);
      }

      if (ids.length > 0) {
        const validAreas = await Area.find({
          _id: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) },
          isActive: true
        }).select('_id');

        const validIds = validAreas.map(a => a._id.toString());
        const invalidIds = ids.filter(id => !validIds.includes(id));
        if (invalidIds.length > 0) {
          throw new Error(`Area not found or inactive: ${invalidIds[0]}`);
        }
      }

      req.body.availableInAreas = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
      return true;
    });
};

// Validation for /area/:areaId route
const getMenuByAreaIdValidation = [
  param('areaId')
    .trim()
    .notEmpty()
    .withMessage('Area ID is required')
    .bail()
    .isMongoId()
    .withMessage('Invalid area ID format')
    .bail()
    .custom(async (areaId) => {
      const area = await Area.findOne({ _id: areaId, isActive: true });
      if (!area) throw new Error('Delivery area not found or currently inactive');
      return true;
    })
];

module.exports = {
  getMenuByLocation: [
    query('lat').exists({ checkFalsy: true }).isFloat({ min: 23.5, max: 37.5 }).withMessage('Valid latitude required (23.5 - 37.5)'),
    query('lng').exists({ checkFalsy: true }).isFloat({ min: 60, max: 78 }).withMessage('Valid longitude required (60 - 78)')
  ],

  getAllMenuItemsWithFilters: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('category').optional().isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']),
    query('isVeg').optional().isIn(['true', 'false']),
    query('isSpicy').optional().isIn(['true', 'false']),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('search').optional().trim().isLength({ max: 100 }),
    query('sort').optional().isIn(['name_asc', 'name_desc', 'price_asc', 'price_desc', 'newest', 'oldest', 'category_asc']),
    query('availableOnly').optional().isIn(['true', 'false'])
  ],

  menuItemIdParam: [
    param('id').trim().isMongoId().withMessage('Invalid menu item ID')
  ],

  toggleAvailabilitySchema: [
    param('id').trim().isMongoId().withMessage('Invalid menu item ID'),
    body('isAvailable').notEmpty().isBoolean().toBoolean().withMessage('isAvailable must be true/false')
  ],

  addMenuItemSchema: [
    body('name').trim().notEmpty().isLength({ min: 2, max: 100 }).withMessage('Name is required (2-100 chars)'),
    body('description').optional({ nullable: true }).trim().isLength({ max: 500 }),
    body('price').notEmpty().isFloat({ min: 50 }).toFloat().withMessage('Price must be ≥ 50'),
    body('category').notEmpty().isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']),
    body('isVeg').optional().isBoolean().toBoolean(),
    body('isSpicy').optional().isBoolean().toBoolean(),
    validateAvailableInAreas()
  ],

  updateMenuItemSchema: [
    param('id').trim().isMongoId().withMessage('Invalid menu item ID'),
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('description').optional({ nullable: true }).trim().isLength({ max: 500 }),
    body('price').optional().isFloat({ min: 50 }).toFloat(),
    body('category').optional().isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']),
    body('isVeg').optional().isBoolean().toBoolean(),
    body('isSpicy').optional().isBoolean().toBoolean(),
    body('isAvailable').optional().isBoolean().toBoolean(),
    validateAvailableInAreas()
  ],

  // Export with clear name to avoid conflict
  getMenuByAreaIdValidation
};