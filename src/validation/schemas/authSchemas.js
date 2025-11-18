const { body } = require('express-validator');

exports.register = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be 2-50 characters')
    .matches(/^[\p{L}\s]+$/u)
    .withMessage('Name can only contain letters and spaces'),

  body('phone')
    .isMobilePhone('en-PK') // ✅ change from 'ur-PK'
    .withMessage('Valid Pakistani phone number required (e.g. 03001234567)'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),

  body('password')
    .isLength({ min: 8 })
    .matches(/[A-Z]/)
    .matches(/[a-z]/)
    .matches(/[0-9]/)
    .matches(/[!@#$%^&*]/)
    .withMessage('Password: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol')
];

exports.login = [
  body('phone')
    .isMobilePhone('en-PK') // ✅ change from 'ur-PK'
    .withMessage('Valid Pakistani phone number required'),
  body('password')
    .notEmpty()
    .withMessage('Password required')
];
