// src/models/menuItem/MenuItem.js
const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, default: 0, min: 0 } // 0 = free
});

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  image: { type: String },
  cloudinaryId: { type: String },
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

  // NEW: Priced options for customization (sides, drinks, addOns)
  pricedOptions: {
    sides: [optionSchema],
    drinks: [optionSchema],
    addOns: [optionSchema]
  }
}, { timestamps: true });

menuItemSchema.index({ category: 1 });
menuItemSchema.index({ isAvailable: 1 });
menuItemSchema.index({ availableInAreas: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);