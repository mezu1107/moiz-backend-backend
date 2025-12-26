const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  quantity: { type: Number, required: true, min: 1, max: 50, default: 1 },
  priceAtAdd: { type: Number, required: true },
  sides: [{ type: String, trim: true }],                  // e.g. ["Raita", "Custom: extra garlic"]
  drinks: [{ type: String, trim: true }],
  addOns: [{ type: String, trim: true }],
  specialInstructions: { type: String, trim: true, maxlength: 300 },
  addedAt: { type: Date, default: Date.now }
}, { _id: true });

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
  items: [cartItemSchema],
  orderNote: { type: String, trim: true, maxlength: 500, default: '' },
  preferredAddress: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', sparse: true }
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);