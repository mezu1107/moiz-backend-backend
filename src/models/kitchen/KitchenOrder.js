// src/models/kitchen/KitchenOrder.js
const mongoose = require('mongoose');

const kitchenOrderSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  shortId: { type: String, required: true },
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: String,
    quantity: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready'],
      default: 'pending'
    },
    preparedAt: Date
  }],
  status: {
    type: String,
    enum: ['new', 'preparing', 'ready', 'completed'],
    default: 'new'
  },
  placedAt: { type: Date, default: Date.now },
  startedAt: Date,
  readyAt: Date
}, { timestamps: true });

module.exports = mongoose.model('KitchenOrder', kitchenOrderSchema);