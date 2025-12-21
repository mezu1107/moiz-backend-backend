// src/validation/schemas/analyticsSchemas.js
// FINAL PRODUCTION — DECEMBER 21, 2025

const Joi = require('joi');

// Allowed periods
const validPeriods = ['24h', '7d', '30d', '90d', 'today', 'yesterday', 'custom'];

// MAIN ANALYTICS QUERY SCHEMA
const analyticsQuerySchema = Joi.object({
  period: Joi.string()
    .valid(...validPeriods)
    .optional()
    .default('7d'),

  startDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),

  endDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})
  // Prevent mixing predefined period with custom dates
  .oxor('period', 'startDate')

  // If any date is provided, both must be present
  .when(Joi.object({ period: 'custom' }).unknown(), {
    then: Joi.object({
      startDate: Joi.required(),
      endDate: Joi.required(),
    }),
  })
  .when(Joi.object({ startDate: Joi.exist() }).unknown(), {
    then: Joi.object({
      endDate: Joi.required(),
    }),
  })
  .when(Joi.object({ endDate: Joi.exist() }).unknown(), {
    then: Joi.object({
      startDate: Joi.required(),
    }),
  });

// REALTIME QUERY SCHEMA — strict, only allow future-proof params
const realtimeQuerySchema = Joi.object({
  mode: Joi.string().valid('fast', 'detailed').optional(), // future use
}).unknown(false); // reject any unknown query params

module.exports = {
  analyticsQuerySchema,
  realtimeQuerySchema,
};