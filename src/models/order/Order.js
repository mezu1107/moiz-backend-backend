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
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  guestInfo: {
    name: { type: String },
    phone: { type: String },
    isGuest: { type: Boolean, default: false }
  },

  items: [orderItemSchema],

  totalAmount: { type: Number, required: true },
  deliveryFee: { type: Number, required: true, default: 0 },
  discountApplied: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },

  address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
  addressDetails: {
    fullAddress: String,
    label: String,
    floor: String,
    instructions: String
  },

  area: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', required: true },
  deliveryZone: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryZone' },

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
  paymentIntentId: { type: String },
  bankTransferReference: { type: String },
  paidAt: Date,
  refundedAt: Date,

  estimatedDelivery: { type: String, default: '40-55 min' },

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
orderSchema.index({ 'guestInfo.phone': 1, placedAt: -1 });
orderSchema.index({ rider: 1, status: 1 });
orderSchema.index({ status: 1, placedAt: -1 });
orderSchema.index({ area: 1, placedAt: -1 });
orderSchema.index({ paymentIntentId: 1 }, { unique: true, sparse: true });
orderSchema.index({ bankTransferReference: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Order', orderSchema);