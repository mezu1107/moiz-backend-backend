// src/routes/cart/cartRoutes.js
// PRODUCTION-READY — DECEMBER 27, 2025

const express = require('express');
const router = express.Router();

const {
  getCart,
  addToCart,
  updateQuantity,
  removeItem,
  clearCart,
} = require('../../controllers/cart/cartController');

const {
  addToCartSchema,
  updateCartItemSchema,
  cartItemParamSchema,
} = require('../../validation/schemas/cartSchemas');

const validateRequest = require('../../middleware/validate/validate'); 

// GET /api/cart
router.get('/', getCart);

// POST /api/cart
router.post('/', addToCartSchema, validateRequest, addToCart);

// PATCH /api/cart/item/:itemId — Update quantity or customizations
router.patch(
  '/item/:itemId',
  cartItemParamSchema,
  updateCartItemSchema,
  validateRequest, // ← Critical: runs validation
  updateQuantity
);

// DELETE /api/cart/item/:itemId
router.delete('/item/:itemId', cartItemParamSchema, validateRequest, removeItem);

// DELETE /api/cart/clear
router.delete('/clear', clearCart);

module.exports = router;