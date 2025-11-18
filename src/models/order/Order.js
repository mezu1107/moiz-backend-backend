// src/models/order/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  priceAtOrder: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 }
});

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  
  totalAmount: { type: Number, required: true },
  deliveryFee: { type: Number, required: true },
  discountApplied: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },

  address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true },
  area: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', required: true },
  deliveryZone: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryZone' },

  // Order lifecycle
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'],
    default: 'pending'
  },
  rider: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider' },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String },

  // Payment fields
  paymentMethod: { type: String, enum: ['cash', 'card'], default: 'cash' },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'canceled', 'refunded'],
    default: 'pending'
  },
  paymentIntentId: { type: String },           // Stripe PaymentIntent ID (PI_xxx)
  paidAt: { type: Date },                      // When payment succeeded
  refundedAt: { type: Date },                  // When fully refunded
  receiptUrl: { type: String },                // Direct link to Stripe receipt

  // Misc
  estimatedDelivery: { type: String, default: '40-55 min' }
}, {
  timestamps: { createdAt: 'placedAt', updatedAt: 'updatedAt' }
});

// ==================================================================
// High-performance compound indexes (keep these — they're excellent)
// ==================================================================
orderSchema.index({ customer: 1, placedAt: -1 });           // User order history
orderSchema.index({ rider: 1, status: 1 });                 // Rider current assignments
orderSchema.index({ rider: 1, placedAt: -1 });              // Rider past orders
orderSchema.index({ status: 1, placedAt: -1 });             // Admin dashboard filters
orderSchema.index({ area: 1, placedAt: -1 });               // Area-based analytics
orderSchema.index({ paymentIntentId: 1 });                  // Critical for webhook lookup
orderSchema.index({ placedAt: -1 });                        // Global recent orders
orderSchema.index({ paymentStatus: 1, placedAt: -1 });      // Finance reports

module.exports = mongoose.model('Order', orderSchema);