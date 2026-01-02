const mongoose = require('mongoose');

const deliveryZoneSchema = new mongoose.Schema(
  {
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Area',
      required: [true, 'Delivery zone must belong to an area'],
      unique: true,
      index: true,
    },
    // === Fee Structure Type ===
    feeStructure: {
      type: String,
      enum: ['flat', 'distance'],
      default: 'flat',
    },

    // === Flat Fee (used when feeStructure = 'flat') ===
    deliveryFee: {
      type: Number,
      min: [70, 'Delivery fee cannot be negative'],
      default: 70,
    },

    // === Distance-Based Fields (used when feeStructure = 'distance') ===
    baseFee: {
      type: Number,
      min: [70, 'Base fee cannot be negative'],
      default: 70,
    },
    distanceFeePerKm: {
      type: Number,
      min: [0, 'Fee per km cannot be negative'],
      default: 20, // e.g., Rs. 20 per km
    },
    maxDistanceKm: {
      type: Number,
      min: [1, 'Max distance must be at least 1 km'],
      default: 15, // Max deliverable distance
    },

    // === New Tiered Pricing Fields (for first 6 km fixed 70, then 25/km) ===
    tieredBaseDistance: {
      type: Number,
      min: 0,
      default: 6, // First 6 km fixed
    },
    tieredBaseFee: {
      type: Number,
      min: 0,
      default: 70, // Rs. 70 for first 6 km
    },
    tieredAdditionalFeePerKm: {
      type: Number,
      min: 0,
      default: 25, // Rs. 25 per additional km
    },

    minOrderAmount: {
      type: Number,
      required: true,
      min: [0, 'Minimum order cannot be negative'],
      default: 0,
    },

    // === Free Delivery Field ===
    freeDeliveryAbove: {
      type: Number,
      min: 0,
      default: 1499,
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

// Cascade delete
deliveryZoneSchema.pre('remove', async function (next) {
  await this.model('DeliveryZone').deleteMany({ area: this._id });
  next();
});

// Virtual for area info
deliveryZoneSchema.virtual('areaInfo', {
  ref: 'Area',
  localField: 'area',
  foreignField: '_id',
  justOne: true,
});

module.exports = mongoose.model('DeliveryZone', deliveryZoneSchema);