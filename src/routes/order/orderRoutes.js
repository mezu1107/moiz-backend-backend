// src/routes/order/orderRoutes.js
// PRODUCTION READY — DECEMBER 17, 2025

const express = require('express');
const mongoose = require('mongoose');
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

// Middleware to validate :orderId as a MongoDB ObjectId
const validateOrderIdParam = (req, res, next) => {
  const { orderId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ success: false, message: 'Invalid order ID' });
  }
  next();
};

// Track by order ID (public) with ObjectId validation
router.get('/track/:orderId', validateOrderIdParam, trackOrderById);

// Track by phone (public)
router.post('/track/by-phone', trackByPhoneSchema, validateRequest, trackOrdersByPhone);

// Payment success callback
router.route('/success/:orderId')
  .all(validateOrderIdParam)
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

router.get('/my', role('customer'), getCustomerOrders);
router.get('/:id', role('customer'), getOrderById);
router.patch('/:id/cancel', role('customer'), cancelOrder);
router.patch('/:id/reject', role('customer'), rejectOrderSchema, validateRequest, customerRejectOrder);
router.post('/:id/request-refund', role('customer'), requestRefundSchema, validateRequest, requestRefund);
router.get('/:id/receipt', role(['customer', 'admin']), generateReceipt);

// ============================================================
// 🍳 KITCHEN, RIDER, DELIVERY MANAGER, ADMIN — STATUS UPDATE
// ============================================================

router.patch('/:id/status', role(['admin', 'kitchen', 'rider', 'delivery_manager']), updateStatusSchema, validateRequest, updateOrderStatus);

// ============================================================
// 🚚 ASSIGN RIDER
// ============================================================

router.patch('/:id/assign', role(['admin', 'delivery_manager']), assignRiderSchema, validateRequest, assignRider);

// ============================================================
// 💰 LIST ALL ORDERS
// ============================================================

router.get('/', role(['admin', 'finance', 'support']), getAllOrders);

// ============================================================
// 👑 ADMIN REJECT
// ============================================================

router.patch('/:id/admin-reject', role('admin'), rejectOrderSchema, validateRequest, adminRejectOrder);

module.exports = router;
