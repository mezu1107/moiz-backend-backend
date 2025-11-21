// src/routes/menu/menuRoutes.js
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
  getSingleMenuItem
} = require('../../controllers/menu/menuController');

const {
  getMenuByLocation: menuLocationSchema,
  getAllMenuItemsWithFilters: menuFiltersSchema,
  addMenuItem: addMenuSchema,
  updateMenuItem: updateMenuSchema,
  toggleAvailability: toggleSchema,
  menuItemIdParam
} = require('../../validation/schemas/menuSchemas');

// PUBLIC ROUTES
router.get('/location', menuLocationSchema, validate, getMenuByLocation);
router.get('/filters', menuFiltersSchema, validate, getAllMenuItemsWithFilters);
router.get('/:id', menuItemIdParam, validate, getSingleMenuItem);

// ADMIN ROUTES
router.use(auth, role(['admin']));

router.post('/', upload.single('image'), addMenuSchema, validate, addMenuItem);
router.put('/:id', menuItemIdParam, upload.single('image'), updateMenuSchema, validate, updateMenuItem);
router.delete('/:id', menuItemIdParam, validate, deleteMenuItem);
router.patch('/:id/toggle', toggleSchema, validate, toggleAvailability);
router.get('/admin/all', getAllMenuItems);

module.exports = router;