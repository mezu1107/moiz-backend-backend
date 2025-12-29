// src/models/menuItem/MenuItem.js
const mongoose = require('mongoose');

// List of allowed units – used for both main item and customization options
const ALLOWED_UNITS = [
  'pc',      // piece (default)
  'bottle',
  'kg',
  'g',
  'slice',
  'cup',
  'ml',
  'liter',
  'pack',
  'dozen',
  'tray'
];

// Sub-schema for priced customization options (sides, drinks, addOns)
const optionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, default: 0, min: 0 }, // 0 = free

  // Optional unit for this specific option (e.g., a side of fries might be in 'g' or 'tray')
  // If not set, the frontend falls back to the main menu item's unit
  unit: {
    type: String,
    enum: ALLOWED_UNITS,
    default: 'pc',
    trim: true
  }
}, { _id: false }); // No separate _id for sub-documents in arrays

// Main MenuItem schema
const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  image: { type: String },
  cloudinaryId: { type: String },

  // Unit for the main menu item (e.g., "per piece", "per kg", "per bottle")
  // Displayed in frontend UI next to price (e.g., "Rs. 599 / pc")
  // Defaults to 'pc' for backward compatibility with existing items
  unit: {
    type: String,
    enum: ALLOWED_UNITS,
    default: 'pc',
    trim: true
  },

  category: {
    type: String,
    required: true,
    enum: ['breakfast', 'lunch', 'dinner', 'desserts', 'beverages'],
    default: 'dinner'
  },
  isVeg: { type: Boolean, default: false },
  isSpicy: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  availableInAreas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Area' }],

  // Priced customization options (similar to Foodpanda/Uber Eats style)
  pricedOptions: {
    sides: [optionSchema],
    drinks: [optionSchema],
    addOns: [optionSchema]
  }
}, { timestamps: true });

// Indexes for common query patterns (category, availability, area filtering)
menuItemSchema.index({ category: 1 });
menuItemSchema.index({ isAvailable: 1 });
menuItemSchema.index({ availableInAreas: 1 });
// Compound index for frequent combined queries (e.g., available items in specific area by category)
menuItemSchema.index({ isAvailable: 1, availableInAreas: 1, category: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);