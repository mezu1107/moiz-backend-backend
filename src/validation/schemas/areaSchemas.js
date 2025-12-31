const { body, query } = require('express-validator');

const toFloat = val => (typeof val === 'string' ? parseFloat(val.trim()) : val);

const validatePakistanPoint = (value, { req }) => {
  if (!value || typeof value !== 'object' || typeof value.lat !== 'number' && typeof value.lat !== 'string' || typeof value.lng !== 'number' && typeof value.lng !== 'string') {
    throw new Error('Center must be an object with lat and lng properties');
  }

  const lat = toFloat(value.lat);
  const lng = toFloat(value.lng);

  if (isNaN(lat) || isNaN(lng)) {
    throw new Error('lat and lng must be valid numbers');
  }

  if (lat < 23.5 || lat > 37.5) {
    throw new Error('Latitude must be between 23.5 and 37.5 (Pakistan range)');
  }

  if (lng < 60.5 || lng > 78.0) {
    throw new Error('Longitude must be between 60.5 and 78.0 (Pakistan range)');
  }

  req.body.normalizedCenter = { lat, lng };
  return true;
};

const convertPolygonToMongo = (polygon, { req }) => {
  if (
    !polygon ||
    polygon.type !== 'Polygon' ||
    !Array.isArray(polygon.coordinates) ||
    polygon.coordinates.length === 0
  ) {
    throw new Error('Invalid GeoJSON Polygon');
  }

  const coordinates = polygon.coordinates.map((ring, ringIndex) => {
    if (!Array.isArray(ring) || ring.length < 4) {
      throw new Error(`Polygon ring ${ringIndex} must have at least 4 points`);
    }

    const mongoRing = ring.map((coord, idx) => {
      if (!Array.isArray(coord) || coord.length !== 2) {
        throw new Error(`Invalid coordinate at position ${idx} in ring ${ringIndex}`);
      }

      const lng = toFloat(coord[0]); // GeoJSON: [lng, lat]
      const lat = toFloat(coord[1]);

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error(`Invalid numeric coordinates at ${idx} in ring ${ringIndex}`);
      }

      if (lat < 23.5 || lat > 37.5) {
        throw new Error(`Latitude out of Pakistan range at position ${idx} in ring ${ringIndex}`);
      }

      if (lng < 60.5 || lng > 78.0) {
        throw new Error(`Longitude out of Pakistan range at position ${idx} in ring ${ringIndex}`);
      }

      return [lng, lat]; // MongoDB: [lng, lat]
    });

    // Auto-close ring
    const first = mongoRing[0];
    const last = mongoRing[mongoRing.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      mongoRing.push([...first]);
    }

    return mongoRing;
  });

  req.body.mongoPolygon = {
    type: 'Polygon',
    coordinates,
  };

  return true;
};

// ====================== ADD AREA ======================
exports.addArea = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Area name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Area name must be between 2 and 50 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters')
    .default('RAWALPINDI'),

  body('center')
    .exists({ checkNull: true })
    .withMessage('Center is required')
    .bail()
    .custom(validatePakistanPoint),

  body('polygon')
    .exists({ checkNull: true })
    .withMessage('Polygon is required')
    .bail()
    .custom(convertPolygonToMongo),
];

// ====================== UPDATE AREA ======================
exports.updateArea = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Area name must be between 2 and 50 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),

  body('center')
    .optional()
    .custom(validatePakistanPoint),

  body('polygon')
    .optional()
    .custom((value, { req }) => {
      if (value !== undefined) {
        return convertPolygonToMongo(value, { req });
      }
      return true;
    }),
];

// ====================== CHECK AREA QUERY ======================
exports.checkAreaQuery = [
  query('lat')
    .notEmpty()
    .withMessage('Latitude is required')
    .trim()
    .customSanitizer(toFloat)
    .isFloat({ min: 23.5, max: 37.5 })
    .withMessage('Latitude must be between 23.5 and 37.5'),

  query('lng')
    .notEmpty()
    .withMessage('Longitude is required')
    .trim()
    .customSanitizer(toFloat)
    .isFloat({ min: 60.5, max: 78.0 })
    .withMessage('Longitude must be between 60.5 and 78.0'),
];