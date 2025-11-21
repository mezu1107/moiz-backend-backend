// src/models/order/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  image: { type: String }, // optional: snapshot image
  priceAtOrder: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 }
});

// MAIN ORDER SCHEMA
const orderSchema = new mongoose.Schema({
  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  items: [orderItemSchema],
  
  // Pricing
  subtotal: { type: Number, required: true }, // items total (before delivery & discount)
  deliveryFee: { type: Number, required: true, default: 0 },
  discountApplied: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true }, // what customer actually paid

  // Address & Location
  address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true },
  area: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', required: true },
  deliveryZone: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryZone' },

  // Status Flow
  status: {
    type: String,
    enum: [
      'pending',
      'pending_payment',
      'confirmed',
      'preparing',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'rejected'
    ],
    default: 'pending'
  },

  rider: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider' },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
  rejectionNote: String,

  // Payment
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'card', 'wallet'], 
    default: 'cash' 
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'canceled', 'refunded'],
    default: 'pending'
  },
  paymentIntentId: String,
  paidAt: Date,
  refundedAt: Date,
  receiptUrl: String,

  // Delivery Estimate
  estimatedDelivery: { type: String, default: '40-55 min' },

  // FULL DEAL SNAPSHOT — Critical for reliable analytics & history
  appliedDeal: {
    dealId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Deal' 
    },
    code: { 
      type: String, 
      uppercase: true, 
      trim: true 
    },
    title: String,
    discountType: { 
      type: String, 
      enum: ['percentage', 'fixed'] 
    },
    discountValue: Number,
    maxDiscountAmount: Number,
    // Optional: store what was actually applied
    appliedDiscount: { type: Number, default: 0 }
  }

}, { 
  timestamps: { 
    createdAt: 'placedAt', 
    updatedAt: 'updatedAt' 
  } 
});

// Indexes for performance
orderSchema.index({ customer: 1, placedAt: -1 });
orderSchema.index({ rider: 1, status: 1 });
orderSchema.index({ status: 1, placedAt: -1 });
orderSchema.index({ area: 1, placedAt: -1 });
orderSchema.index({ paymentIntentId: 1 }, { unique: true, sparse: true });
orderSchema.index({ paymentStatus: 1, placedAt: -1 });

// New critical indexes for Deal analytics
orderSchema.index({ 'appliedDeal.dealId': 1, status: 1 });
orderSchema.index({ 'appliedDeal.code': 1 });
orderSchema.index({ placedAt: -1, status: 1 }); // General time-based queries

module.exports = mongoose.model('Order', orderSchema);