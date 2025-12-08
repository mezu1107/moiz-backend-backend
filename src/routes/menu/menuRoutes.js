// src/routes/menu/menuRoutes.js ← FINAL 100% WORKING VERSION

const express = require('express');
const router = express.Router();
const { param } = require('express-validator'); // ← THIS WAS MISSING!!!

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
  getAllAvailableMenuItems,
  getMenuByAreaId: getMenuByAreaIdController
} = require('../../controllers/menu/menuController');

const {
  getMenuByLocation: menuLocationSchema,
  getAllMenuItemsWithFilters: menuFiltersSchema,
  addMenuItem: addMenuItemSchema,
  updateMenuItem: updateMenuItemSchema,
  toggleAvailability: toggleAvailabilitySchema,
  menuItemIdParam,
  getMenuByAreaId
} = require('../../validation/schemas/menuSchemas');

// PUBLIC ROUTES
router.get('/all', getAllAvailableMenuItems);
router.get('/location', menuLocationSchema, validate, getMenuByLocation);
router.get('/filters', menuFiltersSchema, validate, getAllMenuItemsWithFilters);
router.get('/:id', menuItemIdParam, validate, getSingleMenuItem);
router.get('/area/:areaId', getMenuByAreaId, validate, getMenuByAreaIdController);

// ADMIN ROUTES
router.use(auth, role(['admin']));

router.get('/admin/all', getAllMenuItems);

router.post('/', 
  upload.single('image'), 
  addMenuItemSchema, 
  validate, 
  addMenuItem
);

router.put('/:id', 
  menuItemIdParam, 
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