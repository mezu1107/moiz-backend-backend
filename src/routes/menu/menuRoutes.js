// src/routes/menu/menuRoutes.js
const express = require('express');
const router = express.Router();

const upload = require('../../middleware/upload/Upload');
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

// CORRECT PATH — THIS WAS THE BUG
const { menuSchemas } = require('../../validation/schemas/menuSchemas');

const {
  getMenuByLocation,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getAllMenuItems
} = require('../../controllers/menu/menuController');

// Public route
router.get('/', menuSchemas.getMenuByLocation, validate, getMenuByLocation);

// Admin only
router.use(auth, role(['admin']));

router.post(
  '/',
  upload.single('image'),
  menuSchemas.addMenuItem,
  validate,
  addMenuItem
);

router.put(
  '/:id',
  upload.single('image'),
  menuSchemas.updateMenuItem,
  validate,
  updateMenuItem
);

router.delete('/:id', deleteMenuItem);
router.get('/all', getAllMenuItems);

module.exports = router;