// src/models/user/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  
  // REMOVED "index: true" from all fields → we define indexes manually below
  email: { 
    type: String, 
    unique: true, 
    sparse: true,     // allows multiple nulls
    lowercase: true, 
    trim: true 
  },
  
  phone: { 
    type: String, 
    required: true, 
    unique: true,     // MongoDB auto-creates index for "unique: true"
    trim: true 
  },
  
  password: { 
    type: String, 
    required: true, 
    minlength: 6, 
    select: false 
  },
  
  role: { 
    type: String, 
    enum: ['customer', 'rider', 'admin'], 
    default: 'customer' 
  },
  
  isActive: { type: Boolean, default: true },
  fcmToken: { type: String, select: false },
  lastActiveAt: { type: Date, default: Date.now }
}, { 
  timestamps: true 
});

// ONLY DEFINE INDEXES ONCE — HERE
// MongoDB already creates indexes for "unique: true" fields
// So we DO NOT redeclare them
userSchema.index({ role: 1 });
userSchema.index({ lastActiveAt: -1 });
userSchema.index({ isActive: 1 });

// Optional: compound index for admin queries
userSchema.index({ role: 1, isActive: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.fcmToken;
  return user;
};

module.exports = mongoose.model('User', userSchema);