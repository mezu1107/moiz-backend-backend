// src/validation/schemas/riderSchemas.js
const { body, param } = require('express-validator');
const User = require('../../models/user/User');
const Order = require('../../models/order/Order');

// Reusable
const validateRiderId = [
  param('id').trim().isMongoId().withMessage('Invalid rider ID')
];
const getAvailableRidersSchema = {}; // Empty - query params only
const validateOrderIdParam = [
  param('id').trim().isMongoId().withMessage('Invalid order ID')
];

// ==================== RIDER APP ====================
const updateLocation = [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90').toFloat(),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180').toFloat()
];

const updateOrderLocation = [
  ...validateOrderIdParam,
  ...updateLocation
];

const applyAsRider = [
  body('cnicNumber').trim().matches(/^\d{5}-\d{7}-\d{1}$/).withMessage('CNIC format: 35202-1234567-1'),
  body('vehicleType').optional().isIn(['bike', 'car', 'bicycle']),
  body('vehicleNumber').trim().isLength({ min: 3, max: 15 }).matches(/^[A-Z0-9-]+$/i),
  body('cnicFront').isURL({ require_tld: false }),
  body('cnicBack').isURL({ require_tld: false }),
  body('drivingLicense').isURL({ require_tld: false }),
  body('riderPhoto').isURL({ require_tld: false })
];

const rejectOrder = [
  ...validateOrderIdParam,
  body('reason').optional().trim().isLength({ min: 5, max: 200 })
];

const collectCash = [
  ...validateOrderIdParam,
  body('collectedAmount').isFloat({ gt: 0 }).withMessage('Collected amount must be positive').toFloat()
];

const acceptOrder = validateOrderIdParam;
const pickupOrder = validateOrderIdParam;
const deliverOrder = validateOrderIdParam;

// ==================== ADMIN ====================
// Allow admin to assign even if rider is OFFLINE
const assignOrderToRider = [
  param('orderId')
    .trim()
    .isMongoId()
    .withMessage('Invalid order ID format'),

  body('riderId')
    .trim()
    .isMongoId()
    .withMessage('riderId must be a valid MongoDB ObjectId')
    .bail()
    .custom(async (riderId) => {
      const rider = await User.findOne({
        _id: riderId,
        role: 'rider',
        riderStatus: 'approved',
        isBlocked: false,
        isPermanentlyBanned: false,
        isDeleted: { $ne: true }
      }).lean();

      if (!rider) {
        throw new Error('Rider not found, not approved, blocked, banned, or deleted');
      }
      return true;
    })
];

const updateRiderStatus = [
  body('riderStatus').isIn(['pending', 'approved', 'rejected'])
];

const rejectRider = [
  body('reason').trim().isLength({ min: 10, max: 500 })
];

const blockRider = [
  body('reason').optional().trim().isLength({ min: 5, max: 300 })
];

const permanentlyBanRider = [
  body('reason').trim().isLength({ min: 10, max: 500 })
];

const promoteUserToRider = [
  body('vehicleType').optional().isIn(['bike', 'car', 'bicycle']),
  body('vehicleNumber').optional().trim().isLength({ min: 3, max: 15 }).matches(/^[A-Z0-9-]+$/i)
];

module.exports = {
  // Rider Routes
  updateLocation,
  updateOrderLocation,
  applyAsRider,
  acceptOrder,
  rejectOrder,
  pickupOrder,
  deliverOrder,
  collectCash,

  // Admin Routes
  validateRiderId,
  assignOrderToRider,
  updateRiderStatus,
  rejectRider,
  blockRider,
  permanentlyBanRider,
  promoteUserToRider,
  getAvailableRidersSchema
};