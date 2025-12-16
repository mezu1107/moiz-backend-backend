// src/routes/order/orderRoutes.js
// FINAL — DECEMBER 2025 — ROLE SAFE & PRODUCTION READY

const express = require('express');
const router = express.Router();

const { auth, optionalAuth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');

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
  requestRefund
} = require('../../controllers/order/orderController');


// ============================================================
// 🌍 PUBLIC / GUEST ROUTES
// ============================================================

router.get('/track/:orderId', trackOrderById);
router.post('/track/by-phone', trackOrdersByPhone);

// Stripe / Payment success (guest + user)
router.route('/success/:orderId')
  .get(optionalAuth, paymentSuccess)
  .post(optionalAuth, paymentSuccess);

// Create order (guest OR logged-in)
router.post('/', optionalAuth, createOrder);


// ============================================================
// 🔐 AUTH REQUIRED
// ============================================================

router.use(auth);


// ============================================================
// 👤 CUSTOMER ROUTES
// ============================================================

router.get('/my', role('customer'), getCustomerOrders);
router.get('/:id', role('customer'), getOrderById);

router.patch('/:id/cancel', role('customer'), cancelOrder);
router.patch('/:id/reject', role('customer'), customerRejectOrder);

router.post('/:id/request-refund', role('customer'), requestRefund);
router.get('/:id/receipt', role(['customer', 'admin']), generateReceipt);


// ============================================================
// 🍳 KITCHEN ROUTES
// ============================================================

router.patch(
  '/:id/status',
  role(['admin', 'kitchen']),
  updateOrderStatus
);


// ============================================================
// 🛵 RIDER ROUTES
// ============================================================

router.patch(
  '/:id/status',
  role(['admin', 'rider']),
  updateOrderStatus
);


// ============================================================
// 🚚 DELIVERY MANAGER
// ============================================================

router.patch(
  '/:id/assign',
  role(['admin', 'delivery_manager']),
  assignRider
);


// ============================================================
// 💰 FINANCE & SUPPORT
// ============================================================

router.get(
  '/',
  role(['admin', 'finance', 'support']),
  getAllOrders
);


// ============================================================
// 👑 ADMIN ONLY
// ============================================================

router.patch(
  '/:id/admin-reject',
  role('admin'),
  adminRejectOrder
);

module.exports = router;
