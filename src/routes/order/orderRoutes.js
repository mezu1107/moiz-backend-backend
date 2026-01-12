// src/routes/order/orderRoutes.js
// PRODUCTION READY — DECEMBER 26, 2025 → UPDATED JANUARY 12, 2026
// Added: Admin-only route for new/pending orders (real-time dashboard support)

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
// Middleware: Validate MongoDB ObjectId for :orderId params
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
// 🌍 PUBLIC / GUEST ROUTES (no auth required)
// ============================================================

// Track single order by ID (public — guests use this)
router.get('/track/:orderId', validateOrderIdParam, trackOrderById);

// Track multiple orders by phone number (public — guests use this)
router.post('/track/by-phone', trackByPhoneSchema, validateRequest, trackOrdersByPhone);

// Payment success callback (supports GET redirect & POST webhook)
router.route('/success/:orderId')
  .all(validateOrderIdParam)
  .get(optionalAuth, paymentSuccess)
  .post(optionalAuth, paymentSuccess);

// Create new order (guest or authenticated)
router.post('/', optionalAuth, createOrderSchema, validateRequest, createOrder);

// Reorder from previous order (guest or authenticated — public access)
router.post(
  '/:orderId/reorder',
  validateOrderIdParam,
  optionalAuth,
  reorderOrder
);

// ============================================================
// 🔐 AUTH REQUIRED FROM HERE
// ============================================================
router.use(auth);

// ============================================================
// 👤 CUSTOMER ROUTES (protected)
// ============================================================
router.get('/my', getCustomerOrders); // List my orders

router.get('/:id', validateOrderIdParam, getOrderById);
router.patch('/:id/cancel', validateOrderIdParam, cancelOrder);
router.patch('/:id/reject', validateOrderIdParam, rejectOrderSchema, validateRequest, customerRejectOrder);
router.post('/:id/request-refund', validateOrderIdParam, requestRefundSchema, validateRequest, requestRefund);
router.get('/:id/timeline', validateOrderIdParam, getOrderTimeline);
router.get('/:id/receipt', validateOrderIdParam, generateReceipt); // Customer + Admin allowed

// ============================================================
// 🍳 KITCHEN, RIDER, DELIVERY MANAGER, ADMIN — STATUS UPDATE
// ============================================================
router.patch(
  '/:id/status',
  validateOrderIdParam,
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
  validateOrderIdParam,
  role(['admin', 'delivery_manager']),
  assignRiderSchema,
  validateRequest,
  assignRider
);

// ============================================================
// 👑 ADMIN / SUPPORT / FINANCE / KITCHEN — LIST ALL ORDERS
// ============================================================
router.get('/', role(['admin', 'finance', 'support', 'kitchen']), getAllOrders);

// ============================================================
// NEW: ADMIN-ONLY — Get recent new/pending orders (for real-time dashboard)
// ============================================================
router.get(
  '/admin/new-orders',
  role(['admin', 'kitchen']),
  async (req, res) => {
    try {
      const recentNewOrders = await Order.find({
        status: { $in: ['pending', 'pending_payment'] },
      })
        .populate('customer', 'name phone')
        .populate('guestInfo', 'name phone') // guest fallback
        .sort({ placedAt: -1 })
        .limit(10)
        .lean();

      res.json({
        success: true,
        newOrders: recentNewOrders,
      });
    } catch (err) {
      console.error('Admin new orders error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch new orders' });
    }
  }
);

// ============================================================
// 👑 ADMIN ONLY — OVERRIDE REJECT
// ============================================================
router.patch(
  '/:id/admin-reject',
  validateOrderIdParam,
  role('admin'),
  rejectOrderSchema,
  validateRequest,
  adminRejectOrder
);

module.exports = router;