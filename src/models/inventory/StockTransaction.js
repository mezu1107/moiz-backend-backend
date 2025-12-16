// src/models/inventory/StockTransaction.js
const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema({
  ingredient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Ingredient', 
    required: true 
  },
  type: {
    type: String,
    enum: ['purchase', 'use', 'waste', 'adjustment', 'return'],
    required: true
  },
  quantity: { type: Number, required: true },
  previousStock: Number,
  newStock: Number,
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  note: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);
