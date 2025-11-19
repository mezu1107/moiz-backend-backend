// src/models/deal/Deal.js
const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    trim: true 
  },
  code: { 
    type: String, 
    required: true, 
    unique: true,           // This ALREADY creates an index
    trim: true, 
    uppercase: true,        // Mongoose will auto-uppercase
    minlength: 3, 
    maxlength: 20 
  },
  discountType: { 
    type: String, 
    enum: ['percentage', 'fixed'], 
    required: true 
  },
  discountValue: { 
    type: Number, 
    required: true, 
    min: 0.01 
  },
  minOrderAmount: { 
    type: Number, 
    default: 0 
  },
  maxDiscountAmount: { 
    type: Number 
  },
  applicableItems: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MenuItem' 
  }],
  applicableAreas: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Area' 
  }],
  validFrom: { 
    type: Date, 
    required: true 
  },
  validUntil: { 
    type: Date, 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  usageLimitPerUser: { 
    type: Number, 
    default: 1 
  },
  totalUsageLimit: { 
    type: Number 
  },
  usedBy: [{
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    usedAt: { 
      type: Date, 
      default: Date.now 
    }
  }]
}, { 
  timestamps: true 
});

// AUTO-UPPERCASE CODE BEFORE SAVE
dealSchema.pre('save', function(next) {
  if (this.isModified('code')) {
    this.code = this.code.toUpperCase().trim();
  }
  next();
});

// ONLY INDEXES THAT ARE NOT AUTO-CREATED BY `unique: true`
dealSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
dealSchema.index({ validUntil: 1 });  // For expiry cleanup jobs
dealSchema.index({ 'usedBy.user': 1 }); // For checking user usage

// REMOVED THIS LINE → dealSchema.index({ code: 1 });
// Because `unique: true` on `code` already creates it → duplicate warning GONE!

module.exports = mongoose.model('Deal', dealSchema);