// src/routes/order/orderRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth/auth');
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
  trackOrdersByPhone
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
// Use optional auth middleware reference (handle inside auth)
router.post(
  '/',
  auth,                // ← Pass reference, auth middleware decides if guest is allowed
  createOrderSchema,
  validate,
  createOrder
);

// ====================== AUTH REQUIRED FROM HERE ======================
router.use(auth);

// -------------------- CUSTOMER --------------------
router.get('/my', getCustomerOrders);
router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);
router.patch('/:id/reject', rejectOrder, validate, customerRejectOrder);
router.get('/:id/receipt', generateReceipt);

// -------------------- ADMIN & RIDER --------------------
router.use(role(['admin', 'rider']));
router.patch('/:id/status', updateStatus, validate, updateOrderStatus);

// -------------------- ADMIN ONLY --------------------
router.use(role(['admin']));
router.patch('/:id/admin-reject', rejectOrder, validate, adminRejectOrder);
router.patch('/:id/assign', assignRiderSchema, validate, assignRider);
router.get('/', getAllOrders);

module.exports = router;
