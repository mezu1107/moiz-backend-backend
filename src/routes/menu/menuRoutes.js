// src/routes/menu/menuRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../../middleware/upload/Upload');
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

// Controllers
const {
  getMenuByLocation,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getAllMenuItems,
  toggleAvailability,
  getAllMenuItemsWithFilters,
  getSingleMenuItem,
  getAllAvailableMenuItems,
  getMenuByAreaId: getMenuByAreaIdController
} = require('../../controllers/menu/menuController');

// Validation Schemas
const {
  getMenuByLocation: locationSchema,
  getAllMenuItemsWithFilters: filtersSchema,
  addMenuItemSchema,
  updateMenuItemSchema,
  toggleAvailabilitySchema,
  menuItemIdParam,
  getMenuByAreaIdValidation
} = require('../../validation/schemas/menuSchemas');

// ==================== PUBLIC ROUTES (MUST BE BEFORE ADMIN MIDDLEWARE) ====================
router.get('/all', getAllAvailableMenuItems);
router.get('/location', locationSchema, validate, getMenuByLocation);
router.get('/filters', filtersSchema, validate, getAllMenuItemsWithFilters);
router.get('/:id', menuItemIdParam, validate, getSingleMenuItem);
router.get('/area/:areaId', getMenuByAreaIdValidation, validate, getMenuByAreaIdController); // ← MOVED UP!

// ==================== APPLY ADMIN PROTECTION HERE (AFTER ALL PUBLIC ROUTES) ====================
router.use(auth, role(['admin']));   

// ==================== ADMIN-ONLY ROUTES ====================
router.get('/admin/all', getAllMenuItems);

router.post('/',
  upload.single('image'),
  addMenuItemSchema,
  validate,
  addMenuItem
);

router.put('/:id',
  menuItemIdParam,
  validate,
  upload.single('image'),
  updateMenuItemSchema,
  validate,
  updateMenuItem
);

router.delete('/:id',
  menuItemIdParam,
  validate,
  deleteMenuItem
);

router.patch('/:id/toggle',
  toggleAvailabilitySchema,
  validate,
  toggleAvailability
);

module.exports = router;