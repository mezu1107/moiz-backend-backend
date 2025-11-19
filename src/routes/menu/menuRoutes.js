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
  toggleAvailability: toggleSchema
} = require('../../validation/schemas/menuSchemas');

// Public Routes - Anyone can view menu
router.get('/menu', menuFiltersSchema, validate, getAllMenuItemsWithFilters);
router.get('/menu/:id', getSingleMenuItem);
router.get('/', menuLocationSchema, validate, getMenuByLocation);

// Admin Only - Protected
router.use(auth, role(['admin']));

router.post('/', upload.single('image'), addMenuSchema, validate, addMenuItem);
router.put('/:id', upload.single('image'), updateMenuSchema, validate, updateMenuItem);
router.delete('/:id', deleteMenuItem);
router.get('/all', getAllMenuItems);
router.patch('/:id/toggle', toggleSchema, validate, toggleAvailability);

module.exports = router;