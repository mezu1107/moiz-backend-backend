// src/routes/admin/customerRoutes.js
const router = require('express').Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const {
  getAllCustomers,
  getCustomerById,
  blockCustomer,
  unblockCustomer
} = require('../../controllers/admin/customerController');

const {
  getAllCustomers: getAllCustomersSchema,
  customerIdParam
} = require('../../validation/schemas/adminCustomerSchemas');

router.use(auth, role('admin'));

router.get('/', getAllCustomersSchema, validate, getAllCustomers);
router.get('/:id', customerIdParam, validate, getCustomerById);
router.patch('/:id/block', customerIdParam, validate, blockCustomer);
router.patch('/:id/unblock', customerIdParam, validate, unblockCustomer);

module.exports = router;