// src/models/user/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    unique: true, 
    sparse: true, 
    lowercase: true, 
    trim: true 
  },
  phone: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['customer', 'rider', 'admin'], default: 'customer' },
  isActive: { type: Boolean, default: true },

  riderStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },

  // Account Safety
  isDeleted: { type: Boolean, default: false, select: false },
  deletedAt: { type: Date, select: false },
  isPermanentlyBanned: { type: Boolean, default: false, select: false },
  bannedAt: { type: Date, select: false },
  banReason: { type: String, select: false },
  isBlocked: { type: Boolean, default: false },
  blockReason: { type: String, select: false },
  blockedAt: { type: Date, select: false },

  riderDocuments: {
    cnicNumber: String,
    cnicFront: String,
    cnicBack: String,
    drivingLicense: String,
    riderPhoto: String,
    vehicleNumber: String,
    vehicleType: { type: String, enum: ['bike', 'car', 'bicycle'], default: 'bike' }
  },

  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [74.3587, 31.5204] } // [lng, lat] → Lahore
  },
  isOnline: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: false },
  locationUpdatedAt: { type: Date },

  rating: { type: Number, default: 5.0, min: 0, max: 5 },
  totalDeliveries: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },
  fcmToken: { type: String, select: false },
  lastActiveAt: { type: Date, default: Date.now },

  otp: { type: String, select: false },
  otpExpires: { type: Date, select: false },
  otpAttempts: { type: Number, default: 0, select: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// === INDEXES (Perfect) ===
userSchema.index({ currentLocation: '2dsphere' });
userSchema.index({ role: 1, riderStatus: 1 });
userSchema.index({ isOnline: 1, isAvailable: 1 });
userSchema.index({ phone: 1 }); // Already from unique
userSchema.index({ isDeleted: 1 });
userSchema.index({ isPermanentlyBanned: 1 });
userSchema.index({ isBlocked: 1 });

// Auto-exclude soft-deleted & banned users
userSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: { $ne: true }, isPermanentlyBanned: { $ne: true } });
  next();
});

userSchema.pre('findOneAndUpdate', function(next) {
  this.where({ isDeleted: { $ne: true }, isPermanentlyBanned: { $ne: true } });
  next();
});

// Hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Clean JSON output
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.fcmToken;
    delete ret.otp;
    delete ret.otpExpires;
    delete ret.otpAttempts;
    delete ret.blockReason;
    delete ret.banReason;
    delete ret.blockedAt;
    delete ret.bannedAt;
    delete ret.isDeleted;
    delete ret.isPermanentlyBanned;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);