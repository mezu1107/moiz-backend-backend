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
  status: {
    type: String,
    enum: ['pending', 'pending_payment', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'],
    default: 'pending'
  },
  rider: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider' },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
  rejectionNote: String,
  paymentMethod: { type: String, enum: ['cash', 'card'], default: 'cash' },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'canceled', 'refunded'],
    default: 'pending'
  },
  paymentIntentId: String,
  paidAt: Date,
  refundedAt: Date,
  receiptUrl: String,
  estimatedDelivery: { type: String, default: '40-55 min' },
  appliedDeal: {
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
    code: String
  }
}, { timestamps: { createdAt: 'placedAt', updatedAt: 'updatedAt' } });

orderSchema.index({ customer: 1, placedAt: -1 });
orderSchema.index({ rider: 1, status: 1 });
orderSchema.index({ status: 1, placedAt: -1 });
orderSchema.index({ area: 1, placedAt: -1 });
orderSchema.index({ paymentIntentId: 1 });
orderSchema.index({ paymentStatus: 1, placedAt: -1 });

module.exports = mongoose.model('Order', orderSchema);