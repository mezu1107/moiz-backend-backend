// src/controllers/cart/cartController.js
// PRODUCTION-READY — JANUARY 09, 2026
// FINAL FIXED: No more "undefined is unavailable" error
// Clear 404 for missing items, proper messages

const mongoose = require('mongoose');
const Cart = require('../../models/cart/Cart');
const MenuItem = require('../../models/menuItem/MenuItem');

// Helper: calculate total from frozen priceAtAdd
const calculateTotal = (items = []) =>
  items.reduce((sum, { priceAtAdd, quantity }) => sum + priceAtAdd * quantity, 0);

// Helper: compare arrays order-insensitively
const arraysEqual = (a = [], b = []) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
};

// Helper: normalize string arrays
const toArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => v?.trim()).filter(Boolean);
  return typeof val === 'string' && val.trim() ? [val.trim()] : [];
};

// CORE: Recalculate priceAtAdd based on current menu item + selected options
const calculatePriceAtAdd = async (menuItemId, sides = [], drinks = [], addOns = []) => {
  const menuItem = await MenuItem.findById(menuItemId)
    .select('price pricedOptions name isAvailable')
    .lean();

  if (!menuItem) {
    return { priceAtAdd: 0, menuItem: null };
  }

  const options = menuItem.pricedOptions || { sides: [], drinks: [], addOns: [] };

  const extrasPrice =
    sides.reduce((sum, name) => sum + (options.sides.find(o => o.name === name)?.price || 0), 0) +
    drinks.reduce((sum, name) => sum + (options.drinks.find(o => o.name === name)?.price || 0), 0) +
    addOns.reduce((sum, name) => sum + (options.addOns.find(o => o.name === name)?.price || 0), 0);

  return {
    priceAtAdd: menuItem.price + extrasPrice,
    menuItem
  };
};

// OPTIMIZED: Populate cart items efficiently
const populateItems = async (cartItems) => {
  if (cartItems.length === 0) return [];

  const menuItemIds = [...new Set(cartItems.map(i => i.menuItem))];
  
  const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } })
    .select('name price unit image isAvailable pricedOptions')
    .lean();

  const menuMap = Object.fromEntries(
    menuItems.map(item => [item._id.toString(), item])
  );

  return cartItems.map((item) => {
    const menuItem = menuMap[item.menuItem?.toString()] || {
      _id: item.menuItem,
      name: 'Item removed or unavailable',
      price: 0,
      unit: 'pc',
      image: null,
      isAvailable: false,
      pricedOptions: { sides: [], drinks: [], addOns: [] }
    };

    const enrichOptions = (selectedNames, optionType) => {
      return selectedNames.map(name => {
        const option = menuItem.pricedOptions?.[optionType]?.find(o => o.name === name);
        return {
          name,
          price: option?.price || 0,
          unit: option?.unit || menuItem.unit
        };
      });
    };

    return {
      ...item,
      menuItem: {
        _id: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        unit: menuItem.unit,
        image: menuItem.image,
        isAvailable: menuItem.isAvailable
      },
      selectedOptions: {
        sides: enrichOptions(item.sides || [], 'sides'),
        drinks: enrichOptions(item.drinks || [], 'drinks'),
        addOns: enrichOptions(item.addOns || [], 'addOns')
      }
    };
  });
};

// GET CART
const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      let cart = await Cart.findOne({ user: userId });
      if (!cart || cart.items.length === 0) {
        return res.json({
          success: true,
          message: 'Your cart is empty',
          cart: { items: [], total: 0, orderNote: '' },
          isGuest: false
        });
      }

      const populatedItems = await populateItems(cart.items);
      const total = calculateTotal(cart.items);

      return res.json({
        success: true,
        cart: { items: populatedItems, total, orderNote: cart.orderNote || '' },
        isGuest: false
      });
    }

    // Guest cart
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

