// src/validation/schemas/areaSchemas.js
const { body, query } = require('express-validator');

/* ------------------------------------------------------------------
   HELPER FUNCTIONS – Accept strings OR numbers
------------------------------------------------------------------ */

const toFloat = (val) => {
  if (val === null || val === undefined || val === '') return NaN;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.trim());
  return NaN;
};

const validatePakistanPoint = (value, { req, path }) => {
  const lat = toFloat(value?.lat);
  lng = toFloat(value?.lng);

  if (isNaN(lat) || isNaN(lng)) {
    throw new Error('lat and lng must be valid numbers');
  }

  if (lat < 23.5 || lat > 37.5) {
    throw new Error('Latitude must be between 23.5 and 37.5 (Pakistan)');
  }

  if (lng < 60.0 || lng > 78.0) {
    throw new Error('Longitude must be between 60.0 and 78.0 (Pakistan)');
  }

  // Save normalized version for controller
  req.body.normalizedCenter = { lat, lng };
  return true;
};

const convertAndValidatePolygon = (polygon, { req }) => {
  if (!polygon || polygon.type !== 'Polygon' || !Array.isArray(polygon.coordinates)) {
    throw new Error('Invalid GeoJSON Polygon format');
  }

  const convertedRings = polygon.coordinates.map(ring => {
    if (!Array.isArray(ring) || ring.length < 4) {
      throw new Error('Each polygon ring must have at least 4 points');
    }

    const mongoRing = ring.map(point => {
      const lat = toFloat(point[0]);
      const lng = toFloat(point[1]);
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Polygon coordinates must be valid numbers');
      }
      return [lng, lat]; // → [lng, lat] for MongoDB
    });

    // Auto-close ring
    const first = mongoRing[0];
    const last = mongoRing[mongoRing.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      mongoRing.push([...first]);
    }

    return mongoRing;
  });

  // Save ready-to-use MongoDB polygon
  req.body.mongoPolygon = {
    type: 'Polygon',
    coordinates: convertedRings
  };

  return true;
};

/* ------------------------------------------------------------------
   ADMIN: ADD AREA
------------------------------------------------------------------ */
exports.addArea = [
  body('name')
    .trim()
    .notEmpty().withMessage('Area name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .default('Lahore'),

  body('center')
    .exists({ checkNull: true }).withMessage('Center is required')
    .bail()
    .custom(validatePakistanPoint),

  body('polygon')
    .exists({ checkNull: true }).withMessage('Polygon is required')
    .bail()
    .custom(convertAndValidatePolygon),
];

/* ------------------------------------------------------------------
   ADMIN: UPDATE AREA
------------------------------------------------------------------ */
exports.updateArea = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }),

  body('center')
    .optional()
    .custom(validatePakistanPoint),

  body('polygon')
    .optional()
    .custom((value, { req }) => {
      if (!value) return true;
      return convertAndValidatePolygon(value, { req });
    }),
];

/* ------------------------------------------------------------------
   PUBLIC: /api/areas/check?lat=...&lng=...
   NOW ACCEPTS STRINGS AND NUMBERS!
------------------------------------------------------------------ */
exports.checkAreaQuery = [
  query('lat')
    .notEmpty().withMessage('Latitude is required')
    .trim()
    .customSanitizer(toFloat)
    .isFloat({ min: 23.5, max: 37.5 })
    .withMessage('Latitude must be between 23.5 and 37.5'),

  query('lng')
    .notEmpty().withMessage('Longitude is required')
    .trim()
    .customSanitizer(toFloat)
    .isFloat({ min: 60.0, max: 78.0 })
    .withMessage('Longitude must be between 60.0 and 78.0'),
];