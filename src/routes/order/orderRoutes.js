// src/routes/order/orderRoutes.js

const express = require('express');
const router = express.Router();
const { auth, optionalAuth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

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
  paymentSuccess
} = require('../../controllers/order/orderController');

const {
  createOrderSchema,
  trackByPhone,
  updateStatus,
  assignRiderSchema,
  rejectOrder
} = require('../../validation/schemas/orderSchemas');

// ====================== PUBLIC TRACKING ======================
router.get('/track/:orderId', trackOrderById);
router.post('/track/by-phone', trackByPhone, validate, trackOrdersByPhone);

// ====================== UNIFIED ORDER — GUEST + AUTH ======================
router.post(
  '/',
  optionalAuth,
  createOrderSchema,
  validate,
  createOrder
);

// ====================== PAYMENT SUCCESS (PUBLIC) ======================
router.post('/success/:orderId', optionalAuth, paymentSuccess); // Stripe callback & frontend request
router.get('/success/:orderId', optionalAuth, paymentSuccess);  // Browser redirect after payment

// ====================== AUTH REQUIRED BELOW ======================
router.use(auth);

// Customer routes
router.get('/my', getCustomerOrders);
router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);
router.patch('/:id/reject', rejectOrder, validate, customerRejectOrder);
router.get('/:id/receipt', generateReceipt);

// Admin & Rider routes
router.use(role(['admin', 'rider']));
router.patch('/:id/status', updateStatus, validate, updateOrderStatus);

// Admin only
router.use(role(['admin']));
router.patch('/:id/admin-reject', rejectOrder, validate, adminRejectOrder);
router.patch('/:id/assign', assignRiderSchema, validate, assignRider);
router.get('/', getAllOrders);

module.exports = router;
