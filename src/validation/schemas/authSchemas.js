// src/validation/schemas/authSchemas.js
const { body } = require('express-validator');

// ======================
// REGISTER
// ======================
exports.register = [
  // NAME — required, 2-50 chars, letters + spaces only
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
    .matches(/^[\p{L}\s]+$/u).withMessage('Name can only contain letters and spaces')
    .trim(),

  // PHONE — required, exact Pakistani format
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .isLength({ min: 11, max: 11 }).withMessage('Phone must be 11 digits')
    .matches(/^03[0-9]{9}$/).withMessage('Valid Pakistani phone number required (e.g. 03001234567)')
    .trim(),

  // EMAIL — optional but must be valid if provided
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  // PASSWORD — strong rules, clean error messages
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be 8+ characters')
    .matches(/[A-Z]/).withMessage('Must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Must contain at least one number')
    .matches(/[!@#$%^&*]/).withMessage('Must contain at least one special character (!@#$%^&*)')
];

// ======================
// LOGIN
// ======================
exports.login = [
  body('password')
    .notEmpty().withMessage('Password is required'),

  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error('Email or phone number is required');
    }
    return true;
  }),

  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),

  body('phone')
    .optional({ nullable: true })
    .matches(/^03[0-9]{9}$/).withMessage('Valid Pakistani phone number required'),
];

// ======================
// CHANGE PASSWORD (While Logged In)
// ======================
exports.changePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be 8+ characters')
    .matches(/[A-Z]/).withMessage('Must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Must contain lowercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number')
    .matches(/[!@#$%^&*]/).withMessage('Must contain special char (!@#$%^&*)')

    // Prevent same password reuse
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

// ======================
// FORGOT PASSWORD
// ======================
exports.forgotPassword = [
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error('Email or phone number is required');
    }
    return true;
  }),

  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),

  body('phone')
    .optional({ nullable: true })
    .matches(/^03[0-9]{9}$/).withMessage('Valid Pakistani phone number required'),
];

// ======================
// VERIFY OTP
// ======================
exports.verifyOtp = [
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error('Email or phone number is required');
    }
    return true;
  }),

  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),

  body('phone')
    .optional({ nullable: true })
    .matches(/^03[0-9]{9}$/).withMessage('Valid Pakistani phone number required'),

  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers')
    .trim(),
];

// ======================
// RESET PASSWORD (After OTP)
// ======================
exports.resetPassword = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be 8+ characters')
    .matches(/[A-Z]/).withMessage('Must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Must contain lowercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number')
    .matches(/[!@#$%^&*]/).withMessage('Must contain special char (!@#$%^&*)')
];

module.exports = {
  register: exports.register,
  login: exports.login,
  changePassword: exports.changePassword,
  forgotPassword: exports.forgotPassword,
  verifyOtp: exports.verifyOtp,
  resetPassword: exports.resetPassword
};