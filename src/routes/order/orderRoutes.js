// src/routes/order/orderRoutes.js
// PRODUCTION READY — DECEMBER 26, 2025
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
  reorderOrder,
  getOrderTimeline,
} = require('../../controllers/order/orderController');

// ============================================================
// Middleware: Validate MongoDB ObjectId for :orderId (public routes)
// ============================================================
const validateOrderIdParam = (req, res, next) => {
  const { orderId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID',
    });
  }
  next();
};

// ============================================================
// 🌍 PUBLIC / GUEST ROUTES
// ============================================================
// Track single order by ID (public)
router.get('/track/:orderId', validateOrderIdParam, trackOrderById);

// Track multiple orders by phone (public)
router.post('/track/by-phone', trackByPhoneSchema, validateRequest, trackOrdersByPhone);

// Payment success callback (supports GET redirect & POST webhook)
router.route('/success/:orderId')
  .all(validateOrderIdParam)
  .get(optionalAuth, paymentSuccess)
  .post(optionalAuth, paymentSuccess);

// Create new order (guest or authenticated)
router.post('/', optionalAuth, createOrderSchema, validateRequest, createOrder);

// Reorder from previous order (guest or authenticated) — PUBLIC ACCESS
router.post(
  '/:orderId/reorder',
  validateOrderIdParam,
  optionalAuth,     // Allows guests via tracking link
  reorderOrder
);
// ============================================================
// 🔐 AUTH REQUIRED FROM HERE
// ============================================================
router.use(auth);

// ============================================================
// 👤 CUSTOMER ROUTES (protected by role middleware where needed)
// ============================================================
router.get('/my', getCustomerOrders); // Customer can list their orders

router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);
router.patch('/:id/reject', rejectOrderSchema, validateRequest, customerRejectOrder);
router.post('/:id/request-refund', requestRefundSchema, validateRequest, requestRefund);
router.get('/:id/timeline', getOrderTimeline);
router.get('/:id/receipt', generateReceipt); // Customer + Admin allowed in controller

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
// 🚚 ASSIGN RIDER (Admin + Delivery Manager only)
// ============================================================
router.patch(
  '/:id/assign',
  role(['admin', 'delivery_manager']),
  assignRiderSchema,
  validateRequest,
  assignRider
);

// ============================================================
// 💰 ADMIN / SUPPORT / FINANCE — LIST ALL ORDERS
// ============================================================
router.get('/', role(['admin', 'finance', 'support', 'kitchen']), getAllOrders);
// ============================================================
// 👑 ADMIN ONLY — OVERRIDE REJECT
// ============================================================
router.patch(
  '/:id/admin-reject',
  role('admin'),
  rejectOrderSchema,
  validateRequest,
  adminRejectOrder
);

module.exports = router;