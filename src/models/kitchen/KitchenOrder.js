// src/models/kitchen/KitchenOrder.js
const mongoose = require('mongoose');

//
// =============== KITCHEN ITEM SUB-SCHEMA ===============
//
const kitchenItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: { type: String, required: true },
  image: String,
  quantity: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready'],
    default: 'pending'
  },
  startedAt: Date,
  readyAt: Date
});


//
// ================== KITCHEN ORDER SCHEMA ==================
//
const kitchenOrderSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true // this already creates { order: 1 } unique index
    },

    shortId: { type: String, required: true }, // example: #ABC123

    customerName: { type: String, required: true },

    instructions: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
    },

    items: [kitchenItemSchema],

    status: {
      type: String,
      enum: ['new', 'preparing', 'ready', 'completed'],
      default: 'new'
    },

    placedAt: { type: Date, default: Date.now },
    startedAt: Date,
    readyAt: Date,
    completedAt: Date
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);


//
// ======================= VIRTUALS =======================
//

// Total item count
kitchenOrderSchema.virtual('totalItems').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Estimated preparation time
kitchenOrderSchema.virtual('estimatedPrepTime').get(function () {
  const avgTimePerItem = 8; // minutes
  return this.totalItems * avgTimePerItem;
});


//
// ======================== INDEXES ========================
//

// Fast filtering by status + newest first
kitchenOrderSchema.index({ status: 1, placedAt: -1 });


//
// ===================== EXPORT MODEL ======================
//
module.exports =
  mongoose.models.KitchenOrder ||
  mongoose.model('KitchenOrder', kitchenOrderSchema);
