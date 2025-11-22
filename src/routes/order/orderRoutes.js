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
  createOrder: createOrderSchema,
  createGuestOrder: createGuestOrderSchema,
  trackByPhone: trackByPhoneSchema,
  updateStatus: updateStatusSchema,
  assignRider: assignRiderSchema,
  rejectOrder: rejectOrderSchema
} = require('../../validation/schemas/orderSchemas');

// ====================== PUBLIC TRACKING ROUTES ======================
router.get('/track/:orderId', trackOrderById);
router.post('/track/by-phone', trackByPhoneSchema, validate, trackOrdersByPhone); // ← Fixed: added validation

// ====================== GUEST ORDER ======================
router.post('/guest', createGuestOrderSchema, validate, createGuestOrder);

// ====================== AUTH REQUIRED ======================
router.use(auth);

router.post('/', createOrderSchema, validate, createOrder);
router.get('/my', getCustomerOrders);
router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);
router.patch('/:id/reject', rejectOrderSchema, validate, customerRejectOrder);
router.get('/:id/receipt', generateReceipt);

// ====================== ADMIN & RIDER ======================
router.use(role(['admin', 'rider']));
router.patch('/:id/status', updateStatusSchema, validate, updateOrderStatus);

// ====================== ADMIN ONLY ======================
router.use(role(['admin']));
router.patch('/:id/admin-reject', rejectOrderSchema, validate, adminRejectOrder);
router.patch('/:id/assign', assignRiderSchema, validate, assignRider);
router.get('/', getAllOrders);

module.exports = router;