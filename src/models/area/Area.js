// src/models/area/Area.js
const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Area name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    city: {
      type: String,
      required: true,
      default: 'LAHORE',
      trim: true,
      uppercase: true,
    },
    // GeoJSON Polygon — MUST be in [lng, lat] order
    polygon: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
        default: 'Polygon',
      },
      coordinates: {
        type: [[[Number]]], // [[[lng, lat], ...]]
        required: [true, 'Polygon coordinates are required'],
      },
    },
    // GeoJSON Point center
    center: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: [true, 'Center coordinates are required'],
        validate: {
          validator: function (v) {
            return Array.isArray(v) && v.length === 2;
          },
          message: 'Center must have exactly 2 coordinates: [lng, lat]',
        },
      },
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==================== INDEXES ====================

// Critical for $geoIntersects on polygon
areaSchema.index({ polygon: '2dsphere' });

// For finding nearest areas or clustering
areaSchema.index({ center: '2dsphere' });

// Case-insensitive unique name per city (perfect!)
areaSchema.index(
  { name: 1, city: 1 },
  {
    unique: true,
    collation: { locale: 'en', strength: 2 }, // case & accent insensitive
  }
);

// Fast filtering
areaSchema.index({ city: 1, isActive: 1 });
areaSchema.index({ isActive: 1 });

// ==================== VIRTUALS ====================

areaSchema.virtual('centerLatLng').get(function () {
  if (!this.center?.coordinates) return null;
  const [lng, lat] = this.center.coordinates;
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
});

// Optional: expose full polygon in Leaflet format
areaSchema.virtual('polygonLatLng').get(function () {
  if (!this.polygon?.coordinates) return null;
  return this.polygon.coordinates.map(ring =>
    ring.map(([lng, lat]) => [lat, lng]) // convert [lng, lat] → [lat, lng]
  );
});

// ==================== MIDDLEWARE: Auto-close polygon rings ====================

areaSchema.pre('save', function (next) {
  if (this.isModified('polygon')) {
    try {
      this.polygon.coordinates = this.polygon.coordinates.map(ring => {
        if (!Array.isArray(ring) || ring.length < 4) {
          throw new Error('Each polygon ring must have at least 4 points');
        }

        const first = ring[0];
        const last = ring[ring.length - 1];

        // Auto-close ring if not already closed
        if (!arraysEqual(first, last)) {
          ring.push([...first]);
        }

        return ring;
      });
    } catch (err) {
      return next(err);
    }
  }

  // Ensure center is in bounds (Pakistan)
  if (this.isModified('center')) {
    const [lng, lat] = this.center.coordinates;
    if (lat < 23.5 || lat > 37.5 || lng < 60.0 || lng > 78.0) {
      return next(new Error('Center coordinates outside Pakistan bounds'));
    }
  }

  next();
});

// Helper: compare two coordinate arrays
function arraysEqual(a, b) {
  return a.length === b.length && a.every((val, i) => Math.abs(val - b[i]) < 1e-9);
}

module.exports = mongoose.models.Area || mongoose.model('Area', areaSchema);