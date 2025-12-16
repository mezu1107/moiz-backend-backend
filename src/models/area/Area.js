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
      default: 'RAWALPINDI',
      trim: true,
      uppercase: true,
    },

    // GeoJSON Polygon — stored as [lng, lat] (MongoDB standard)
    polygon: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
        default: 'Polygon',
      },
      coordinates: {
        type: [[[Number]]], // array of rings: [[[lng, lat], ...]]
        required: [true, 'Polygon coordinates are required'],
      },
    },

    // GeoJSON Point for center
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
      },
    },

    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//
// ==================== INDEXES ====================
//
areaSchema.index({ polygon: '2dsphere' });
areaSchema.index({ center: '2dsphere' });

// Unique name per city (case-insensitive)
areaSchema.index(
  { name: 1, city: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

areaSchema.index({ city: 1, isActive: 1 });
areaSchema.index({ isActive: 1 });


//
// ==================== VIRTUALS ====================
//
areaSchema.virtual('centerLatLng').get(function () {
  if (!this.center?.coordinates) return null;
  const [lng, lat] = this.center.coordinates;
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
});

areaSchema.virtual('polygonLatLng').get(function () {
  if (!this.polygon?.coordinates) return null;

  return this.polygon.coordinates.map(ring =>
    ring.map(([lng, lat]) => [lat, lng]) // → Leaflet format [lat, lng]
  );
});


//
// ==================== MIDDLEWARE (MODERN STYLE) ====================
//
areaSchema.pre('save', async function () {
  // Auto-close polygon rings if modified
  if (this.isModified('polygon')) {
    this.polygon.coordinates = this.polygon.coordinates.map(ring => {
      if (!Array.isArray(ring) || ring.length < 4) {
        throw new Error('Each polygon ring must have at least 4 points');
      }

      const first = ring[0];
      const last = ring[ring.length - 1];

      // Auto-close if not already closed (with tolerance)
      if (!arraysEqual(first, last)) {
        ring.push([...first]);
      }

      return ring;
    });
  }

  // Validate center is within Pakistan bounds
  if (this.isModified('center') || this.isNew) {
    const [lng, lat] = this.center.coordinates;
    if (!lat || !lng) {
      throw new Error('Center coordinates missing');
    }
    if (lat < 23.5 || lat > 37.5) {
      throw new Error('Center latitude must be between 23.5 and 37.5');
    }
    if (lng < 60.5 || lng > 78.0) {
      throw new Error('Center longitude must be between 60.5 and 78.0');
    }
  }
});

// Helper function (must be defined inside or hoisted)
function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((val, i) => Math.abs(val - b[i]) < 1e-9);
}

module.exports = mongoose.models.Area || mongoose.model('Area', areaSchema);