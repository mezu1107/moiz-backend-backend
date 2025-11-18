// src/models/rider/Rider.js
const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
    // REMOVED any extra index → unique already creates it
  },
  licenseNumber: { type: String, required: true, trim: true },
  vehicleType: { type: String, enum: ['bike', 'car'], default: 'bike' },
  isOnline: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [74.3587, 31.5204] }
  },
  rating: { type: Number, default: 5.0, min: 0, max: 5 },
  totalDeliveries: { type: Number, default: 0 }
}, { timestamps: true });

// Indexes — defined once only
riderSchema.index({ currentLocation: '2dsphere' });
riderSchema.index({ isOnline: 1, isAvailable: 1 });
// user index already created by "unique: true" → do NOT redeclare

module.exports = mongoose.model('Rider', riderSchema);