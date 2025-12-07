// src/routes/menu/menuRoutes.js ← FINAL CORRECTED VERSION

const express = require('express');
const router = express.Router();

const upload = require('../../middleware/upload/Upload');
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const {
  getMenuByLocation,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getAllMenuItems,
  toggleAvailability,
  getAllMenuItemsWithFilters,
  getSingleMenuItem,
  getAllAvailableMenuItems
} = require('../../controllers/menu/menuController');

const {
  getMenuByLocation: menuLocationSchema,
  getAllMenuItemsWithFilters: menuFiltersSchema,
  addMenuItem: addMenuSchema,
  updateMenuItem: updateMenuSchema,
  toggleAvailability: toggleSchema,
  menuItemIdParam
} = require('../../validation/schemas/menuSchemas');

// PUBLIC ROUTES (NO AUTH NEEDED)
router.get('/all', getAllAvailableMenuItems);                    // ← FULL CATALOG
router.get('/location', menuLocationSchema, validate, getMenuByLocation);
router.get('/filters', menuFiltersSchema, validate, getAllMenuItemsWithFilters);
router.get('/:id', menuItemIdParam, validate, getSingleMenuItem);

// ADMIN ROUTES (PROTECTED)
router.use(auth, role(['admin']));  // ← YE AB SAHI JAGAH HAI!

router.get('/admin/all', getAllMenuItems);
router.post('/', upload.single('image'), addMenuSchema, validate, addMenuItem);
router.put('/:id', menuItemIdParam, upload.single('image'), updateMenuSchema, validate, updateMenuItem);
router.delete('/:id', menuItemIdParam, validate, deleteMenuItem);
router.patch('/:id/toggle', toggleSchema, validate, toggleAvailability);

module.exports = router;