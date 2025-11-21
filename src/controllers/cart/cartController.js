// src/controllers/cart/cartController.js
const Cart = require('../../models/cart/Cart');
const MenuItem = require('../../models/menuItem/MenuItem');
const Area = require('../../models/area/Area');

const getUserArea = async (lat, lng) => {
  const point = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };
  return await Area.findOne({
    isActive: true,
    polygon: { $geoIntersects: { $geometry: point } }
  });
};

// GET CART
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate('items.menuItem', 'name price image isAvailable');

    if (!cart || cart.items.length === 0) {
      return res.json({ success: true, cart: { items: [], total: 0 } });
    }

    res.json({ success: true, cart });
  } catch (err) {
    console.error('getCart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ADD TO CART (WITH AREA CHECK!)
const addToCart = async (req, res) => {
  const { menuItemId, quantity = 1 } = req.body;
  const userId = req.user.id;

  try {
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    if (!menuItem.isAvailable) {
      return res.status(400).json({ success: false, message: 'This item is currently unavailable' });
    }

    // AREA CHECK: Only allow if item is available in user's current area
    const userLocation = req.headers['user-location']; // You'll set this from frontend
    if (userLocation) {
      const [lat, lng] = userLocation.split(',');
      const area = await getUserArea(lat, lng);
      
      const isEverywhere = menuItem.availableInAreas.length === 0;
      const isInArea = area && menuItem.availableInAreas.includes(area._id);

      if (!isEverywhere && !isInArea) {
        return res.status(400).json({
          success: false,
          message: 'This item is not available in your area'
        });
      }
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      item => item.menuItem.toString() === menuItemId
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        menuItem: menuItemId,
        quantity,
        priceAtAdd: menuItem.price
      });
    }

    cart.updatedAt = Date.now();
    await cart.save();
    await cart.populate('items.menuItem', 'name price image');

    const total = cart.items.reduce((sum, i) => sum + (i.priceAtAdd * i.quantity), 0);

    res.json({ success: true, cart: { ...cart.toObject(), total } });
  } catch (err) {
    console.error('addToCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to add to cart' });
  }
};

// REMOVE ITEM
const removeItem = async (req, res) => {
  const { itemId } = req.params;

  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    cart.updatedAt = Date.now();
    await cart.save();
    await cart.populate('items.menuItem');

    const total = cart.items.reduce((sum, i) => sum + (i.priceAtAdd * i.quantity), 0);

    res.json({ success: true, cart: { ...cart.toObject(), total } });
  } catch (err) {
    console.error('removeItem error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove item' });
  }
};

// CLEAR CART
const clearCart = async (req, res) => {
  try {
    await Cart.deleteOne({ user: req.user.id });
    res.json({ success: true, message: 'Cart cleared successfully' });
  } catch (err) {
    console.error('clearCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
};

module.exports = { getCart, addToCart, removeItem, clearCart };