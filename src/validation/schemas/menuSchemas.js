// src/validation/schemas/menuSchemas.js
const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');
const Area = require('../../models/area/Area'); // ← For async validation

/**
 * Reusable validator for availableInAreas field
 * Handles: string, array, JSON string, single ID
 * Cleans & sanitizes + checks if areas actually exist + are active
 */
const validateAvailableInAreas = () => {
  return body('availableInAreas')
    .optional({ nullable: true })
    .custom(async (value, { req }) => {
      const raw = req.body.availableInAreas || [];

      let ids = [];

      // Handle JSON string like '["id1","id2"]' from form-data
      if (typeof raw === 'string' && raw.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            ids = parsed.map(id => id.toString().trim()).filter(Boolean);
          }
        } catch (e) {
          throw new Error('Invalid JSON format in availableInAreas');
        }
      }
      // Direct array from JSON body
      else if (Array.isArray(raw)) {
        ids = raw.map(id => id.toString().trim()).filter(Boolean);
      }
      // Single string ID
      else if (typeof raw === 'string' && raw.trim()) {
        ids = [raw.trim()];
      }

      // Validate ObjectId format
      const invalidFormat = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidFormat.length > 0) {
        throw new Error(`Invalid area ID format: ${invalidFormat[0]}`);
      }

      // If IDs provided, check they exist and are active
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

      // Sanitize: store only valid, active ObjectIds as strings
      req.body.availableInAreas = ids.filter(id =>
        mongoose.Types.ObjectId.isValid(id) &&
        ids.includes(id) // already filtered above
      );

      return true;
    });
};

// EXPORT ALL SCHEMAS
module.exports = {
  // Public: Get menu by user location
  getMenuByLocation: [
    query('lat')
      .exists({ checkFalsy: true })
      .isFloat({ min: 23.5, max: 37.5 })
      .withMessage('Valid latitude required for Pakistan (23.5–37.5)'),
    query('lng')
      .exists({ checkFalsy: true })
      .isFloat({ min: 60, max: 78 })
      .withMessage('Valid longitude required for Pakistan (60–78)')
  ],

  // Public: Filtered menu with pagination
  getAllMenuItemsWithFilters: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('category').optional().isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']),
    query('isVeg').optional().isIn(['true', 'false']),
    query('isSpicy').optional().isIn(['true', 'false']),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('search').optional().trim().isLength({ max: 100 }),
    query('sort').optional().isIn([
      'name_asc', 'name_desc',
      'price_asc', 'price_desc',
      'newest', 'oldest',
      'category_asc'
    ]).withMessage('Invalid sort parameter')
  ],

  // Param validation for /:id routes
  menuItemIdParam: [
    param('id').isMongoId().withMessage('Invalid menu item ID')
  ],

  // Toggle availability (PATCH /:id/toggle)
  toggleAvailability: [
    param('id').isMongoId().withMessage('Invalid menu item ID'),
    body('isAvailable')
      .notEmpty()
      .isBoolean()
      .withMessage('isAvailable must be true or false')
      .toBoolean()
  ],

  // ADMIN: Add new menu item
  addMenuItem: [
    body('name')
      .trim()
      .notEmpty()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be 2–100 characters'),

    body('description')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description too long (max 500)'),

    body('price')
      .notEmpty()
      .isFloat({ min: 50, max: 100000 })
      .withMessage('Price must be ≥ Rs.50')
      .toFloat(),

    body('category')
      .notEmpty()
      .isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages'])
      .withMessage('Invalid category'),

    body('isVeg')
      .optional()
      .isBoolean()
      .toBoolean(),

    body('isSpicy')
      .optional()
      .isBoolean()
      .toBoolean(),

    validateAvailableInAreas()
  ],

  // ADMIN: Update menu item
  updateMenuItem: [
    param('id').isMongoId().withMessage('Invalid menu item ID'),

    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be 2–100 characters'),

    body('description')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 500 }),

    body('price')
      .optional()
      .isFloat({ min: 50, max: 100000 })
      .toFloat(),

    body('category')
      .optional()
      .isIn(['breakfast', 'lunch', 'dinner', 'desserts', 'beverages']),

    body('isVeg')
      .optional()
      .isBoolean()
      .toBoolean(),

    body('isSpicy')
      .optional()
      .isBoolean()
      .toBoolean(),

    body('isAvailable')
      .optional()
      .isBoolean()
      .toBoolean(),

    validateAvailableInAreas()
  ]
};