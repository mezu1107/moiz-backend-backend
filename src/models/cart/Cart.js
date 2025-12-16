// src/models/cart/Cart.js
const mongoose = require('mongoose');

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
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true   // creates { user: 1 } UNIQUE index automatically
    },
    items: [cartItemSchema]
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Cart || mongoose.model('Cart', cartSchema);
