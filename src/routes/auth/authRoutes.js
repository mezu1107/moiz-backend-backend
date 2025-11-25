// src/routes/auth/authRoutes.js
const router = require('express').Router();
const { auth } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');

const {
  register, login, logout, getMe,
  updateMyProfile, changePassword,   // ← ADD THIS
  forgotPassword, verifyOtp, resetPassword
} = require('../../controllers/auth/authController');

const {
  register: registerSchema,
  login: loginSchema,
  forgotPassword: forgotPasswordSchema,
  verifyOtp: verifyOtpSchema,
  resetPassword: resetPasswordSchema,
  changePassword: changePasswordSchema 
} = require('../../validation/schemas/authSchemas');

// Public
router.post('/register', registerSchema, validate, register);
router.post('/login', loginSchema, validate, login);
router.post('/forgot-password', forgotPasswordSchema, validate, forgotPassword);
router.post('/verify-otp', verifyOtpSchema, validate, verifyOtp);

// Protected
router.use(auth);
router.post('/logout', logout);
router.get('/me', getMe);
router.put('/me', updateMyProfile);
router.post('/reset-password', resetPasswordSchema, validate, resetPassword);
// src/routes/auth/authRoutes.js (add this line)
router.patch('/change-password', changePasswordSchema, validate, changePassword);
module.exports = router;