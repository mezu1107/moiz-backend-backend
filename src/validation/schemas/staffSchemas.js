// src/validation/schemas/staffSchemas.js
// FINAL PRODUCTION VERSION — FULL STAFF ROLE VALIDATION (DEC 2025)

const { body, param } = require('express-validator');
const mongoose = require('mongoose');

// Reusable MongoID validator
const isValidMongoId = (value, { req, location, path }) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error('Invalid ID format');
  }
  return true;
};

const VALID_STAFF_ROLES = ['kitchen', 'delivery_manager', 'support', 'finance'];

// PROMOTE USER TO STAFF
const promoteUserToStaff = [
  // Validate :id param
  param('id')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .bail()
    .custom(isValidMongoId),

  // Validate role in body
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .bail()
    .isIn(VALID_STAFF_ROLES)
    .withMessage(`Invalid role. Must be one of: ${VALID_STAFF_ROLES.join(', ')}`)
];

// DEMOTE STAFF TO CUSTOMER
const demoteStaff = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .bail()
    .custom(isValidMongoId)
];

module.exports = {
  promoteUserToStaff,
  demoteStaff
};