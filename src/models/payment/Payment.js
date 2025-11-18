// src/models/payment/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  stripePaymentIntentId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true }, // in PKR
  currency: { type: String, default: 'pkr' },
  status: { 
    type: String, 
    enum: ['pending', 'succeeded', 'failed', 'canceled'], 
    default: 'pending' 
  },
  metadata: { type: mongoose.Schema.Types.Mixed },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  transactionId: { type: String },
  receiptUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);