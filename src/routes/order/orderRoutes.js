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
  getAllOrders
} = require('../../controllers/order/orderController');

const {
  createOrder: createOrderSchema,
  updateStatus: updateStatusSchema,
  assignRider: assignRiderSchema,
  rejectOrder: rejectOrderSchema
} = require('../../validation/schemas/orderSchemas');

router.use(auth);

router.post('/', createOrderSchema, validate, createOrder);
router.get('/my', getCustomerOrders);
router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);
router.patch('/:id/reject', rejectOrderSchema, validate, customerRejectOrder);

router.use(role(['admin', 'rider']));
router.patch('/:id/status', updateStatusSchema, validate, updateOrderStatus);

router.use(role(['admin']));
router.patch('/:id/assign', assignRiderSchema, validate, assignRider);
router.patch('/:id/reject', rejectOrderSchema, validate, adminRejectOrder);
router.get('/', getAllOrders);

module.exports = router;
