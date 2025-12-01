// src/validation/schemas/adminCustomerSchemas.js
const { query, param } = require('express-validator');

/**
 * GET /admin/customers
 * Query params: search?, page?, limit?
 */
exports.getAllCustomers = [
  query('search')
    .optional()
    .isString().withMessage('Search must be a string')
    .trim(),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt()
];

/**
 * GET /admin/customers/:id
 * PATCH /admin/customers/:id/block
 * PATCH /admin/customers/:id/unblock
 */
exports.customerIdParam = [
  param('id')
    .notEmpty().withMessage('Customer ID is required')
    .isMongoId().withMessage('Invalid Customer ID format')
];

/**
 * Optional: If you ever allow admin to add a block reason (future feature)
 * PATCH /admin/customers/:id/block with body { reason? }
 */
// exports.blockCustomer = [
//   ...exports.customerIdParam,
//   body('reason')
//     .optional()
//     .isString().withMessage('Block reason must be a string')
//     .isLength({ max: 500 }).withMessage('Block reason too long (max 500 chars)')
//     .trim()
// ];

module.exports = {
  getAllCustomers: exports.getAllCustomers,
  customerIdParam: exports.customerIdParam
};