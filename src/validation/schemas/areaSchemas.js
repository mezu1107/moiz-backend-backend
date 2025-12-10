// src/validation/schemas/areaSchemas.js
const { body, query } = require('express-validator');

const toFloat = (val) => (typeof val === 'string' ? parseFloat(val.trim()) : val);

const validatePakistanPoint = (value) => {
  const lat = toFloat(value?.lat);
  const lng = toFloat(value?.lng);

  if (isNaN(lat) || isNaN(lng)) throw new Error('lat and lng must be valid numbers');
  if (lat < 23.5 || lat > 37.5) throw new Error('Latitude must be in Pakistan range');
  if (lng < 60.0 || lng > 78.0) throw new Error('Longitude must be in Pakistan range');

  return { lat, lng };
};

const convertPolygonToMongo = (polygon, { req }) => {
  if (!polygon || polygon.type !== 'Polygon' || !Array.isArray(polygon.coordinates)) {
    throw new Error('Invalid GeoJSON Polygon');
  }

  const coordinates = polygon.coordinates.map(ring => {
    if (!Array.isArray(ring) || ring.length < 4) {
      throw new Error('Polygon ring must have ≥4 points');
    }
    const mongoRing = ring.map(([lat, lng]) => {
      const l = toFloat(lat);
      const g = toFloat(lng);
      if (isNaN(l) || isNaN(g)) throw new Error('Invalid coordinates in polygon');
      return [g, l]; // [lng, lat]
    });

    // Auto-close
    if (mongoRing[0][0] !== mongoRing[mongoRing.length - 1][0] ||
        mongoRing[0][1] !== mongoRing[mongoRing.length - 1][1]) {
      mongoRing.push(mongoRing[0]);
    }
    return mongoRing;
  });

  req.body.mongoPolygon = { type: 'Polygon', coordinates };
  return true;
};

// ADD AREA
exports.addArea = [
  body('name')
    .trim()
    .notEmpty().withMessage('Area name is required')
    .isLength({ min: 2, max: 50 }),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .default('Lahore'),

  body('center')
    .exists().withMessage('Center is required')
    .custom((value, { req }) => {
      req.body.normalizedCenter = validatePakistanPoint(value);
      return true;
    }),

  body('polygon')
    .exists().withMessage('Polygon is required')
    .custom(convertPolygonToMongo),
];

// UPDATE AREA
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
    .custom((value, { req }) => {
      if (value) req.body.normalizedCenter = validatePakistanPoint(value);
      return true;
    }),

  body('polygon')
    .optional()
    .custom((value, { req }) => {
      if (value) convertPolygonToMongo(value, { req });
      return true;
    }),
];

// CHECK AREA QUERY
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