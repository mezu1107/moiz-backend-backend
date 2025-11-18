// src/validation/schemas/areaSchemas.js
const { body } = require('express-validator');

exports.addArea = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Area name is required'),

  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),

  body('center.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),

  body('center.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),

  body('polygon').custom((value) => {
    if (!value || value.type !== 'Polygon')
      throw new Error('Polygon must be a valid GeoJSON Polygon');

    if (
      !Array.isArray(value.coordinates) ||
      value.coordinates.length === 0 ||
      !Array.isArray(value.coordinates[0])
    ) {
      throw new Error('Polygon coordinates are invalid');
    }

    return true;
  })
];
