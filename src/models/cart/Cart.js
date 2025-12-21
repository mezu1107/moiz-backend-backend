// src/models/cart/Cart.js
const mongoose = require('mongoose');

// Subdocument schema with _id explicitly enabled
const cartItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity cannot be less than 1'],
    max: [50, 'Maximum 50 items allowed'],
    default: 1
  },
  priceAtAdd: {
    type: Number,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: true, // ← CRITICAL: This ensures every cart item gets a MongoDB _id
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    items: [cartItemSchema]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Optional: Ensure _id is always stringified
cartSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.items = ret.items.map(item => {
      if (item._id) {
        item._id = item._id.toString();
      }
      return item;
    });
    return ret;
  }
});

module.exports = mongoose.models.Cart || mongoose.model('Cart', cartSchema);