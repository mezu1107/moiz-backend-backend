const mongoose = require('mongoose');
const Cart = require('../../models/cart/Cart');
const MenuItem = require('../../models/menuItem/MenuItem');

const calculateTotal = (items = []) =>
  items.reduce((sum, { priceAtAdd, quantity }) => sum + priceAtAdd * quantity, 0);

const populateItems = async (cartItems) => {
  return Promise.all(
    cartItems.map(async (item) => {
      const menuItem = await MenuItem.findById(item.menuItem)
        .select('name price image isAvailable')
        .lean();
      return {
        ...item,
        menuItem: menuItem || { name: 'Item removed', isAvailable: false, price: 0, image: null }
      };
    })
  );
};

// GET CART
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
          cart: { items: [], total: 0, orderNote: '' },
          isGuest: false
        });
      }

      const total = calculateTotal(cart.items);
      return res.json({
        success: true,
        cart: { items: cart.items, total, orderNote: cart.orderNote || '' },
        isGuest: false
      });
    }

    // Guest
    const sessionCart = req.session.cart || [];
    const populatedItems = await populateItems(sessionCart);
    const total = calculateTotal(sessionCart);

    res.json({
      success: true,
      cart: { items: populatedItems, total, orderNote: req.session.orderNote || '' },
      isGuest: true
    });
  } catch (err) {
    console.error('getCart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper: normalize arrays
const toArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(v => typeof v === 'string' && v.trim());
  return typeof val === 'string' && val.trim() ? [val.trim()] : [];
};

// ADD TO CART – NOW WITH CUSTOMIZATIONS
// ADD TO CART – NOW CALCULATES priceAtAdd INCLUDING PAID EXTRAS
const addToCart = async (req, res) => {
  const {
    menuItemId,
    quantity = 1,
    sides = [],
    drinks = [],
    addOns = [],
    specialInstructions = '',
    orderNote = ''
  } = req.body;

  const userId = req.user?.id;

  try {
    if (!menuItemId) return res.status(400).json({ success: false, message: 'menuItemId required' });

    // Fetch item with pricedOptions
    const menuItem = await MenuItem.findById(menuItemId)
      .select('name price isAvailable pricedOptions')
      .lean();

    if (!menuItem) return res.status(404).json({ success: false, message: 'Item not found' });
    if (!menuItem.isAvailable) return res.status(400).json({ success: false, message: `${menuItem.name} unavailable` });

    const options = menuItem.pricedOptions || { sides: [], drinks: [], addOns: [] };

    const normalizedSides = toArray(sides);
    const normalizedDrinks = toArray(drinks);
    const normalizedAddOns = toArray(addOns);
    const trimmedSpecial = (specialInstructions || '').trim().slice(0, 300);
    const trimmedOrderNote = (orderNote || '').trim().slice(0, 500);

    // Calculate extra price from selected predefined options only
    const extrasPrice =
      normalizedSides.reduce((sum, s) => {
        const opt = options.sides.find(o => o.name === s);
        return sum + (opt?.price || 0);
      }, 0) +
      normalizedDrinks.reduce((sum, d) => {
        const opt = options.drinks.find(o => o.name === d);
        return sum + (opt?.price || 0);
      }, 0) +
      normalizedAddOns.reduce((sum, a) => {
        const opt = options.addOns.find(o => o.name === a);
        return sum + (opt?.price || 0);
      }, 0);

    const finalPriceAtAdd = menuItem.price + extrasPrice;

    if (userId) {
      let cart = await Cart.findOne({ user: userId });
      if (!cart) cart = new Cart({ user: userId, items: [] });

      const existingIdx = cart.items.findIndex(i =>
        i.menuItem.toString() === menuItemId &&
        arraysEqual(i.sides || [], normalizedSides) &&
        arraysEqual(i.drinks || [], normalizedDrinks) &&
        arraysEqual(i.addOns || [], normalizedAddOns) &&
        i.specialInstructions === trimmedSpecial
      );

      if (existingIdx > -1) {
        cart.items[existingIdx].quantity = Math.min(cart.items[existingIdx].quantity + quantity, 50);
      } else {
        cart.items.push({
          menuItem: menuItemId,
          quantity,
          priceAtAdd: finalPriceAtAdd,
          sides: normalizedSides,
          drinks: normalizedDrinks,
          addOns: normalizedAddOns,
          specialInstructions: trimmedSpecial
        });
      }

      if (trimmedOrderNote) cart.orderNote = trimmedOrderNote;

      await cart.save();
      await cart.populate('items.menuItem', 'name price image isAvailable');
      const total = calculateTotal(cart.items);

      return res.json({
        success: true,
        message: existingIdx > -1 ? `Added ${quantity} more` : `${menuItem.name} added!`,
        cart: { items: cart.items, total, orderNote: cart.orderNote || '' },
        isGuest: false
      });
    }

    // Guest flow (same logic)
    if (!req.session.cart) req.session.cart = [];
    if (!req.session.orderNote) req.session.orderNote = '';

    const existingIdx = req.session.cart.findIndex(i =>
      i.menuItem === menuItemId &&
      arraysEqual(i.sides || [], normalizedSides) &&
      arraysEqual(i.drinks || [], normalizedDrinks) &&
      arraysEqual(i.addOns || [], normalizedAddOns) &&
      i.specialInstructions === trimmedSpecial
    );

    if (existingIdx > -1) {
      req.session.cart[existingIdx].quantity = Math.min(req.session.cart[existingIdx].quantity + quantity, 50);
    } else {
      req.session.cart.push({
        _id: new mongoose.Types.ObjectId().toString(),
        menuItem: menuItemId,
        quantity,
        priceAtAdd: finalPriceAtAdd,
        sides: normalizedSides,
        drinks: normalizedDrinks,
        addOns: normalizedAddOns,
        specialInstructions: trimmedSpecial,
        addedAt: new Date().toISOString()
      });
    }

    if (trimmedOrderNote) req.session.orderNote = trimmedOrderNote;

    const populatedItems = await populateItems(req.session.cart);
    const total = calculateTotal(req.session.cart);

    res.json({
      success: true,
      message: existingIdx > -1 ? `Added ${quantity} more` : `${menuItem.name} added!`,
      cart: { items: populatedItems, total, orderNote: req.session.orderNote || '' },
      isGuest: true
    });
  } catch (err) {
    console.error('addToCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to add item' });
  }
};
// Helper to compare arrays (order-insensitive)
const arraysEqual = (a, b) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
};

