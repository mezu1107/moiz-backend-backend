const { body } = require('express-validator');

exports.register = [
  body('name')
    .trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
    .matches(/^[\p{L}\s]+$/u).withMessage('Name can only contain letters and spaces'),
  body('phone').trim().isMobilePhone('en-PK').withMessage('Valid Pakistani phone number required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be 8+ characters')
    .matches(/[A-Z]/).withMessage('Must contain uppercase')
    .matches(/[a-z]/).withMessage('Must contain lowercase')
    .matches(/[0-9]/).withMessage('Must contain a number')
    .matches(/[!@#$%^&*]/).withMessage('Must contain special char (!@#$%^&*)'),
];

exports.login = [
  body('password').notEmpty().withMessage('Password required'),

  body().custom(v => {
    if (!v || (!v.email && !v.phone)) {
      throw new Error('Email or phone required');
    }
    return true;
  }),

  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone('en-PK'),
];
// src/validation/schemas/authSchemas.js (add this)
exports.changePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Must contain lowercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number')
    .matches(/[!@#$%^&*]/).withMessage('Must contain a special character (!@#$%^&*)')
];
exports.forgotPassword = [
  body().custom(v => {
    if (!v || (!v.email && !v.phone)) {
      throw new Error('Email or phone required');
    }
    return true;
  }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone('en-PK'),
];

exports.verifyOtp = [
  body().custom(v => {
    if (!v || (!v.email && !v.phone)) {
      throw new Error('Email or phone required');
    }
    return true;
  }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone('en-PK'),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
];

exports.resetPassword = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be 8+ characters')
    .matches(/[A-Z]/).matches(/[a-z]/).matches(/[0-9]/).matches(/[!@#$%^&*]/)
    .withMessage('Password must contain uppercase, lowercase, number & special char'),
];
