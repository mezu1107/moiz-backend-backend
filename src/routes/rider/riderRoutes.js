
// CORRECT (Ab yeh kar do)
const express = require('express');
const router = express.Router();


const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const {
  updateLocation,
  toggleAvailability,
  updateOrderLocation,
  getMyOrders,
  getRiderProfile
} = require('../../controllers/rider/riderController');

const { 
  updateLocation: locSchema, 
  updateOrderLocation: orderLocSchema 
} = require('../../validation/schemas/riderSchemas');

router.use(auth, role('rider'));
router.use((req, res, next) => {
  if (req.user.riderStatus !== 'approved') {
    return res.status(403).json({ success: false, message: 'Not approved' });
  }
  next();
});

router.patch('/location', locSchema, validate, updateLocation);
router.patch('/availability', toggleAvailability);
router.patch('/order/:id/location', orderLocSchema, validate, updateOrderLocation);
router.get('/orders', getMyOrders);
router.get('/profile', getRiderProfile);

module.exports = router; // YE BHI HAI