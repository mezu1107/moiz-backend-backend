// src/models/area/Area.js
const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  city: { type: String, required: true, default: 'Lahore', trim: true },
  polygon: {
    type: { type: String, enum: ['Polygon'], default: 'Polygon' },
    coordinates: { type: [[[Number]]], required: true }
  },
  center: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

areaSchema.index({ polygon: '2dsphere' });
areaSchema.index({ city: 1, isActive: 1 });
areaSchema.index({ name: 1, city: 1 });

module.exports = mongoose.model('Area', areaSchema);