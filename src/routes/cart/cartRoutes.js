// src/routes/cart/cartRoutes.js
const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');

const {
  getCart,
  addToCart,
  removeItem,
  clearCart
} = require('../../controllers/cart/cartController');

const {
  addToCart: addToCartSchema,
  cartItemParam
} = require('../../validation/schemas/cartSchemas');

router.use(auth);

router.get('/', getCart);
router.post('/', addToCartSchema, validate, addToCart);
router.delete('/item/:itemId', cartItemParam, validate, removeItem);
router.delete('/clear', clearCart);

module.exports = router;