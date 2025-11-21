// src/validation/schemas/riderSchemas.js
const { body, param, query } = require('express-validator');

module.exports = {
  // Rider: Update location
  updateLocation: [
    body('lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90')
      .toFloat(),
    body('lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180')
      .toFloat()
  ],

  // Rider: Update location during delivery
  updateOrderLocation: [
    param('id').isMongoId().withMessage('Valid order ID required'),
    body('lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude required')
      .toFloat(),
    body('lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude required')
      .toFloat()
  ],

  // Admin: Change rider status
  updateRiderStatus: [
    param('id').isMongoId().withMessage('Valid rider ID required'),
    body('riderStatus')
      .isIn(['pending', 'approved', 'rejected'])
      .withMessage('riderStatus must be pending, approved, or rejected')
  ],

  // Admin: Get rider by ID
  getRiderById: [
    param('id').isMongoId().withMessage('Valid rider ID required')
  ],

  // Admin: List riders with filters
  getAllRiders: [
    query('status')
      .optional()
      .isIn(['none', 'pending', 'approved', 'rejected'])
      .withMessage('Invalid status filter'),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Search query too long'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be >= 1')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be 1–100')
      .toInt()
  ]
};