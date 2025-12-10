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
// All routes require authenticated user
router.use(auth); // ← pass reference, do NOT call it

// ====================== ROUTES ======================

/**
 * @route   POST /api/address
 * @desc    Create a new delivery address (only areaId required)
 * @access  Private
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
 * @desc    Update an existing address (label, fullAddress, areaId, instructions)
 * @access  Private
 */
router.put(
  '/:id',
  addressIdParam,         // Validate :id is MongoId
  updateAddressSchema,    // Validate body fields
  validate,
  updateAddress
);

/**
 * @route   DELETE /api/address/:id
 * @desc    Delete an address and auto-promote next to default if needed
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
