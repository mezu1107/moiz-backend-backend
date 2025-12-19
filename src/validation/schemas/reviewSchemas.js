// src/validation/schemas/reviewSchemas.js
const { body, param } = require('express-validator');

exports.submitReview = [
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
    .toInt(),
  body('comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters'),
  body('images')
    .optional()
    .isArray({ max: 4 })
    .withMessage('Maximum 4 images allowed')
    .custom((arr) => arr.every((url) => typeof url === 'string' && url.trim().length > 0))
    .withMessage('Images must be valid URLs'),
];

exports.replyReview = [
  param('id').isMongoId().withMessage('Valid review ID required'),
  body('text')
    .notEmpty()
    .withMessage('Reply text is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Reply must be 1–1000 characters'),
];

exports.reviewAction = [
  param('id').isMongoId().withMessage('Valid review ID required'),
  body('action')
    .isIn(['approve', 'reject', 'feature', 'unfeature'])
    .withMessage('Action must be one of: approve, reject, feature, unfeature'),
];

exports.deleteReview = [
  param('id').isMongoId().withMessage('Valid review ID required'),
  body('hardDelete')
    .optional()
    .isBoolean()
    .withMessage('hardDelete must be a boolean')
    .toBoolean(),
];