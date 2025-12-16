// src/validation/schemas/reviewSchemas.js
const { body, param } = require('express-validator');

exports.submitReview = [
  body('orderId')
    .isMongoId()
    .withMessage('Valid order ID required'),

  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be 1-5 stars')
    .toInt(),

  body('comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Review too long (max 500 chars)'),

  body('images')
    .optional()
    .isArray({ max: 4 })
    .withMessage('Max 4 images allowed')
];

exports.replyReview = [
  param('id').isMongoId(),
  body('text')
    .notEmpty()
    .withMessage('Reply text required')
    .trim()
];

exports.reviewAction = [
  param('id').isMongoId(),
  body('action')
    .isIn(['approve', 'reject', 'feature', 'unfeature'])
    .withMessage('Invalid action')
];