// src/models/deliveryZone/DeliveryZone.js
const mongoose = require('mongoose');

const deliveryZoneSchema = new mongoose.Schema({
  area: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
    required: true,
    unique: true // Automatically creates unique index → DO NOT duplicate with .index()
  },
  deliveryFee: { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, required: true, min: 0, default: 0 },
  estimatedTime: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true 
});


module.exports = mongoose.model('DeliveryZone', deliveryZoneSchema);