// ADD TO CART — FIXED
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
    // Validate ObjectId early
    if (!menuItemId || !mongoose.Types.ObjectId.isValid(menuItemId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid menuItemId required' 
      });
    }

    const normalizedSides = toArray(sides);
    const normalizedDrinks = toArray(drinks);
    const normalizedAddOns = toArray(addOns);
    const trimmedSpecial = (specialInstructions || '').trim().slice(0, 300);
    const trimmedOrderNote = (orderNote || '').trim().slice(0, 500);

    const { priceAtAdd, menuItem } = await calculatePriceAtAdd(
      menuItemId,
      normalizedSides,
      normalizedDrinks,
      normalizedAddOns
    );

    // FIXED: Proper 404 when item doesn't exist
    if (!menuItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Menu item not found' 
      });
    }

    // Proper message when unavailable
    if (!menuItem.isAvailable) {
      return res.status(400).json({ 
        success: false, 
        message: `${menuItem.name} is currently unavailable` 
      });
    }

    const newCartItemBase = {
      menuItem: menuItemId,
      quantity: Math.min(Math.max(1, quantity), 50),
      priceAtAdd,
      sides: normalizedSides,
      drinks: normalizedDrinks,
      addOns: normalizedAddOns,
      specialInstructions: trimmedSpecial
    };

    if (userId) {
      let cart = await Cart.findOne({ user: userId });
      if (!cart) cart = new Cart({ user: userId, items: [] });

      const existingIdx = cart.items.findIndex(i =>
        i.menuItem.toString() === menuItemId &&
        arraysEqual(i.sides, normalizedSides) &&
        arraysEqual(i.drinks, normalizedDrinks) &&
        arraysEqual(i.addOns, normalizedAddOns) &&
        i.specialInstructions === trimmedSpecial
      );

      if (existingIdx > -1) {
        cart.items[existingIdx].quantity = Math.min(
          cart.items[existingIdx].quantity + quantity,
          50
        );
      } else {
        cart.items.push(newCartItemBase);
      }

      if (trimmedOrderNote) cart.orderNote = trimmedOrderNote;

      await cart.save();

      const populatedItems = await populateItems(cart.items);
      const total = calculateTotal(cart.items);

      return res.json({
        success: true,
        message: existingIdx > -1 
          ? `Added ${quantity} more` 
          : `${menuItem.name} added to cart`,
        cart: { items: populatedItems, total, orderNote: cart.orderNote || '' },
        isGuest: false
      });
    }

    // Guest session
    if (!req.session.cart) req.session.cart = [];
    if (!req.session.orderNote) req.session.orderNote = '';

    const existingIdx = req.session.cart.findIndex(i =>
      i.menuItem === menuItemId &&
      arraysEqual(i.sides, normalizedSides) &&
      arraysEqual(i.drinks, normalizedDrinks) &&
      arraysEqual(i.addOns, normalizedAddOns) &&
      i.specialInstructions === trimmedSpecial
    );

    if (existingIdx > -1) {
      req.session.cart[existingIdx].quantity = Math.min(
        req.session.cart[existingIdx].quantity + quantity,
        50
      );
    } else {
      req.session.cart.push({
        ...newCartItemBase,
        _id: new mongoose.Types.ObjectId().toString(),
        addedAt: new Date()
      });
    }

    if (trimmedOrderNote) req.session.orderNote = trimmedOrderNote;

    const populatedItems = await populateItems(req.session.cart);
    const total = calculateTotal(req.session.cart);

    res.json({
      success: true,
      message: existingIdx > -1 
        ? `Added ${quantity} more` 
        : `${menuItem.name} added to cart`,
      cart: { items: populatedItems, total, orderNote: req.session.orderNote || '' },
      isGuest: true
    });
  } catch (err) {
    console.error('addToCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to add to cart' });
  }
};

