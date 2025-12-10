const express = require('express');
const router = express.Router();

const { auth } = require('../../middleware/auth/auth'); // ✅ FIXED
const validate = require('../../middleware/validate/validate');

const {
  getCart,
  addToCart,
  updateQuantity,
  removeItem,
  clearCart
} = require('../../controllers/cart/cartController');

const {
  addToCartSchema,
  updateQuantitySchema,
  cartItemParamSchema
} = require('../../validation/schemas/cartSchemas');

// GUESTS CAN USE CART — LOGGED-IN GET PERSISTENT CART
router.use(auth); // ← pass reference, don't call

// GET /api/cart
router.get('/', getCart);

// POST /api/cart → Add item
router.post('/', addToCartSchema, validate, addToCart);

// PATCH /api/cart/item/:itemId → Update quantity (0 = remove)
router.patch(
  '/item/:itemId',
  cartItemParamSchema,
  updateQuantitySchema,
  validate,
  updateQuantity
);

// DELETE /api/cart/item/:itemId → Force remove
router.delete(
  '/item/:itemId',
  cartItemParamSchema,
  validate,
  removeItem
);

// DELETE /api/cart/clear → Empty cart
router.delete('/clear', clearCart);

module.exports = router;
