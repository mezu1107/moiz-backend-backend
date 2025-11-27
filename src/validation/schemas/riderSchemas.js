const { body, param, query } = require('express-validator');

module.exports = {
  updateLocation: [
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90').toFloat(),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180').toFloat()
  ],

  updateOrderLocation: [
    param('id').isMongoId().withMessage('Valid order ID required'),
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required').toFloat(),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required').toFloat()
  ],

  updateRiderStatus: [
    param('id').isMongoId().withMessage('Valid rider ID required'),
    body('riderStatus').isIn(['pending', 'approved', 'rejected']).withMessage('riderStatus must be pending, approved, or rejected')
  ],

promoteUserToRider: [
  param('id').isMongoId().withMessage('Valid user ID is required'),
  body('vehicleType').optional().isIn(['bike', 'car', 'bicycle']),
  body('vehicleNumber').optional().isLength({ min: 3, max: 15 }).matches(/^[A-Z0-9-]+$/i)
],

  permanentlyBanRider: [
    param('id').isMongoId(),
    body('reason').optional().isString().trim()
  ],

  applyAsRider: [
    body('cnicNumber').matches(/^\d{5}-\d{7}-\d{1}$/).withMessage('Valid CNIC required: 35202-1234567-8'),
    body('vehicleType').isIn(['bike', 'car', 'bicycle']),
    body('vehicleNumber').isLength({ min: 3, max: 10 }).matches(/^[A-Z0-9-]+$/i),
    body('cnicFront').isURL(),
    body('cnicBack').isURL(),
    body('drivingLicense').isURL(),
    body('riderPhoto').isURL()
  ]
};
