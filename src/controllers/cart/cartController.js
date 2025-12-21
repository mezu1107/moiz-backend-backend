// src/controllers/cart/cartController.js
// ROBUST VERSION — DECEMBER 21, 2025
// IMPROVEMENTS:
// - Added _id generation for guest cart items using mongoose.Types.ObjectId()
// - Standardized matching on _id for guest updates/removals (no fallback to menuItem)
// - Added _id to guest items in addToCart
// - Improved error handling with specific messages
// - Added logging for debugging
// - Ensured all responses include _id for consistency
// - Optimized populateItems to handle missing items gracefully
// - Added optional addedAt for consistency

const mongoose = require('mongoose');
const Cart = require('../../models/cart/Cart');
const MenuItem = require('../../models/menuItem/MenuItem');

const calculateTotal = (items = []) =>
  items.reduce((sum, { priceAtAdd, quantity }) => sum + priceAtAdd * quantity, 0);

/**
 * Populate cart items with menuItem details
 * @param {Array} cartItems
 */
const populateItems = async (cartItems) => {
  return Promise.all(
    cartItems.map(async (item) => {
      try {
        const menuItem = await MenuItem.findById(item.menuItem)
          .select('name price image isAvailable')
          .lean();
        return {
          ...item,
          menuItem: menuItem || { name: 'Item removed', isAvailable: false, price: 0, image: null }
        };
      } catch (err) {
        console.error('Populate item error:', err);
        return {
          ...item,
          menuItem: { name: 'Item removed', isAvailable: false, price: 0, image: null }
        };
      }
    })
  );
};

// GET /api/cart
const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      let cart = await Cart.findOne({ user: userId }).populate(
        'items.menuItem',
        'name price image isAvailable'
      );

      if (!cart) {
        return res.json({
          success: true,
          message: 'Your cart is empty',
          cart: { items: [], total: 0 },
          isGuest: false
        });
      }

      const total = calculateTotal(cart.items);
      return res.json({
        success: true,
        message: 'Cart retrieved',
        cart: { items: cart.items, total },
        isGuest: false
      });
    }

    // Guest
    const sessionCart = req.session.cart || [];
    const populatedItems = await populateItems(sessionCart);
    const total = calculateTotal(sessionCart);

    res.json({
      success: true,
      message: 'Cart retrieved',
      cart: { items: populatedItems, total },
      isGuest: true
    });
  } catch (err) {
    console.error('getCart error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving cart' });
  }
};

// POST /api/cart
const addToCart = async (req, res) => {
  const { menuItemId, quantity = 1 } = req.body;
  const userId = req.user?.id;

  try {
    if (!menuItemId) return res.status(400).json({ success: false, message: 'menuItemId required' });

    const menuItem = await MenuItem.findById(menuItemId).select('name price isAvailable');
    if (!menuItem) return res.status(404).json({ success: false, message: 'Item not found' });
    if (!menuItem.isAvailable) return res.status(400).json({ success: false, message: `${menuItem.name} unavailable` });

    if (userId) {
      // Logged-in
      let cart = await Cart.findOne({ user: userId });
      if (!cart) cart = new Cart({ user: userId, items: [] });

      const idx = cart.items.findIndex(i => i.menuItem.toString() === menuItemId);
      if (idx > -1) {
        cart.items[idx].quantity = Math.min(cart.items[idx].quantity + quantity, 50);
      } else {
        cart.items.push({ menuItem: menuItemId, quantity, priceAtAdd: menuItem.price });
      }

      await cart.save();
      await cart.populate('items.menuItem', 'name price image isAvailable');
      const total = calculateTotal(cart.items);

      return res.json({
        success: true,
        message: idx > -1 ? `Added ${quantity} more` : `${menuItem.name} added!`,
        cart: { items: cart.items, total },
        isGuest: false
      });
    }

    // Guest
    if (!req.session.cart) req.session.cart = [];

    const idx = req.session.cart.findIndex(i => i.menuItem === menuItemId);
    if (idx > -1) {
      req.session.cart[idx].quantity = Math.min(req.session.cart[idx].quantity + quantity, 50);
    } else {
      req.session.cart.push({
        _id: new mongoose.Types.ObjectId().toString(), // ← FIXED: Generate _id for guest items
        menuItem: menuItemId,
        quantity,
        priceAtAdd: menuItem.price,
        addedAt: new Date().toISOString()
      });
    }

    const populatedItems = await populateItems(req.session.cart);
    const total = calculateTotal(req.session.cart);

    res.json({
      success: true,
      message: idx > -1 ? `Added ${quantity} more` : `${menuItem.name} added!`,
      cart: { items: populatedItems, total },
      isGuest: true
    });
  } catch (err) {
    console.error('addToCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to add item' });
  }
};

