// src/models/order/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  image: { type: String },
  priceAtOrder: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 }
});

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],

  // Pricing
  totalAmount: { type: Number, required: true }, // subtotal (items only)
  deliveryFee: { type: Number, required: true, default: 0 },
  discountApplied: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },

  // Address & Zone
  address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true },
  area: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', required: true },
  deliveryZone: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryZone' },

  // Status
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

  rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
  rejectionNote: String,

  // Payment - NOW SUPPORTS ALL METHODS
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'easypaisa', 'jazzcash', 'bank'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'canceled', 'refunded'],
    default: 'pending'
  },
  paymentIntentId: { type: String }, // Stripe only
  paidAt: Date,
  refundedAt: Date,
  receiptUrl: String,

  estimatedDelivery: { type: String, default: '40-55 min' },

  // Deal snapshot
  appliedDeal: {
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
    code: String,
    title: String,
    discountType: String,
    discountValue: Number,
    maxDiscountAmount: Number,
    appliedDiscount: { type: Number, default: 0 }
  }
}, {
  timestamps: { createdAt: 'placedAt', updatedAt: 'updatedAt' }
});

// Indexes
orderSchema.index({ customer: 1, placedAt: -1 });
orderSchema.index({ rider: 1, status: 1 });
orderSchema.index({ status: 1, placedAt: -1 });
orderSchema.index({ area: 1, placedAt: -1 });
orderSchema.index({ paymentIntentId: 1 }, { unique: true, sparse: true });
orderSchema.index({ 'appliedDeal.dealId': 1 });

module.exports = mongoose.model('Order', orderSchema);