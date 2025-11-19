// src/routes/auth/authRoutes.js (FINAL CORRECT VERSION)
const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');

const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword
} = require('../../controllers/auth/authController');

const {
  register: registerSchema,
  login: loginSchema
} = require('../../validation/schemas/authSchemas');

// Public
router.post('/register', registerSchema, validate, register);
router.post('/login', loginSchema, validate, login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected
router.use(auth);
router.post('/logout', logout);
router.get('/me', getMe);

module.exports = router;