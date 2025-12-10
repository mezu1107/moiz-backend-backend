// src/controllers/cart/cartController.js
// FINAL VERSION — GUEST + AUTH SUPPORT — DECEMBER 2025
const Cart = require('../../models/cart/Cart');
const MenuItem = require('../../models/menuItem/MenuItem');

const calculateTotal = (items = []) =>
  items.reduce((sum, { priceAtAdd, quantity }) => sum + priceAtAdd * quantity, 0);

// GET CART — Guest + Logged-in
const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;

    // Logged-in user → DB cart
    if (userId) {
      const cart = await Cart.findOne({ user: userId }).populate(
        'items.menuItem',
        'name price image isAvailable'
      );

      if (!cart || cart.items.length === 0) {
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
        cart: { ...cart.toObject(), total },
        isGuest: false
      });
    }

    // Guest → Session cart
    const sessionCart = req.session.cart || [];
    if (sessionCart.length === 0) {
      return res.json({
        success: true,
        message: 'Your cart is empty',
        cart: { items: [], total: 0 },
        isGuest: true
      });
    }

    // Populate menu items for guest cart (critical!)
    const populatedItems = await Promise.all(
      sessionCart.map(async (item) => {
        const menuItem = await MenuItem.findById(item.menuItem)
          .select('name price image isAvailable')
          .lean();
        return { ...item, menuItem: menuItem || { name: 'Item removed', isAvailable: false } };
      })
    );

    const total = calculateTotal(sessionCart);

    res.json({
      success: true,
      message: 'Cart retrieved',
      cart: { items: populatedItems, total },
      isGuest: true
    });
  } catch (err) {
    console.error('getCart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ADD TO CART — Guest + Logged-in
const addToCart = async (req, res) => {
  const { menuItemId, quantity = 1 } = req.body;
  const userId = req.user?.id;

  try {
    const menuItem = await MenuItem.findById(menuItemId).select('name price isAvailable');
    if (!menuItem) return res.status(404).json({ success: false, message: 'Item not found' });
    if (!menuItem.isAvailable) return res.status(400).json({ success: false, message: `${menuItem.name} unavailable` });

    if (userId) {
      // Logged-in: DB cart
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
        cart: { ...cart.toObject(), total },
        isGuest: false
      });
    }

    // Guest: Session cart
    if (!req.session.cart) req.session.cart = [];

    const idx = req.session.cart.findIndex(i => i.menuItem === menuItemId);
    if (idx > -1) {
      req.session.cart[idx].quantity = Math.min(req.session.cart[idx].quantity + quantity, 50);
    } else {
      req.session.cart.push({
        menuItem: menuItemId,
        quantity,
        priceAtAdd: menuItem.price
      });
    }

    // Populate for response
    const populated = await Promise.all(
      req.session.cart.map(async (item) => {
        const mi = await MenuItem.findById(item.menuItem).select('name price image isAvailable').lean();
        return { ...item, menuItem: mi };
      })
    );

    const total = calculateTotal(req.session.cart);

    res.json({
      success: true,
      message: idx > -1 ? `Added ${quantity} more` : `${menuItem.name} added!`,
      cart: { items: populated, total },
      isGuest: true
    });
  } catch (err) {
    console.error('addToCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to add item' });
  }
};

// UPDATE QUANTITY — Guest + Logged-in
const updateQuantity = async (req, res) => {
  const { quantity } = req.body;
  const { itemId } = req.params;
  const userId = req.user?.id;

  try {
    if (userId) {
      const cart = await Cart.findOne({ user: userId });
      if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

      const idx = cart.items.findIndex(i => i._id.toString() === itemId);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

      if (quantity <= 0) {
        cart.items.splice(idx, 1);
      } else {
        cart.items[idx].quantity = Math.min(quantity, 50);
      }

      await cart.save();
      await cart.populate('items.menuItem', 'name price image isAvailable');
      const total = calculateTotal(cart.items);

      return res.json({
        success: true,
        message: quantity <= 0 ? 'Item removed' : 'Quantity updated',
        cart: { ...cart.toObject(), total },
        isGuest: false
      });
    }

    // Guest
    if (!req.session.cart) return res.status(404).json({ success: false, message: 'Cart empty' });

    const idx = req.session.cart.findIndex(i => i._id?.toString() === itemId || i.menuItem === itemId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

   if (quantity <= 0) {
  req.session.cart.splice(idx, 1);
} else {
  req.session.cart[idx].quantity = Math.min(quantity, 50);
}
    const populated = await Promise.all(
      req.session.cart.map(async (i) => ({
        ...i,
        menuItem: await MenuItem.findById(i.menuItem).select('name price image isAvailable').lean()
      }))
    );

    res.json({
      success: true,
      message: quantity <= 0 ? 'Item removed' : 'Quantity updated',
      cart: { items: populated, total: calculateTotal(req.session.cart) },
      isGuest: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error' });
  }
};

// REMOVE ITEM — Guest + Logged-in
const removeItem = async (req, res) => {
  const { itemId } = req.params;
  const userId = req.user?.id;

  try {
    if (userId) {
      const cart = await Cart.findOne({ user: userId });
      if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

      const idx = cart.items.findIndex(i => i._id.toString() === itemId);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Item not found' });

      cart.items.splice(idx, 1);
      await cart.save();
      await cart.populate('items.menuItem');
      return res.json({
        success: true,
        message: 'Item removed',
        cart: { ...cart.toObject(), total: calculateTotal(cart.items) },
        isGuest: false
      });
    }

    // Guest
    if (!req.session.cart) return res.status(404).json({ success: false, message: 'Cart empty' });
    req.session.cart = req.session.cart.filter(i => i._id?.toString() !== itemId && i.menuItem !== itemId);

    const populated = await Promise.all(
      req.session.cart.map(async i => ({
        ...i,
        menuItem: await MenuItem.findById(i.menuItem).lean()
      }))
    );

    res.json({
      success: true,
      message: 'Item removed',
      cart: { items: populated, total: calculateTotal(req.session.cart) },
      isGuest: true
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error' });
  }
};

// CLEAR CART
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
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

module.exports = { getCart, addToCart, updateQuantity, removeItem, clearCart };