// src/controllers/inventory/inventoryController.js

const Ingredient = require('../../models/inventory/Ingredient');
const StockTransaction = require('../../models/inventory/StockTransaction');

// GET ALL INGREDIENTS
const getIngredients = async (req, res) => {
  try {
    const ingredients = await Ingredient.find({ isActive: true })
      .sort({ name: 1 })
      .lean(); // virtuals are now included thanks to toObject setting

    const lowStockItems = ingredients.filter(i => i.isLowStock); // Use virtual instead of manual check

    res.json({
      success: true,
      total: ingredients.length,
      lowStockCount: lowStockItems.length,
      ingredients,
      lowStockItems
    });
  } catch (err) {
    console.error('getIngredients error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// CREATE INGREDIENT (Admin) — unchanged
const createIngredient = async (req, res) => {
  try {
    const { name, category, unit, lowStockThreshold, costPerUnit, supplier } = req.body;
    const existing = await Ingredient.findOne({ 
      name: { $regex: `^${name.trim()}$`, $options: 'i' } 
    });
    if (existing) return res.status(400).json({ success: false, message: 'Ingredient already exists' });

    const ingredient = await Ingredient.create({
      name: name.trim(),
      category: category || 'other',
      unit: unit || 'kg',
      lowStockThreshold: lowStockThreshold ?? 5,
      costPerUnit: costPerUnit ?? 0,
      supplier: supplier?.trim() || null,
      currentStock: 0
    });

    res.status(201).json({ success: true, message: 'Ingredient created successfully', ingredient });
  } catch (err) {
    console.error('createIngredient error:', err);
    res.status(500).json({ success: false, message: 'Failed to create ingredient' });
  }
};

// UPDATE INGREDIENT (Admin) — improved using .set()
const updateIngredient = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const ingredient = await Ingredient.findById(id);
    if (!ingredient) return res.status(404).json({ success: false, message: 'Ingredient not found' });

    // Check name uniqueness if name is being changed
    if (updates.name) {
      const trimmedName = updates.name.trim();
      if (trimmedName.toLowerCase() !== ingredient.name.toLowerCase()) {
        const exists = await Ingredient.findOne({
          name: { $regex: `^${trimmedName}$`, $options: 'i' },
          _id: { $ne: id }
        });
        if (exists) return res.status(400).json({ success: false, message: 'Ingredient name already exists' });
      }
      updates.name = trimmedName; // ensure trimmed
    }

    // Cleaner and safer: use Mongoose .set()
    ingredient.set(updates);

    await ingredient.save();

    res.json({ success: true, message: 'Ingredient updated successfully', ingredient });
  } catch (err) {
    console.error('updateIngredient error:', err);
    res.status(500).json({ success: false, message: 'Failed to update ingredient' });
  }
};

// DELETE / DEACTIVATE INGREDIENT (Admin) — unchanged
const deleteIngredient = async (req, res) => {
  const { id } = req.params;
  try {
    const ingredient = await Ingredient.findById(id);
    if (!ingredient) return res.status(404).json({ success: false, message: 'Ingredient not found' });

    ingredient.isActive = false;
    await ingredient.save();

    res.json({ success: true, message: `${ingredient.name} has been deactivated` });
  } catch (err) {
    console.error('deleteIngredient error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete ingredient' });
  }
};

// ADD STOCK — minor cleanup
const addStock = async (req, res) => {
  const { ingredientId, quantity, note, costPerUnit } = req.body;

  try {
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) return res.status(404).json({ success: false, message: 'Ingredient not found' });

    const prevStock = ingredient.currentStock;
    const wasLow = prevStock <= ingredient.lowStockThreshold;

    ingredient.currentStock += Number(quantity);
    if (costPerUnit !== undefined) ingredient.costPerUnit = costPerUnit;

    await ingredient.save();

    await StockTransaction.create({
      ingredient: ingredientId,
      type: 'purchase',
      quantity,
      previousStock: prevStock,
      newStock: ingredient.currentStock,
      note: note || 'Stock added',
      createdBy: req.user.id
    });

    const isNowLow = ingredient.currentStock <= ingredient.lowStockThreshold;

    // Emit alerts
    if (wasLow && !isNowLow) {
      global.io?.to('admin').emit('stock-restored', { 
        ingredient: ingredient.name, 
        current: ingredient.currentStock 
      });
    }
    if (isNowLow) {
      global.io?.to('admin').emit('low-stock-alert', {
        ingredient: ingredient.name,
        current: ingredient.currentStock,
        threshold: ingredient.lowStockThreshold,
        unit: ingredient.unit
      });
    }

    res.json({ success: true, message: `Added ${quantity} ${ingredient.unit} to ${ingredient.name}`, ingredient });
  } catch (err) {
    console.error('addStock error:', err);
    res.status(500).json({ success: false, message: 'Failed to add stock' });
  }
};

// RECORD WASTE — unchanged logic
const recordWaste = async (req, res) => {
  const { ingredientId, quantity, note } = req.body;

  try {
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) return res.status(404).json({ success: false, message: 'Ingredient not found' });
    if (ingredient.currentStock < quantity) return res.status(400).json({ success: false, message: 'Not enough stock' });

    const prevStock = ingredient.currentStock;
    ingredient.currentStock -= quantity;
    await ingredient.save();

    await StockTransaction.create({
      ingredient: ingredientId,
      type: 'waste',
      quantity,
      previousStock: prevStock,
      newStock: ingredient.currentStock,
      note: note || 'Waste recorded',
      createdBy: req.user.id
    });

    if (ingredient.currentStock <= ingredient.lowStockThreshold) {
      global.io?.to('admin').emit('low-stock-alert', {
        ingredient: ingredient.name,
        current: ingredient.currentStock,
        threshold: ingredient.lowStockThreshold,
        unit: ingredient.unit
      });
    }

    res.json({ success: true, message: 'Waste recorded successfully' });
  } catch (err) {
    console.error('recordWaste error:', err);
    res.status(500).json({ success: false, message: 'Failed to record waste' });
  }
};

// GET STOCK HISTORY — unchanged
const getStockHistory = async (req, res) => {
  const { ingredientId, days = 30 } = req.query;

  try {
    const filter = ingredientId ? { ingredient: ingredientId } : {};
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - parseInt(days));

    const history = await StockTransaction.find({ ...filter, createdAt: { $gte: fromDate } })
      .populate('ingredient', 'name unit')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, history, count: history.length });
  } catch (err) {
    console.error('getStockHistory error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// AUTO DEDUCT STOCK (for orders) — keep internal, no change needed
const deductStock = async (ingredientId, quantity, orderId, note = 'Used in order') => {
  try {
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient || ingredient.currentStock < quantity) return false;

    const prevStock = ingredient.currentStock;
    ingredient.currentStock = Math.max(0, ingredient.currentStock - quantity);
    await ingredient.save();

    await StockTransaction.create({
      ingredient: ingredientId,
      type: 'use',
      quantity,
      previousStock: prevStock,
      newStock: ingredient.currentStock,
      order: orderId,
      note,
      createdBy: null
    });

    if (ingredient.currentStock <= ingredient.lowStockThreshold) {
      global.io?.to('admin').emit('low-stock-alert', {
        ingredient: ingredient.name,
        current: ingredient.currentStock,
        threshold: ingredient.lowStockThreshold,
        unit: ingredient.unit
      });
    }

    return true;
  } catch (err) {
    console.error('deductStock error:', err);
    return false;
  }
};

module.exports = {
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  addStock,
  recordWaste,
  getStockHistory,
  deductStock
};