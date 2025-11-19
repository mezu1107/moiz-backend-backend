// src/models/rider/Rider.js
const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true  
  },

  isOnline: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [74.3587, 31.5204] } // [lng, lat]
  },
  locationUpdatedAt: { type: Date },

  rating: { type: Number, default: 5.0, min: 0, max: 5 },
  totalDeliveries: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },

  vehicleNumber: String,
  vehicleType: { 
    type: String, 
    enum: ['bike', 'car', 'bicycle'], 
    default: 'bike' 
  }
}, { timestamps: true });


riderSchema.index({ currentLocation: '2dsphere' });      
riderSchema.index({ isOnline: 1, isAvailable: 1 });     


module.exports = mongoose.model('Rider', riderSchema);