// UPDATE CART ITEM — NOW CORRECTLY RECALCULATES priceAtAdd WHEN OPTIONS CHANGE
const updateQuantity = async (req, res) => {
  const { itemId } = req.params;
  const {
    quantity,
    sides,
    drinks,
    addOns,
    specialInstructions,
    orderNote
  } = req.body;

  const userId = req.user?.id;

  try {
    const normalizedSides = sides !== undefined ? toArray(sides) : undefined;
    const normalizedDrinks = drinks !== undefined ? toArray(drinks) : undefined;
    const normalizedAddOns = addOns !== undefined ? toArray(addOns) : undefined;
    const trimmedSpecial = specialInstructions !== undefined ? specialInstructions.trim().slice(0, 300) : undefined;
    const trimmedOrderNote = orderNote !== undefined ? orderNote.trim().slice(0, 500) : undefined;

    let cartItems;
    let orderNoteCurrent = '';

    if (userId) {
      const cart = await Cart.findOne({ user: userId });
      if (!cart || cart.items.length === 0) return res.status(404).json({ success: false, message: 'Cart not found' });

      const idx = cart.items.findIndex(i => i._id.toString() === itemId);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

      const currentItem = cart.items[idx];

      // Recalculate priceAtAdd if any option is being changed
      if (normalizedSides !== undefined || normalizedDrinks !== undefined || normalizedAddOns !== undefined) {
        const { priceAtAdd: newPriceAtAdd } = await calculatePriceAtAdd(
          currentItem.menuItem,
          normalizedSides ?? currentItem.sides,
          normalizedDrinks ?? currentItem.drinks,
          normalizedAddOns ?? currentItem.addOns
        );
        cart.items[idx].priceAtAdd = newPriceAtAdd;
      }

      if (quantity !== undefined) {
        if (quantity <= 0) {
          cart.items.splice(idx, 1);
        } else {
          cart.items[idx].quantity = Math.min(quantity, 50);
        }
      }

      if (normalizedSides !== undefined) cart.items[idx].sides = normalizedSides;
      if (normalizedDrinks !== undefined) cart.items[idx].drinks = normalizedDrinks;
      if (normalizedAddOns !== undefined) cart.items[idx].addOns = normalizedAddOns;
      if (trimmedSpecial !== undefined) cart.items[idx].specialInstructions = trimmedSpecial;
      if (trimmedOrderNote !== undefined) cart.orderNote = trimmedOrderNote;

      await cart.save();
      cartItems = cart.items;
      orderNoteCurrent = cart.orderNote || '';
    } else {
      // Guest
      if (!req.session.cart || req.session.cart.length === 0) {
        return res.status(404).json({ success: false, message: 'Cart is empty' });
      }

      const idx = req.session.cart.findIndex(i => i._id === itemId);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Item not in cart' });

      const currentItem = req.session.cart[idx];

      if (normalizedSides !== undefined || normalizedDrinks !== undefined || normalizedAddOns !== undefined) {
        const { priceAtAdd: newPriceAtAdd } = await calculatePriceAtAdd(
          currentItem.menuItem,
          normalizedSides ?? currentItem.sides,
          normalizedDrinks ?? currentItem.drinks,
          normalizedAddOns ?? currentItem.addOns
        );
        req.session.cart[idx].priceAtAdd = newPriceAtAdd;
      }

      if (quantity !== undefined) {
        if (quantity <= 0) {
          req.session.cart.splice(idx, 1);
        } else {
          req.session.cart[idx].quantity = Math.min(quantity, 50);
        }
      }

      if (normalizedSides !== undefined) req.session.cart[idx].sides = normalizedSides;
      if (normalizedDrinks !== undefined) req.session.cart[idx].drinks = normalizedDrinks;
      if (normalizedAddOns !== undefined) req.session.cart[idx].addOns = normalizedAddOns;
      if (trimmedSpecial !== undefined) req.session.cart[idx].specialInstructions = trimmedSpecial;
      if (trimmedOrderNote !== undefined) req.session.orderNote = trimmedOrderNote;

      cartItems = req.session.cart;
      orderNoteCurrent = req.session.orderNote || '';
    }

    const populatedItems = await populateItems(cartItems);
    const total = calculateTotal(cartItems);

    res.json({
      success: true,
      message: quantity <= 0 ? 'Item removed' : 'Cart updated',
      cart: { items: populatedItems, total, orderNote: orderNoteCurrent },
      isGuest: !userId
    });
  } catch (err) {
    console.error('updateQuantity error:', err);
    res.status(500).json({ success: false, message: 'Failed to update cart' });
  }
};

// REMOVE ITEM (unchanged – already safe)
const removeItem = async (req, res) => {
  const { itemId } = req.params;
  const userId = req.user?.id;

  try {
    let updated = false;
    let cartResponse = { items: [], total: 0, orderNote: '' };

    if (userId) {
      const cart = await Cart.findOne({ user: userId });
      if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

      const initialLength = cart.items.length;
      cart.items = cart.items.filter(i => i._id.toString() !== itemId);

      if (cart.items.length < initialLength) {
        updated = true;
        await cart.save();
        const populatedItems = await populateItems(cart.items);
        cartResponse = {
          items: populatedItems,
          total: calculateTotal(cart.items),
          orderNote: cart.orderNote || ''
        };
      }
    } else {
      if (!req.session.cart) return res.status(404).json({ success: false, message: 'Cart is empty' });

      const initialLength = req.session.cart.length;
      req.session.cart = req.session.cart.filter(i => i._id !== itemId);

      if (req.session.cart.length < initialLength) {
        updated = true;
        const populatedItems = await populateItems(req.session.cart);
        cartResponse = {
          items: populatedItems,
          total: calculateTotal(req.session.cart),
          orderNote: req.session.orderNote || ''
        };
      }
    }

    if (!updated) return res.status(404).json({ success: false, message: 'Item not found in cart' });

    res.json({
      success: true,
      message: 'Item removed',
      cart: cartResponse,
      isGuest: !userId
    });
  } catch (err) {
    console.error('removeItem error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove item' });
  }
};

// CLEAR CART (unchanged)
const clearCart = async (req, res) => {
  try {
    if (req.user?.id) {
      await Cart.updateOne(
        { user: req.user.id },
        { $set: { items: [], orderNote: '' } }
      );
    } else {
      req.session.cart = [];
      req.session.orderNote = '';
    }

    res.json({
      success: true,
      message: 'Cart cleared',
      cart: { items: [], total: 0, orderNote: '' },
      isGuest: !req.user
    });
  } catch (err) {
    console.error('clearCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
};

module.exports = { getCart, addToCart, updateQuantity, removeItem, clearCart };