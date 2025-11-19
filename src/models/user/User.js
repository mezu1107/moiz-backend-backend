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

  // Role System — Only Admin can change to 'rider'
  role: { 
    type: String, 
    enum: ['customer', 'rider', 'admin'], 
    default: 'customer' 
  },
  isActive: { type: Boolean, default: true },
  
  // Rider Verification Status
  riderStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },

  // Optional Profile Fields
  profile: {
    age: Number,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    profileImage: String,
    interests: [String]
  },

  // Rider Documents (uploaded when applying)
  riderDocuments: {
    cnicNumber: String,
    cnicFront: String,
    cnicBack: String,
    drivingLicense: String,
    riderPhoto: String,
    vehicleNumber: String,
    vehicleType: { type: String, enum: ['bike', 'car', 'bicycle'] }
  },

  fcmToken: { type: String, select: false },
  lastActiveAt: { type: Date, default: Date.now },

  // Password Reset
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false }
}, { timestamps: true });

// Indexes — Clean & No Duplicates
userSchema.index({ role: 1 });
userSchema.index({ riderStatus: 1 });
userSchema.index({ lastActiveAt: -1 });
userSchema.index({ isActive: 1 });

// Password Hashing
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