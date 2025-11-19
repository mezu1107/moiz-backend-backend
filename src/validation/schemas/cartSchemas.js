// src/validation/schemas/cartSchemas.js
const { body } = require('express-validator');

exports.addToCart = [
  body('menuItemId').isMongoId(),
  body('quantity').optional().isInt({ min: 1, max: 50 }).toInt()
];