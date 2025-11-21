const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');
const User = require('../../models/user/User');
const jwt = require('jsonwebtoken');

const {
  register, login, logout, getMe, forgotPassword, resetPassword
} = require('../../controllers/auth/authController');

const { register: registerSchema, login: loginSchema } = require('../../validation/schemas/authSchemas');

// Public Routes
router.post('/register', registerSchema, validate, register);
router.post('/login', loginSchema, validate, login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// One-time Admin Creation (Remove after first use!)
router.post('/create-admin', async (req, res) => {
  const { secret, name, phone, email, password } = req.body;
  if (secret !== 'MAKE_ME_ADMIN_2025') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const adminExists = await User.findOne({ role: 'admin' });
  if (adminExists) {
    return res.status(400).json({ success: false, message: 'Admin already exists' });
  }

  const admin = await User.create({ name, phone, email, password, role: 'admin' });
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({ success: true, message: 'Admin created!', token, user: admin.toJSON() });
});

// Protected Routes
router.use(auth);
router.post('/logout', logout);
router.get('/me', getMe);

module.exports = router;