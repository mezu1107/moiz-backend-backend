// src/routes/admin/paymentAdminRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const {
  getPaymentsDashboard,
  exportPaymentsToExcel
} = require('../../controllers/admin/paymentAdminController');

router.use(auth, role(['admin']));

router.get('/dashboard', getPaymentsDashboard);
router.get('/export-excel', exportPaymentsToExcel);

module.exports = router;