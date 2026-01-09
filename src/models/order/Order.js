// src/models/order/Order.js
// PRODUCTION-READY — JANUARY 09, 2026
// Added: review & reviewedAt fields to properly track review status

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  image: { type: String },
  priceAtOrder: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  addOns: [
    {
      name: String,
      price: Number,
      unit: String,
    },
  ],
});

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },

    guestInfo: {
      name: String,
      phone: String,
      isGuest: { type: Boolean, default: false },
    },

    items: [orderItemSchema],

    totalAmount: { type: Number, required: true },
    deliveryFee: { type: Number, required: true, default: 0 },
    discountApplied: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    walletUsed: { type: Number, default: 0 },

    address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },

    addressDetails: {
      fullAddress: String,
      label: String,
      floor: String,
      instructions: String,
    },

    instructions: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
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
        'rejected',
      ],
      default: 'pending',
    },

    rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    rejectionReason: String,
    rejectionNote: String,

    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'easypaisa', 'jazzcash', 'bank', 'wallet'],
      default: 'cash',
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'canceled', 'refunded', 'refund_pending'],
      default: 'pending',
    },

    paymentIntentId: { type: String },
    bankTransferReference: { type: String },
    receiptUrl: String,

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
      appliedDiscount: { type: Number, default: 0 },
    },

    confirmedAt: Date,
    preparingAt: Date,
    outForDeliveryAt: Date,
    deliveredAt: Date,

    // ==================== REVIEW TRACKING ====================
    // This is the key field that powers all "Review Pending" logic
    review: {
      type: Boolean,
      default: false, // New orders are not reviewed
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    // =========================================================
  },
  {
    timestamps: { createdAt: 'placedAt', updatedAt: 'updatedAt' },
  }
);

// === FINAL INDEXES (NO DUPLICATES) ===
orderSchema.index({ customer: 1, placedAt: -1 });
orderSchema.index({ 'guestInfo.phone': 1, placedAt: -1 });
orderSchema.index({ rider: 1, status: 1 });
orderSchema.index({ status: 1, placedAt: -1 });
orderSchema.index({ area: 1, placedAt: -1 });
orderSchema.index({ placedAt: -1 });

// Unique sparse indexes for payment references
orderSchema.index({ paymentIntentId: 1 }, { unique: true, sparse: true });
orderSchema.index({ bankTransferReference: 1 }, { unique: true, sparse: true });

// Rider & status combinations
orderSchema.index({ status: 1, rider: 1, placedAt: -1 });
orderSchema.index({ status: 1, rider: 1, area: 1 });

// Deal tracking
orderSchema.index({ 'appliedDeal.dealId': 1 });
orderSchema.index({ 'appliedDeal.dealId': 1, status: 1 });

// New useful index for review-related queries
orderSchema.index({ status: 1, review: 1 });
orderSchema.index({ review: 1, reviewedAt: -1 });

module.exports = mongoose.model('Order', orderSchema);