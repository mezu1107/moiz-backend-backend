// src/models/user/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['customer', 'rider', 'admin'], default: 'customer' },
  isActive: { type: Boolean, default: true },

  // Rider-specific fields
  riderStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },

  riderDocuments: {
    cnicNumber: String,
    cnicFront: String,
    cnicBack: String,
    drivingLicense: String,
    riderPhoto: String,
    vehicleNumber: String,
    vehicleType: { type: String, enum: ['bike', 'car', 'bicycle'], default: 'bike' }
  },

  // Live location (only for riders)
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [74.3587, 31.5204] } // [lng, lat]
  },
  isOnline: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: false },
  locationUpdatedAt: { type: Date },

  // Stats
  rating: { type: Number, default: 5.0, min: 0, max: 5 },
  totalDeliveries: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },

  fcmToken: { type: String, select: false },
  lastActiveAt: { type: Date, default: Date.now },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false }
}, { timestamps: true });

// Indexes
userSchema.index({ currentLocation: '2dsphere' });
userSchema.index({ role: 1, riderStatus: 1 });
userSchema.index({ isOnline: 1, isAvailable: 1 });
userSchema.index({ riderStatus: 1 });

// Methods
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.fcmToken;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  return user;
};

module.exports = mongoose.model('User', userSchema);