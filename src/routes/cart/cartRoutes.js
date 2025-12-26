const express = require('express');
const router = express.Router();

const {
  getCart,
  addToCart,
  updateQuantity,
  removeItem,
  clearCart
} = require('../../controllers/cart/cartController');

const {
  addToCartSchema,
  updateCartItemSchema,
  cartItemParamSchema
} = require('../../validation/schemas/cartSchemas');

// No auth required — guests use session, logged-in use DB
// GET /api/cart
router.get('/', getCart);

// POST /api/cart → Add item with full customizations
router.post('/', addToCartSchema, addToCart);

// PATCH /api/cart/item/:itemId → Update quantity AND/OR any customizations + global orderNote
router.patch(
  '/item/:itemId',
  cartItemParamSchema,
  updateCartItemSchema,
  addToCart, // reuse validation middleware
  updateQuantity
);

// DELETE /api/cart/item/:itemId → Remove specific item
router.delete('/item/:itemId', cartItemParamSchema, removeItem);

// DELETE /api/cart/clear → Clear entire cart + orderNote
router.delete('/clear', clearCart);

module.exports = router;