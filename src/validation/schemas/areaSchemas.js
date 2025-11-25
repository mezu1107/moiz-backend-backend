const { body, query } = require('express-validator');

exports.addArea = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Area name must be 2–50 characters'),

  body('city')
    .optional()
    .trim()
    .default('Lahore'),

  body('center.lat')
    .isFloat({ min: 23.5, max: 37.5 })
    .withMessage('Center latitude invalid'),

  body('center.lng')
    .isFloat({ min: 60.0, max: 78.0 })
    .withMessage('Center longitude invalid'),

  body('polygon')
    .isObject()
    .withMessage('polygon must be a GeoJSON object'),

  body('polygon.type')
    .equals('Polygon')
    .withMessage('polygon.type must be "Polygon"'),

  body('polygon.coordinates')
    .isArray({ min: 1 })
    .withMessage('Coordinates must contain at least one linear ring'),

  // Each ring must have at least 4 points
  body('polygon.coordinates.*')
    .isArray({ min: 4 })
    .withMessage('Polygon must have at least 4 points in each ring'),

  // Each point must be an array of two numbers
  body('polygon.coordinates.*.*')
    .isArray({ min: 2, max: 2 })
    .withMessage('Each point must be [lng, lat]'),

  // Each coordinate must be a float
  body('polygon.coordinates.*.*.*')
    .isFloat()
    .withMessage('Coordinates must be numbers')
];

exports.checkAreaQuery = [
  query('lat')
    .notEmpty()
    .isFloat({ min: 23.5, max: 37.5 })
    .withMessage('Valid latitude required (23.5–37.5)')
    .toFloat(),

  query('lng')
    .notEmpty()
    .isFloat({ min: 60.0, max: 78.0 })
    .withMessage('Valid longitude required (60–78)')
    .toFloat()
];