// PATCH /api/cart/item/:itemId
const updateQuantity = async (req, res) => {
  const { quantity } = req.body;
  const { itemId } = req.params;
  const userId = req.user?.id;

  try {
    if (quantity == null || isNaN(quantity)) return res.status(400).json({ success: false, message: 'Quantity required' });

    if (userId) {
      const cart = await Cart.findOne({ user: userId });
      if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

      const idx = cart.items.findIndex(i => i._id.toString() === itemId);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

      if (quantity <= 0) cart.items.splice(idx, 1);
      else cart.items[idx].quantity = Math.min(quantity, 50);

      await cart.save();
      await cart.populate('items.menuItem', 'name price image isAvailable');
      return res.json({
        success: true,
        message: quantity <= 0 ? 'Item removed' : 'Quantity updated',
        cart: { items: cart.items, total: calculateTotal(cart.items) },
        isGuest: false
      });
    }

    // Guest
    if (!req.session.cart) return res.status(404).json({ success: false, message: 'Cart empty' });
    const idx = req.session.cart.findIndex(i => i._id === itemId); // ← FIXED: Match only on _id
    if (idx === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

    if (quantity <= 0) req.session.cart.splice(idx, 1);
    else req.session.cart[idx].quantity = Math.min(quantity, 50);

    const populatedItems = await populateItems(req.session.cart);
    res.json({
      success: true,
      message: quantity <= 0 ? 'Item removed' : 'Quantity updated',
      cart: { items: populatedItems, total: calculateTotal(req.session.cart) },
      isGuest: true
    });
  } catch (err) {
    console.error('updateQuantity error:', err);
    res.status(500).json({ success: false, message: 'Error updating quantity' });
  }
};

// DELETE /api/cart/item/:itemId
const removeItem = async (req, res) => {
  const { itemId } = req.params;
  const userId = req.user?.id;

  try {
    if (userId) {
      const cart = await Cart.findOne({ user: userId });
      if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

      cart.items = cart.items.filter(i => i._id.toString() !== itemId);
      await cart.save();
      await cart.populate('items.menuItem', 'name price image isAvailable');

      return res.json({
        success: true,
        message: 'Item removed',
        cart: { items: cart.items, total: calculateTotal(cart.items) },
        isGuest: false
      });
    }

    // Guest
    if (!req.session.cart) return res.status(404).json({ success: false, message: 'Cart empty' });
    req.session.cart = req.session.cart.filter(i => i._id !== itemId); // ← FIXED: Match only on _id

    const populatedItems = await populateItems(req.session.cart);
    res.json({
      success: true,
      message: 'Item removed',
      cart: { items: populatedItems, total: calculateTotal(req.session.cart) },
      isGuest: true
    });
  } catch (err) {
    console.error('removeItem error:', err);
    res.status(500).json({ success: false, message: 'Error removing item' });
  }
};

// DELETE /api/cart/clear
const clearCart = async (req, res) => {
  try {
    if (req.user?.id) {
      await Cart.updateOne({ user: req.user.id }, { $set: { items: [] } });
    } else {
      req.session.cart = [];
    }

    res.json({
      success: true,
      message: 'Cart cleared!',
      cart: { items: [], total: 0 },
      isGuest: !req.user
    });
  } catch (err) {
    console.error('clearCart error:', err);
    res.status(500).json({ success: false, message: 'Error clearing cart' });
  }
};

module.exports = { getCart, addToCart, updateQuantity, removeItem, clearCart };