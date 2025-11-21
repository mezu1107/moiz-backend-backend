const { body } = require('express-validator');

exports.register = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be 2-50 characters')
    .matches(/^[\p{L}\s]+$/u)
    .withMessage('Name can only contain letters and spaces'),
  body('phone')
    .isMobilePhone('en-PK')
    .withMessage('Valid Pakistani phone number required'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be 8+ characters')
    .matches(/[A-Z]/).withMessage('Password must contain uppercase')
    .matches(/[a-z]/).withMessage('Password must contain lowercase')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain a special character'),
];

exports.login = [
  body('password').notEmpty().withMessage('Password is required'),
  body().custom((value) => {
    if (!value.email && !value.phone) {
      throw new Error('Either email or phone is required');
    }
    return true;
  }),
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email'),
  body('phone').optional().isMobilePhone('en-PK').withMessage('Invalid phone number'),
];