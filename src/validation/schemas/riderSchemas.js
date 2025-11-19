// src/validation/schemas/riderSchemas.js
const { body, param } = require('express-validator');

exports.updateLocation = [
  body('lat').isFloat({ min: 24, max: 37 }).withMessage('Valid latitude required'),
  body('lng').isFloat({ min: 60, max: 78 }).withMessage('Valid longitude required')
];

exports.updateOrderLocation = [
  body('lat').isFloat({ min: 24, max: 37 }),
  body('lng').isFloat({ min: 60, max: 78 })
];

exports.updateRiderStatus = [
  body('isOnline').optional().isBoolean().toBoolean(),
  body('isAvailable').optional().isBoolean().toBoolean()
];

exports.createRider = [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('licenseNumber').trim().notEmpty().withMessage('License number required'),
  body('vehicleType').optional().isIn(['bike', 'car'])
];

exports.updateRider = [
  body('licenseNumber').optional().trim().notEmpty(),
  body('vehicleType').optional().isIn(['bike', 'car'])
];