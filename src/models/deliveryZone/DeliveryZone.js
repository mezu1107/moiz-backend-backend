const mongoose = require('mongoose');

const deliveryZoneSchema = new mongoose.Schema({
  area: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', required: true, unique: true },
  deliveryFee: { type: Number, required: true, default: 149 }, // PKR
  minOrderAmount: { type: Number, default: 0 },
  estimatedTime: { type: String, default: '35-50 min' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('DeliveryZone', deliveryZoneSchema);