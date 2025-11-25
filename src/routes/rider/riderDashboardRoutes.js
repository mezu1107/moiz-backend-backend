// src/routes/rider/riderDashboardRoutes.js
const router = require('express').Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const { getDashboard, getEarningsHistory } = require('../../controllers/rider/riderDashboardController');

router.use(auth, role('rider'));

// Only approved riders can access dashboard
router.use((req, res, next) => {
  if (req.user.riderStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Account not approved yet'
    });
  }
  next();
});

router.get('/dashboard', getDashboard);
router.get('/earnings', getEarningsHistory);

module.exports = router;