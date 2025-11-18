// src/routes/address/addressRoutes.js
const express = require('express');
const router = express.Router();

const {
  createAddress,
  getUserAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../../controllers/address/addressController');

const { auth } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');
const { addressSchemas } = require('../../validation/schemas');

router.use(auth); // All address routes require login

router.post('/', addressSchemas.createAddress, validate, createAddress);
router.get('/', getUserAddresses);
router.put('/:id', addressSchemas.updateAddress, validate, updateAddress);
router.delete('/:id', deleteAddress);
router.patch('/:id/default', setDefaultAddress);

module.exports = router;