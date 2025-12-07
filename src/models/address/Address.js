// src/models/address/Address.js
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  label: { 
    type: String, 
    required: true, 
    trim: true,
    enum: ['Home', 'Work', 'Other'],     // ← Enforced in DB
    default: 'Home'                      // ← Auto-set if not provided
  },
  
  fullAddress: { 
    type: String, 
    required: true,
    trim: true 
  },
  
  area: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Area', 
    required: true 
  },
  
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  
  instructions: { 
    type: String, 
    trim: true,
    maxlength: 150 
  },
  
  isDefault: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true 
});

// Indexes
addressSchema.index({ location: '2dsphere' });
addressSchema.index({ user: 1 });
addressSchema.index({ user: 1, isDefault: -1 });
addressSchema.index({ area: 1 });

module.exports = mongoose.model('Address', addressSchema);