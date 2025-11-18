// src/routes/order/orderRoutes.js
const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

// IMPORT VALIDATION DIRECTLY — FIXED
const {
  createOrder: createOrderValidation,
  updateStatus,
  assignRider,
  rejectOrder
} = require('../../validation/schemas/orderSchemas');

// CONTROLLERS
const {
  createOrder,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
  customerRejectOrder,
  adminRejectOrder,
  updateOrderStatus,
  assignRider: assignRiderController
} = require('../../controllers/order/orderController');

// ======================== ALL USERS (Authenticated) ========================
router.use(auth);

// Customer Routes
router.post('/', createOrderValidation, validate, createOrder);
router.get('/my', getCustomerOrders);
router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);
router.patch('/:id/reject', rejectOrder, validate, customerRejectOrder);

// ======================== ADMIN ONLY ========================
router.use(role(['admin']));

router.patch('/:id/status', updateStatus, validate, updateOrderStatus);
router.patch('/:id/assign', assignRider, validate, assignRiderController);
router.patch('/:id/reject', rejectOrder, validate, adminRejectOrder);

// Optional: Admin get all orders
router.get('/admin/all', async (req, res) => {
  try {
    const orders = await require('../../models/order/Order')
      .find()
      .populate('customer', 'name phone')
      .populate('rider', 'name phone')
      .populate('area', 'name')
      .sort({ placedAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;