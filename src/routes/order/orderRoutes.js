// src/routes/order/orderRoutes.js
// PRODUCTION READY — DECEMBER 16, 2025

const express = require('express');
const router = express.Router();

const { auth, optionalAuth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validateRequest = require('../../middleware/validate/validate');

const {
  createOrderSchema,
  trackByPhoneSchema,
  updateStatusSchema,
  assignRiderSchema,
  rejectOrderSchema,
  requestRefundSchema,
} = require('../../validation/schemas/orderSchemas');

const {
  createOrder,
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
  trackOrdersByPhone,
  paymentSuccess,
  requestRefund,
} = require('../../controllers/order/orderController');


// ============================================================
// 🌍 PUBLIC / GUEST ROUTES
// ============================================================

// Track by order ID (public)
router.get('/track/:orderId', trackOrderById);

// Track by phone (public)
router.post('/track/by-phone', trackByPhoneSchema, validateRequest, trackOrdersByPhone);

// Payment success callback
router.route('/success/:orderId')
  .get(optionalAuth, paymentSuccess)
  .post(optionalAuth, paymentSuccess);

// Create order — guest or logged-in
router.post('/', optionalAuth, createOrderSchema, validateRequest, createOrder);

// ============================================================
// 🔐 AUTH REQUIRED FROM HERE
// ============================================================

router.use(auth);

// ============================================================
// 👤 CUSTOMER ROUTES
// ============================================================

// Get customer orders
router.get('/my', role('customer'), getCustomerOrders);

// Get order by ID
router.get('/:id', role('customer'), getOrderById);

// Cancel order
router.patch('/:id/cancel', role('customer'), cancelOrder);

// Customer reject order
router.patch('/:id/reject', role('customer'), rejectOrderSchema, validateRequest, customerRejectOrder);

// Request refund
router.post('/:id/request-refund', role('customer'), requestRefundSchema, validateRequest, requestRefund);

// Generate receipt
router.get('/:id/receipt', role(['customer', 'admin']), generateReceipt);

// ============================================================
// 🍳 KITCHEN, RIDER, DELIVERY MANAGER, ADMIN — STATUS UPDATE
// ============================================================

router.patch(
  '/:id/status',
  role(['admin', 'kitchen', 'rider', 'delivery_manager']),
  updateStatusSchema,
  validateRequest,
  updateOrderStatus
);

// ============================================================
// 🚚 ASSIGN RIDER
// ============================================================

router.patch(
  '/:id/assign',
  role(['admin', 'delivery_manager']),
  assignRiderSchema,
  validateRequest,
  assignRider
);

// ============================================================
// 💰 LIST ALL ORDERS
// ============================================================

router.get(
  '/',
  role(['admin', 'finance', 'support']),
  getAllOrders
);

// ============================================================
// 👑 ADMIN REJECT
// ============================================================

router.patch(
  '/:id/admin-reject',
  role('admin'),
  rejectOrderSchema,
  validateRequest,
  adminRejectOrder
);

module.exports = router;
