// src/routes/admin/refundAdminRoutes.js
const router = require('express').Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const { getRefundRequests, processRefund } = require('../../controllers/admin/refundAdminController');

router.use(auth, role(['admin']));

router.get('/requests', getRefundRequests);
router.post('/process/:transactionId', processRefund);

module.exports = router;