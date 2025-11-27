// src/validation/schemas/riderSchemas.js

const { body, param } = require('express-validator');

module.exports = {

  // ──────────────────────────────── ADMIN PANEL SCHEMAS ────────────────────────────────
  updateRiderStatus: [
    param('id').isMongoId().withMessage('Valid rider ID is required'),
    body('riderStatus')
      .isIn(['pending', 'approved', 'rejected'])
      .withMessage('riderStatus must be pending, approved, or rejected')
  ],

  promoteUserToRider: [
    param('id').isMongoId().withMessage('Valid user ID is required'),
    body('vehicleType').optional().isIn(['bike', 'car', 'bicycle']).withMessage('Invalid vehicle type'),
    body('vehicleNumber')
      .optional()
      .isLength({ min: 3, max: 15 })
      .matches(/^[A-Z0-9-]+$/i)
      .withMessage('Vehicle number must be alphanumeric with dashes only')
  ],

  permanentlyBanRider: [
    param('id').isMongoId().withMessage('Valid rider ID is required'),
    body('reason')
      .trim()
      .isLength({ min: 10 })
      .withMessage('Ban reason must be at least 10 characters')
  ],

  rejectRider: [
    param('id').isMongoId().withMessage('Valid user ID is required'),
    body('reason')
      .trim()
      .isLength({ min: 10 })
      .withMessage('Rejection reason must be at least 10 characters long')
  ],


  // ──────────────────────────────── RIDER APP SCHEMAS (Yeh pehle missing the!) ────────────────────────────────

  // Rider sends current location (when going online or moving)
  updateLocation: [
    body('lat')
      .trim()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude is required (-90 to 90)'),
    body('lng')
      .trim()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude is required (-180 to 180)')
  ],

  // Rider sends live location during active delivery
  updateOrderLocation: [
    body('lat')
      .trim()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Valid latitude is required'),
    body('lng')
      .trim()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Valid longitude is required')
  ],

  // Customer applies to become rider
  applyAsRider: [
    body('cnicNumber')
      .trim()
      .matches(/^\d{5}-\d{7}-\d{1}$/)
      .withMessage('Valid CNIC required. Format: 35202-1234567-1'),

    body('vehicleType')
      .optional()
      .isIn(['bike', 'car', 'bicycle'])
      .withMessage('Vehicle type must be bike, car, or bicycle'),

    body('vehicleNumber')
      .trim()
      .isLength({ min: 3, max: 15 })
      .matches(/^[A-Z0-9-]+$/i)
      .withMessage('Invalid vehicle number. Only letters, numbers and dashes allowed'),

    body('cnicFront').isURL().withMessage('Valid CNIC front image URL required'),
    body('cnicBack').isURL().withMessage('Valid CNIC back image URL required'),
    body('drivingLicense').isURL().withMessage('Valid driving license URL required'),
    body('riderPhoto').isURL().withMessage('Valid rider photo URL required')
  ]

  // No comma after last property!
};