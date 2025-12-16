// src/models/inventory/Ingredient.js
const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  category: {
    type: String,
    enum: ['meat', 'vegetables', 'spices', 'dairy', 'grains', 'oil', 'packaging', 'other'],
    default: 'other'
  },
  unit: {
    type: String,
    enum: ['kg', 'gram', 'liter', 'ml', 'piece', 'packet', 'bottle', 'dozen'],
    default: 'kg'
  },
  currentStock: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  costPerUnit: { type: Number, default: 0 },
  supplier: { type: String, trim: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }  // Added: ensures virtuals work with .lean()
});

// Virtual to check if low stock — now reliably available even with .lean()
ingredientSchema.virtual('isLowStock').get(function() {
  return this.currentStock <= this.lowStockThreshold;
});

module.exports = mongoose.model('Ingredient', ingredientSchema);