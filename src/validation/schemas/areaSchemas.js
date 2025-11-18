// src/validation/schemas/areaSchemas.js
const { body } = require('express-validator');

exports.addArea = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Area name must be 2-100 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('City name invalid'),

  body('center.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude required (-90 to 90)'),

  body('center.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude required (-180 to 180)'),

  body('polygon')
    .isObject()
    .withMessage('Polygon is required'),

  body('polygon.type')
    .equals('Polygon')
    .withMessage('Type must be Polygon'),

  body('polygon.coordinates')
    .isArray({ min: 1 })
    .withMessage('Coordinates array required')
    .custom((coords) => {
      if (!Array.isArray(coords[0]) || !Array.isArray(coords[0][0])) {
        throw new Error('Invalid GeoJSON Polygon format');
      }
      // Must have at least 4 points + closing point
      if (coords[0].length < 4) {
        throw new Error('Polygon must have at least 4 points');
      }
      return true;
    })
];