// src/validation/schemas/areaSchemas.js
const { body, query } = require('express-validator');

// Reusable validator for { lat, lng } object
const validatePoint = (value) => {
  if (!value || typeof value !== 'object') {
    throw new Error('Center must be an object');
  }
  if (typeof value.lat !== 'number' || typeof value.lng !== 'number') {
    throw new Error('lat and lng must be numbers');
  }
  if (value.lat < 23.5 || value.lat > 37.5) {
    throw new Error('Latitude must be between 23.5 and 37.5');
  }
  if (value.lng < 60.0 || value.lng > 78.0) {
    throw new Error('Longitude must be between 60.0 and 78.0');
  }
  return true;
};

// ==================== ADD AREA ====================
exports.addArea = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Area name must be 2–50 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .default('Lahore'),

  body('center')
    .custom(validatePoint)
    .withMessage('Invalid center: must be { lat: number, lng: number } within Pakistan'),

  body('polygon')
    .isObject().withMessage('polygon must be an object')
    .bail()
    .custom(p => p.type === 'Polygon')
    .withMessage('polygon.type must be "Polygon"')
    .bail()
    .custom(p => Array.isArray(p.coordinates) && p.coordinates.length >= 1)
    .withMessage('polygon.coordinates must contain at least one ring')
    .bail()
    .custom(p => p.coordinates.every(ring => 
      Array.isArray(ring) && ring.length >= 4
    ))
    .withMessage('Each ring must have at least 4 points')
    .bail()
    .custom(p => p.coordinates.flat(2).every(c => typeof c === 'number'))
    .withMessage('All coordinates must be numbers'),
];

// ==================== UPDATE AREA (All fields optional) ====================
exports.updateArea = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be 2–50 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }),

  body('center')
    .optional()
    .custom(validatePoint)
    .withMessage('Invalid center format'),

  body('polygon')
    .optional()
    .custom(p => !p || (
      p.type === 'Polygon' &&
      Array.isArray(p.coordinates) &&
      p.coordinates.every(ring => Array.isArray(ring) && ring.length >= 4)
    ))
    .withMessage('Invalid polygon format'),
];

// ==================== PUBLIC: Check Delivery Availability ====================
exports.checkAreaQuery = [
  query('lat')
    .notEmpty()
    .isFloat({ min: 23.5, max: 37.5 })
    .withMessage('Valid latitude required (23.5–37.5)')
    .toFloat(),

  query('lng')
    .notEmpty()
    .isFloat({ min: 60.0, max: 78.0 })
    .withMessage('Valid longitude required (60.0–78.0)')
    .toFloat(),
];