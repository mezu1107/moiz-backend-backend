// src/validation/schemas/authSchemas.js
const { body } = require('express-validator');

exports.register = [
  body('name').trim().isLength({ min: 2, max: 50 }).matches(/^[\p{L}\s]+$/u),
  body('phone').isMobilePhone('en-PK'),
  body('email').optional().isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/[A-Z]/)
    .matches(/[a-z]/)
    .matches(/[0-9]/)
    .matches(/[!@#$%^&*]/)
];

exports.login = [
  body('phone').isMobilePhone('en-PK'),
  body('password').notEmpty()
];