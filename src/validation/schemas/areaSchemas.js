// src/validation/schemas/areaSchemas.js
const { body, query } = require('express-validator');

// Reusable: Validate { lat, lng } object with Pakistan bounds
const validatePakistanPoint = (value, { req, path }) => {
  if (!value || typeof value !== 'object') {
   throw new Error('Must be an object { lat: number, lng: number }');
  }

  const { lat, lng } = value;

  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
   throw new Error('lat and lng must be valid numbers');
  }

  if (lat < 23.5 || lat > 37.5) {
   throw new Error('Latitude must be between 23.5 and 37.5 (Pakistan bounds)');
  }

  if (lng < 60.0 || lng > 78.0) {
   throw new Error('Longitude must be between 60.0 and 78.0 (Pakistan bounds)');
  }

  return true;
};

// Reusable: Validate a single ring [[lat, lng], ...]
const validateRing = (ring) => {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  return ring.every(point =>
   Array.isArray(point) &&
   point.length === 2 &&
   typeof point[0] === 'number' &&
   typeof point[1] === 'number'
  );
};

// ==================== ADD AREA (POST /admin/area) ====================
exports.addArea = [
 body('name')
   .trim()
   .notEmpty()
   .withMessage('Area name is required')
   .isLength({ min: 2, max: 50 })
   .withMessage('Name must be 2–50 characters'),

 body('city')
   .optional()
   .trim()
   .isLength({ min: 2, max: 50 })
   .withMessage('City must be 2–50 characters')
   .default('Lahore'),

 body('center')
   .exists({ checkNull: true })
   .withMessage('Center is required')
   .bail()
   .custom(validatePakistanPoint),

 body('polygon')
   .exists({ checkNull: true })
   .withMessage('Polygon is required')
   .bail()
   .isObject()
   .withMessage('Polygon must be a GeoJSON object')
   .bail()
   .custom(p => p.type === 'Polygon')
   .withMessage('polygon.type must be "Polygon"')
   .bail()
   .custom(p => Array.isArray(p.coordinates) && p.coordinates.length >= 1)
   .withMessage('polygon.coordinates must have at least one ring')
   .bail()
   .custom(p => p.coordinates.every(ring => validateRing(ring)))
   .withMessage('Each ring must have ≥4 valid [lat, lng] points and be closed'),
];

// ==================== UPDATE AREA (PUT /admin/area/:id) ====================
exports.updateArea = [
 body('name')
   .optional()
   .trim()
   .isLength({ min: 2, max: 50 })
   .withMessage('Name must be 2–50 characters'),

 body('city')
   .optional()
   .trim()
   .isLength({ min: 2, max: 50 })
   .withMessage('City must be 2–50 characters'),

 body('center')
   .optional()
   .custom(validatePakistanPoint),

 body('polygon')
   .optional()
   .custom(p => {
     if (!p) return true; // allow null/undefined
     if (typeof p !== 'object' || p.type !== 'Polygon') {
       throw new Error('polygon.type must be "Polygon"');
     }
     if (!Array.isArray(p.coordinates) || p.coordinates.length === 0) {
       throw new Error('polygon.coordinates must be a non-empty array');
     }
     if (!p.coordinates.every(ring => validateRing(ring))) {
       throw new Error('Each ring must have ≥4 valid [lat, lng] points');
     }
     return true;
   }),
];

// ==================== CHECK AREA (PUBLIC: /api/areas/check) ====================
exports.checkAreaQuery = [
 query('lat')
   .notEmpty()
   .withMessage('Latitude is required')
   .isFloat({ min: 23.5, max: 37.5 })
   .withMessage('Latitude must be between 23.5 and 37.5')
   .toFloat(),

 query('lng')
   .notEmpty()
   .withMessage('Longitude is required')
   .isFloat({ min: 60.0, max: 78.0 })
   .withMessage('Longitude must be between 60.0 and 78.0')
   .toFloat(),
];