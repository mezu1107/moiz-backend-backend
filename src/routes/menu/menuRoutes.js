// src/routes/menu/menuRoutes.js
const express = require('express');
const router = express.Router();

const upload = require('../../middleware/upload/Upload');
const validate = require('../../middleware/validate/validate');
const { menuSchemas } = require('../../validation/schemas');
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const {
  getMenuByLocation,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getAllMenuItems
} = require('../../controllers/menu/menuController');

// Public: Get menu by location
router.get('/', menuSchemas.getMenuByLocation, validate, getMenuByLocation);

// Admin only
router.use(auth, role(['admin']));
router.post('/', upload.single('image'), menuSchemas.addMenuItem, validate, addMenuItem);
router.put('/:id', upload.single('image'), menuSchemas.updateMenuItem, validate, updateMenuItem);
router.delete('/:id', deleteMenuItem);
router.get('/all', getAllMenuItems);

module.exports = router;