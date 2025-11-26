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
      return res.json({
        success: true,
        message: 'Your cart is empty',
        cart: { items: [], total: 0 }
      });
    }

    const total = cart.items.reduce((sum, i) => sum + (i.priceAtAdd * i.quantity), 0);

    res.json({
      success: true,
      message: 'Cart retrieved successfully',
      cart: { ...cart.toObject(), total }
    });
  } catch (err) {
    console.error('getCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to load cart' });
  }
};

// ADD TO CART
const addToCart = async (req, res) => {
  const { menuItemId, quantity = 1 } = req.body;
  const userId = req.user.id;

  try {
    const menuItem = await MenuItem.findById(menuItemId)
      .select('name price isAvailable availableInAreas');

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Oops! This item no longer exists'
      });
    }

    if (!menuItem.isAvailable) {
      return res.status(400).json({
        success: false,
        message: `${menuItem.name} is currently unavailable`
      });
    }

    // Check delivery area
    const userArea = await getUserAreaFromDefaultAddress(userId);
    const isEverywhere = menuItem.availableInAreas.length === 0;
    const isInArea = userArea && menuItem.availableInAreas.some(
      id => id.toString() === userArea._id.toString()
    );

    if (!isEverywhere && !isInArea) {
      return res.status(400).json({
        success: false,
        message: `${menuItem.name} is not available in your area`
      });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      i => i.menuItem.toString() === menuItemId
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
      await cart.populate('items.menuItem', 'name price image isAvailable');
      const total = cart.items.reduce((sum, i) => sum + i.priceAtAdd * i.quantity, 0);

      return res.json({
        success: true,
        message: `Added ${quantity} more ${menuItem.name} to your cart`,
        cart: { ...cart.toObject(), total }
      });
    } else {
      cart.items.push({
        menuItem: menuItemId,
        quantity,
        priceAtAdd: menuItem.price
      });
      await cart.save();
      await cart.populate('items.menuItem', 'name price image isAvailable');
      const total = cart.items.reduce((sum, i) => sum + i.priceAtAdd * i.quantity, 0);

      return res.json({
        success: true,
        message: `${menuItem.name} added to cart!`,
        cart: { ...cart.toObject(), total }
      });
    }
  } catch (err) {
    console.error('addToCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to add item to cart' });
  }
};

// REMOVE ITEM FROM CART
const removeItem = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item._id.toString() === req.params.itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    const removedItem = cart.items[itemIndex];
    const itemName = (await MenuItem.findById(removedItem.menuItem))?.name || 'Item';

    cart.items.splice(itemIndex, 1);
    cart.updatedAt = Date.now();
    await cart.save();

    await cart.populate('items.menuItem', 'name price image isAvailable');
    const total = cart.items.reduce((sum, i) => sum + i.priceAtAdd * i.quantity, 0);

    res.json({
      success: true,
      message: `${itemName} removed from cart`,
      cart: { ...cart.toObject(), total }
    });
  } catch (err) {
    console.error('removeItem error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove item' });
  }
};

// CLEAR CART
const clearCart = async (req, res) => {
  try {
    const result = await Cart.deleteOne({ user: req.user.id });

    if (result.deletedCount === 0) {
      return res.json({
        success: true,
        message: 'Your cart was already empty'
      });
    }

    res.json({
      success: true,
      message: 'Cart cleared successfully!'
    });
  } catch (err) {
    console.error('clearCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
};

module.exports = {
  getCart,
  addToCart,
  removeItem,
  clearCart
};