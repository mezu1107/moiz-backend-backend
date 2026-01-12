// src/validation/schemas/authSchemas.js
const { body } = require('express-validator');

// ======================
// SHARED CONSTANTS
// ======================
const PAK_PHONE_REGEX = /^(?:\+92|92|0)3[0-9]{9}$/;

// ======================
// SHARED PHONE VALIDATORS
// ======================
const phoneValidatorOptional = body('phone')
  .optional({ nullable: true })
  .customSanitizer(value => {
    if (!value) return value;
    return value.replace(/\s+/g, '').replace(/^0092/, '+92');
  })
  .matches(PAK_PHONE_REGEX)
  .withMessage('Valid Pakistani phone number required');

const phoneValidatorRequired = body('phone')
  .notEmpty().withMessage('Phone number is required')
  .customSanitizer(value => value.replace(/\s+/g, '').replace(/^0092/, '+92'))
  .matches(PAK_PHONE_REGEX)
  .withMessage('Valid Pakistani phone number required');

// ======================
// REGISTER
// ======================
exports.register = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
    .matches(/^[\p{L}\s]+$/u).withMessage('Name can only contain letters and spaces')
    .trim(),

  phoneValidatorRequired,

  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be 8+ characters')
    .matches(/[A-Z]/).withMessage('Must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Must contain lowercase letter')
    .matches(/[0-9]/).withMessage('Must contain number')
    .matches(/[!@#$%^&*]/).withMessage('Must contain special char (!@#$%^&*)')
];

// ======================
// LOGIN
// ======================
exports.login = [
  body('password').notEmpty().withMessage('Password is required'),

  body().custom((_, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error('Email or phone number is required');
    }
    return true;
  }),

  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),

  phoneValidatorOptional
];

// ======================
// CHANGE PASSWORD
// ======================
exports.changePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be 8+ characters')
    .matches(/[A-Z]/).withMessage('Must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Must contain lowercase letter')
    .matches(/[0-9]/).withMessage('Must contain number')
    .matches(/[!@#$%^&*]/).withMessage('Must contain special char (!@#$%^&*)')
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
  body().custom((_, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error('Email or phone number is required');
    }
    return true;
  }),

  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),

  phoneValidatorOptional
];

// ======================
// VERIFY OTP
// ======================
exports.verifyOtp = [
  body().custom((_, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error('Email or phone number is required');
    }
    return true;
  }),

  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),

  phoneValidatorOptional,

  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers')
];

// ======================
// RESET PASSWORD
// ======================
exports.resetPassword = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be 8+ characters')
    .matches(/[A-Z]/).withMessage('Must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Must contain lowercase letter')
    .matches(/[0-9]/).withMessage('Must contain number')
    .matches(/[!@#$%^&*]/).withMessage('Must contain special char (!@#$%^&*)')
];

// ======================
// UPDATE PROFILE
// ======================
exports.updateProfile = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
    .matches(/^[\p{L}\s]+$/u).withMessage('Name can only contain letters and spaces')
    .trim(),

  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail()
];

// ======================
// EXPORTS
// ======================
module.exports = {
  register: exports.register,
  login: exports.login,
  changePassword: exports.changePassword,
  forgotPassword: exports.forgotPassword,
  verifyOtp: exports.verifyOtp,
  resetPassword: exports.resetPassword,
  updateProfile: exports.updateProfile
};
