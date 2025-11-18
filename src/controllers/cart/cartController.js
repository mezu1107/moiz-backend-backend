// src/controllers/cart/cartController.js
const Cart = require('../../models/cart/Cart');
const MenuItem = require('../../models/menuItem/MenuItem');

const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.menuItem');
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
    }
    res.json({ success: true, cart });
  } catch (err) {
    console.error('getCart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addToCart = async (req, res) => {
  const { menuItemId, quantity = 1 } = req.body;

  try {
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem || !menuItem.isAvailable) {
      return res.status(400).json({ success: false, message: 'Item not available' });
    }

    let cart = await Cart.findOne({ user: req.user.id }) || new Cart({ user: req.user.id, items: [] });
    const index = cart.items.findIndex(i => i.menuItem.toString() === menuItemId);

    if (index > -1) {
      cart.items[index].quantity += quantity;
    } else {
      cart.items.push({ menuItem: menuItemId, quantity, priceAtAdd: menuItem.price });
    }

    cart.updatedAt = Date.now();
    await cart.save();
    await cart.populate('items.menuItem');

    res.json({ success: true, cart });
  } catch (err) {
    console.error('addToCart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const removeItem = async (req, res) => {
  const { itemId } = req.params;

  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    cart.updatedAt = Date.now();
    await cart.save();
    await cart.populate('items.menuItem');

    res.json({ success: true, cart });
  } catch (err) {
    console.error('removeItem error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const clearCart = async (req, res) => {
  try {
    await Cart.deleteOne({ user: req.user.id });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    console.error('clearCart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getCart, addToCart, removeItem, clearCart };