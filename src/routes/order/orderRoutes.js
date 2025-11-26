// src/routes/order/orderRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const {
  createOrder,
  createGuestOrder,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
  customerRejectOrder,
  updateOrderStatus,
  assignRider,
  adminRejectOrder,
  getAllOrders,
  generateReceipt,
  trackOrderById,
  trackOrdersByPhone
} = require('../../controllers/order/orderController');

const {
  getOrderAnalytics,
  getRealtimeStats
} = require('../../controllers/order/orderAnalyticsController');

const {
  createOrder: createOrderSchema,
  createGuestOrder: createGuestOrderSchema,
  trackByPhone: trackByPhoneSchema,
  updateStatus: updateStatusSchema,
  assignRider: assignRiderSchema,
  rejectOrder: rejectOrderSchema
} = require('../../validation/schemas/orderSchemas');

// PUBLIC TRACKING
router.get('/track/:orderId', trackOrderById);
router.post('/track/by-phone', trackByPhoneSchema, validate, trackOrdersByPhone);

// GUEST ORDER
// Replace or add alongside current guest route
router.post('/guest', createGuestOrderSchema, validate, createGuestOrder);
// AUTH REQUIRED
router.use(auth);

// Customer Routes
router.post('/', createOrderSchema, validate, createOrder);
router.get('/my', getCustomerOrders);
router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);
router.patch('/:id/reject', rejectOrderSchema, validate, customerRejectOrder);
router.get('/:id/receipt', generateReceipt);

// Admin & Rider
router.use(role(['admin', 'rider']));
router.patch('/:id/status', updateStatusSchema, validate, updateOrderStatus);

// Admin Only
router.use(role(['admin']));
router.patch('/:id/admin-reject', rejectOrderSchema, validate, adminRejectOrder);
router.patch('/:id/assign', assignRiderSchema, validate, assignRider);
router.get('/', getAllOrders);

// Analytics (Admin Only)
router.get('/analytics', getOrderAnalytics);
router.get('/realtime', getRealtimeStats);

module.exports = router;