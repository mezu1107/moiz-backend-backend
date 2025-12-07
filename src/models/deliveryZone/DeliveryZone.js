// src/models/deliveryZone/DeliveryZone.js
const mongoose = require('mongoose');

const deliveryZoneSchema = new mongoose.Schema(
  {
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Area',
      required: [true, 'Delivery zone must belong to an area'],
      unique: true, // One zone per area
      index: true,
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: [0, 'Delivery fee cannot be negative'],
      default: 149,
    },
    minOrderAmount: {
      type: Number,
      required: true,
      min: [0, 'Minimum order cannot be negative'],
      default: 0,
    },
    estimatedTime: {
      type: String,
      required: true,
      trim: true,
      default: '35-50 min',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Cascade: when area is deleted → delete zone
deliveryZoneSchema.pre('remove', async function (next) {
  await this.model('DeliveryZone').deleteMany({ area: this._id });
});

// Virtual: populate area name
deliveryZoneSchema.virtual('areaInfo', {
  ref: 'Area',
  localField: 'area',
  foreignField: '_id',
  justOne: true,
});

module.exports = mongoose.model('DeliveryZone', deliveryZoneSchema);