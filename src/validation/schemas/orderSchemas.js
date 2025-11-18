// CORRECT WAY — named exports
const { body } = require('express-validator');

const createOrder = [
  body('addressId').isMongoId().withMessage('Valid address ID required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.menuItem').isMongoId().withMessage('Valid menu item ID required'),
  body('items.*.quantity').isInt({ min: 1, max: 50 }).withMessage('Quantity 1-50'),
  body('paymentMethod').optional().isIn(['cash', 'card'])
];

const updateStatus = [
  body('status').isIn(['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'rejected'])
];

const assignRider = [
  body('riderId').isMongoId().withMessage('Valid rider ID required')
];

const rejectOrder = [
  body('reason').optional().trim(),
  body('note').optional().trim().isLength({ max: 200 })
];

// EXPORT AS NAMED
module.exports = {
  createOrder,
  updateStatus,
  assignRider,
  rejectOrder
};