// src/routes/auth/authRoutes.js
const router = require('express').Router();
const { auth } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');

const {
  register, login, logout, getMe, updateMyProfile,
  changePassword, forgotPassword, verifyOtp, resetPassword
} = require('../../controllers/auth/authController');

const {
  register: registerSchema,
  login: loginSchema,
  changePassword: changePasswordSchema,
  forgotPassword: forgotPasswordSchema,
  verifyOtp: verifyOtpSchema,
  resetPassword: resetPasswordSchema,
  updateProfile
} = require('../../validation/schemas/authSchemas');

// ======================
// Public Routes
// ======================
router.post('/register', registerSchema, validate, register);
router.post('/login', loginSchema, validate, login);
router.post('/forgot-password', forgotPasswordSchema, validate, forgotPassword);
router.post('/verify-otp', verifyOtpSchema, validate, verifyOtp);
router.post('/reset-password', resetPasswordSchema, validate, resetPassword);

// ======================
// Protected Routes
// ======================
router.use(auth);

router.post('/logout', logout);
router.get('/me', getMe);
router.patch('/me', updateProfile, validate, updateMyProfile);
router.patch('/change-password', changePasswordSchema, validate, changePassword);

module.exports = router;
