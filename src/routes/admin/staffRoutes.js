// src/routes/admin/staffRoutes.js
// FINAL PRODUCTION VERSION — FULLY VALIDATED & SECURE (DEC 2025)

const router = require('express').Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const {
  promoteUserToStaff: promoteSchema,
  demoteStaff: demoteSchema
} = require('../../validation/schemas/staffSchemas');

const {
  promoteUserToStaff,
  demoteStaff
} = require('../../controllers/admin/staffAdminController');

// Only ADMIN can access
router.use(auth, role('admin'));

// PROMOTE: Fully validated
router.post(
  '/promote/:id',
  promoteSchema,
  validate,
  promoteUserToStaff
);

// DEMOTE: Fully validated
router.post(
  '/demote/:id',
  demoteSchema,
  validate,
  demoteStaff
);

module.exports = router;