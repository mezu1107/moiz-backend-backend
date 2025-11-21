// src/routes/address/addressRoutes.js
const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');

const {
  createAddress,
  getUserAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../../controllers/address/addressController');

const {
  createAddress: createAddressSchema,
  updateAddress: updateAddressSchema,
  addressIdParam
} = require('../../validation/schemas/addressSchemas');

// ====================== MIDDLEWARE ======================
router.use(auth); // All routes require authenticated user

// ====================== ROUTES ======================

/**
 * @route   POST /api/address
 * @desc    Create a new delivery address
 * @access  Full validation + geo-check inside controller
 */
router.post(
  '/',
  createAddressSchema,
  validate,
  createAddress
);

/**
 * @route   GET /api/address
 * @desc    Get all addresses of the logged-in user
 * @access  Private
 */
router.get('/', getUserAddresses);

/**
 * @route   PUT /api/address/:id
 * @desc    Fully update an existing address (with geo-validation if lat/lng changed)
 * @access  Private
 */
router.put(
  '/:id',
  addressIdParam,           // Validates :id is MongoId
  updateAddressSchema,          // Validates body fields
  validate,
  updateAddress
);

/**
 * @route   DELETE /api/address/:id
 * @desc    Delete address + auto-promote next address to default if needed
 * @access  Private
 */
router.delete(
  '/:id',
  addressIdParam,
  validate,
  deleteAddress
);

/**
 * @route   PATCH /api/address/:id/default
 * @desc    Set this address as default (clears others)
 * @access  Private
 */
router.patch(
  '/:id/default',
  addressIdParam,
  validate,
  setDefaultAddress
);

module.exports = router;