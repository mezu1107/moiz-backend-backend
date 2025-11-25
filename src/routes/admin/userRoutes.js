// src/routes/admin/customerRoutes.js
const router = require('express').Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const {
  getAllCustomers,
  getCustomerById,
  blockCustomer,
  unblockCustomer
} = require('../../controllers/admin/customerController');

router.use(auth, role('admin'));

router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.patch('/:id/block', blockCustomer);
router.patch('/:id/unblock', unblockCustomer);

module.exports = router;