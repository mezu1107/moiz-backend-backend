// src/models/support/Ticket.js
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true }, // e.g., TKT-1001
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  images: [{ type: String }], // Cloudinary URLs
  
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // support/admin
  replies: [{
    message: String,
    repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    repliedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Auto generate ticket ID
ticketSchema.pre('save', async function(next) {
  if (!this.ticketId) {
    const count = await this.constructor.countDocuments();
    this.ticketId = `TKT-${1001 + count}`;
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);