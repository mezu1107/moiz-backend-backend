// src/validation/schemas/analyticsSchemas.js

const Joi = require('joi');

// Allowed periods
const validPeriods = ['24h', '7d', '30d', '90d', 'today', 'custom'];

// MAIN ANALYTICS QUERY VALIDATION
const analyticsQuerySchema = Joi.object({
  period: Joi.string().valid(...validPeriods).optional(),

  startDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),

  endDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
}).custom((value, helpers) => {
  const { period, startDate, endDate } = value;

  // custom validation to match your logic
  if (period === 'custom' || startDate || endDate) {
    if (!startDate || !endDate) {
      return helpers.error('any.custom', {
        message: 'Both startDate and endDate are required for custom range'
      });
    }
  }

  return value;
}, 'Custom analytics validation');

// REALTIME QUERY VALIDATION
const realtimeQuerySchema = Joi.object({
  refresh: Joi.string().optional(),
  fast: Joi.string().optional()
}).unknown(false); // reject extra params

module.exports = {
  analyticsQuerySchema,
  realtimeQuerySchema
};
