// src/validation/schemas/areaSchemas.js
const { body } = require('express-validator');

exports.addArea = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('city').optional().trim().isLength({ min: 2 }),
  body('center.lat').isFloat({ min: -90, max: 90 }),
  body('center.lng').isFloat({ min: -180, max: 180 }),
  body('polygon').isObject(),
  body('polygon.type').equals('Polygon'),
  body('polygon.coordinates').isArray({ min: 1 }).custom((coords) => {
    if (!Array.isArray(coords[0]) || !Array.isArray(coords[0][0])) {
      throw new Error('Invalid GeoJSON Polygon format');
    }
    if (coords[0].length < 4) {
      throw new Error('Polygon must have at least 4 points');
    }
    return true;
  })
];