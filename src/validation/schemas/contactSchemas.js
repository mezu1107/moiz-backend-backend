// src/validation/schemas/contactSchemas.js
const { body } = require('express-validator');

exports.submitContact = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
    .matches(/^[\p{L}\s]+$/u).withMessage('Name can only contain letters and spaces')
    .trim(),

  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('subject')
    .notEmpty().withMessage('Subject is required')
    .isLength({ min: 3, max: 100 }).withMessage('Subject must be 3-100 characters')
    .trim(),

  body('message')
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 2000 }).withMessage('Message must be 10-2000 characters')
    .trim()
];

module.exports = {
  submitContact: exports.submitContact
};