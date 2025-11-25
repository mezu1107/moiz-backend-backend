// src/controllers/cart/cartController.js
const Cart = require('../../models/cart/Cart');
const MenuItem = require('../../models/menuItem/MenuItem');
const Address = require('../../models/address/Address');

const getUserAreaFromDefaultAddress = async (userId) => {
  const defaultAddress = await Address.findOne({ user: userId, isDefault: true })
    .select('location area')
    .populate('area', '_id');
  return defaultAddress?.area || null;
};

// GET CART
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate('items.menuItem', 'name price image isAvailable');

    if (!cart || cart.items.length === 0) {
      return res.json({ success: true, cart: { items: [], total: 0 } });
    }

    const total = cart.items.reduce((sum, i) => sum + (i.priceAtAdd * i.quantity), 0);
    res.json({ success: true, cart: { ...cart.toObject(), total } });
  } catch (err) {
    console.error('getCart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ADD TO CART — NOW USING DEFAULT ADDRESS (MOST ACCURATE)
const addToCart = async (req, res) => {
  const { menuItemId, quantity = 1 } = req.body;
  const userId = req.user.id;

  try {
    const menuItem = await MenuItem.findById(menuItemId).select('price isAvailable availableInAreas');
    if (!menuItem) return res.status(404).json({ success: false, message: 'Item not found' });
    if (!menuItem.isAvailable) return res.status(400).json({ success: false, message: 'Item unavailable' });

    // Get user's default address area
    const userArea = await getUserAreaFromDefaultAddress(userId);
    const isEverywhere = menuItem.availableInAreas.length === 0;
    const isInArea = userArea && menuItem.availableInAreas.some(id => id.toString() === userArea._id.toString());

    if (!isEverywhere && !isInArea) {
      return res.status(400).json({
        success: false,
        message: 'This item is not available in your delivery area'
      });
    }

    let cart = await Cart.findOne({ user: userId }) || new Cart({ user: userId, items: [] });

    const existingIndex = cart.items.findIndex(i => i.menuItem.toString() === menuItemId);
    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({ menuItem: menuItemId, quantity, priceAtAdd: menuItem.price });
    }

    cart.updatedAt = Date.now();
    await cart.save();

    await cart.populate('items.menuItem', 'name price image isAvailable');
    const total = cart.items.reduce((sum, i) => sum + i.priceAtAdd * i.quantity, 0);

    res.json({ success: true, cart: { ...cart.toObject(), total } });
  } catch (err) {
    console.error('addToCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to add to cart' });
  }
};

// REMOVE ITEM — updatedAt fixed
const removeItem = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    cart.items = cart.items.filter(item => item._id.toString() !== req.params.itemId);
    cart.updatedAt = Date.now();
    await cart.save();

    await cart.populate('items.menuItem');
    const total = cart.items.reduce((sum, i) => sum + i.priceAtAdd * i.quantity, 0);

    res.json({ success: true, cart: { ...cart.toObject(), total } });
  } catch (err) {
    console.error('removeItem error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove item' });
  }
};

const clearCart = async (req, res) => {
  try {
    await Cart.deleteOne({ user: req.user.id });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
};

module.exports = { getCart, addToCart, removeItem, clearCart };