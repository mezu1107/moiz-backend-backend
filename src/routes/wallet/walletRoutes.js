// src/routes/wallet/walletRoutes.js
const router = require('express').Router();
const { auth } = require('../../middleware/auth/auth');
const { getMyWallet } = require('../../controllers/wallet/walletController');

router.use(auth);
router.get('/me', getMyWallet);

module.exports = router;