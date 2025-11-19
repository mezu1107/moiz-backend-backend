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
  fcmToken: { type: String, select: false },
  lastActiveAt: { type: Date, default: Date.now },

  // Password Reset
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false }
}, { timestamps: true });

// REMOVED ALL .index() calls — unique: true already creates indexes
// Mongoose automatically creates indexes for `unique` fields

// Only keep performance indexes that are NOT covered by unique/sparse
userSchema.index({ role: 1 });
userSchema.index({ lastActiveAt: -1 });
userSchema.index({ isActive: 1 });

// Password hashing
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