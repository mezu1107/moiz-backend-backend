// src/routes/order/orderRoutes.js
const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');
const { orderSchemas } = require('../../validation/schemas');
const {
  createOrder,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
  customerRejectOrder,
  adminRejectOrder,
  updateOrderStatus,
  assignRider
} = require('../../controllers/order/orderController');

router.use(auth);

// === Customer Routes ===
router.post('/', orderSchemas.createOrder, validate, createOrder);
router.get('/my', getCustomerOrders);
router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);
router.patch('/:id/reject', orderSchemas.rejectOrder, validate, customerRejectOrder);

// === Admin Routes ===
router.use(role(['admin']));
router.patch('/:id/status', orderSchemas.updateStatus, validate, updateOrderStatus);
router.patch('/:id/assign', orderSchemas.assignRider, validate, assignRider);
router.patch('/:id/reject', orderSchemas.rejectOrder, validate, adminRejectOrder);

module.exports = router;