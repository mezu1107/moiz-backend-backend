// src/routes/address/addressRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');
const { createAddress, getUserAddresses, updateAddress, deleteAddress, setDefaultAddress } = require('../../controllers/address/addressController');
const { createAddress: createAddressSchema, updateAddress: updateAddressSchema } = require('../../validation/schemas/addressSchemas');

router.use(auth);

router.post('/', createAddressSchema, validate, createAddress);
router.get('/', getUserAddresses);
router.put('/:id', updateAddressSchema, validate, updateAddress);
router.delete('/:id', deleteAddress);
router.patch('/:id/default', setDefaultAddress);

module.exports = router;