// src/validation/schemas/orderSchemas.js
const { body } = require('express-validator');

exports.createOrder = [
  body('items').isArray({ min: 1 }),
  body('items.*.menuItem').isMongoId(),
  body('items.*.quantity').isInt({ min: 1, max: 50 }),
  body('addressId').isMongoId()
];

exports.updateStatus = [
  body('status').isIn(['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'rejected'])
];

exports.assignRider = [
  body('riderId').isMongoId().withMessage('Valid rider ID required')
];

exports.rejectOrder = [
  body('reason').optional().isString(),
  body('note').optional().isString().isLength({ max: 200 })
];