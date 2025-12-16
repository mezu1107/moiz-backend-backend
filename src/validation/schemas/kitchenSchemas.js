// src/validation/schemas/kitchenSchemas.js
// FINAL PRODUCTION VERSION — BULLETPROOF VALIDATION (DEC 2025)

const { body } = require('express-validator');
const mongoose = require('mongoose');

// Reusable MongoId validator
const isValidMongoId = (value, { req, path }) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${path.replace(/Id$/, '')} ID format`);
  }
  return true;
};

// Start Preparing Item
const startItemSchema = [
  body('kitchenOrderId')
    .trim()
    .notEmpty()
    .withMessage('Kitchen order ID is required')
    .custom(isValidMongoId),

  body('itemId')
    .trim()
    .notEmpty()
    .withMessage('Item ID is required')
    .custom(isValidMongoId)
];

// Complete Item
const completeItemSchema = [
  body('kitchenOrderId')
    .trim()
    .notEmpty()
    .withMessage('Kitchen order ID is required')
    .custom(isValidMongoId),

  body('itemId')
    .trim()
    .notEmpty()
    .withMessage('Item ID is required')
    .custom(isValidMongoId)
];

module.exports = {
  startItemSchema,
  completeItemSchema
};