// UPDATE CART ITEM (quantity + all customizations)
const updateQuantity = async (req, res) => {
  const {
    quantity,
    sides,
    drinks,
    addOns,
    specialInstructions,
    orderNote
  } = req.body;

  const { itemId } = req.params;
  const userId = req.user?.id;

  try {
    const normalizedSides = toArray(sides);
    const normalizedDrinks = toArray(drinks);
    const normalizedAddOns = toArray(addOns);
    const trimmedSpecial = specialInstructions ? (specialInstructions.trim()).slice(0, 300) : undefined;
    const trimmedOrderNote = orderNote ? (orderNote.trim()).slice(0, 500) : undefined;

    if (userId) {
      const cart = await Cart.findOne({ user: userId });
      if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

      const idx = cart.items.findIndex(i => i._id.toString() === itemId);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

      if (quantity !== undefined) {
        if (quantity <= 0) {
          cart.items.splice(idx, 1);
        } else {
          cart.items[idx].quantity = Math.min(quantity, 50);
        }
      }
      if (normalizedSides.length) cart.items[idx].sides = normalizedSides;
      if (normalizedDrinks.length) cart.items[idx].drinks = normalizedDrinks;
      if (normalizedAddOns.length) cart.items[idx].addOns = normalizedAddOns;
      if (trimmedSpecial !== undefined) cart.items[idx].specialInstructions = trimmedSpecial;
      if (trimmedOrderNote !== undefined) cart.orderNote = trimmedOrderNote;

      await cart.save();
      await cart.populate('items.menuItem', 'name price image isAvailable');

      res.json({
        success: true,
        message: quantity <= 0 ? 'Item removed' : 'Cart updated',
        cart: { items: cart.items, total: calculateTotal(cart.items), orderNote: cart.orderNote },
        isGuest: false
      });
    } else {
      // Guest
      if (!req.session.cart) return res.status(404).json({ success: false, message: 'Cart empty' });

      const idx = req.session.cart.findIndex(i => i._id === itemId);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

      if (quantity !== undefined) {
        if (quantity <= 0) {
          req.session.cart.splice(idx, 1);
        } else {
          req.session.cart[idx].quantity = Math.min(quantity, 50);
        }
      }
      if (normalizedSides.length) req.session.cart[idx].sides = normalizedSides;
      if (normalizedDrinks.length) req.session.cart[idx].drinks = normalizedDrinks;
      if (normalizedAddOns.length) req.session.cart[idx].addOns = normalizedAddOns;
      if (trimmedSpecial !== undefined) req.session.cart[idx].specialInstructions = trimmedSpecial;
      if (trimmedOrderNote !== undefined) req.session.orderNote = trimmedOrderNote;

      const populatedItems = await populateItems(req.session.cart);
      res.json({
        success: true,
        message: quantity <= 0 ? 'Item removed' : 'Cart updated',
        cart: { items: populatedItems, total: calculateTotal(req.session.cart), orderNote: req.session.orderNote || '' },
        isGuest: true
      });
    }
  } catch (err) {
    console.error('updateQuantity error:', err);
    res.status(500).json({ success: false, message: 'Error updating cart' });
  }
};

// REMOVE ITEM (unchanged, just uses _id)
const removeItem = async (req, res) => {
  // ... (same as your previous version)
};

// CLEAR CART (unchanged, just clears orderNote too)
const clearCart = async (req, res) => {
  try {
    if (req.user?.id) {
      await Cart.updateOne({ user: req.user.id }, { $set: { items: [], orderNote: '' } });
    } else {
      req.session.cart = [];
      req.session.orderNote = '';
    }

    res.json({
      success: true,
      message: 'Cart cleared!',
      cart: { items: [], total: 0, orderNote: '' },
      isGuest: !req.user
    });
  } catch (err) {
    console.error('clearCart error:', err);
    res.status(500).json({ success: false, message: 'Error clearing cart' });
  }
};

module.exports = { getCart, addToCart, updateQuantity, removeItem, clearCart };