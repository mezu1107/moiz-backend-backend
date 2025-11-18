// src/routes/cart/cartRoutes.js
const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');
const { cartSchemas } = require('../../validation/schemas');
const {
  getCart,
  addToCart,
  removeItem,
  clearCart
} = require('../../controllers/cart/cartController');

router.use(auth);

router.get('/', getCart);
router.post('/', cartSchemas.addToCart, validate, addToCart);
router.delete('/item/:itemId', removeItem);
router.delete('/clear', clearCart);

module.exports = router;