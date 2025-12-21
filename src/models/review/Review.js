// src/models/review/Review.js
// FINAL PRODUCTION — DECEMBER 2025 — CLEAN & WARNING-FREE

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      // ❌ removed 'unique: true' here
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    isApproved: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    reply: {
      text: { type: String, trim: true },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      repliedAt: { type: Date },
    },
    // Soft Delete Fields
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ===================== INDEXES =====================

// Unique order review
reviewSchema.index({ order: 1 }, { unique: true });

// Frequently queried combinations
reviewSchema.index({ customer: 1, createdAt: -1 });
reviewSchema.index({ isApproved: 1, createdAt: -1 });
reviewSchema.index({ isFeatured: 1, createdAt: -1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ isDeleted: 1, deletedAt: -1 });

// ===================== SOFT DELETE HOOKS =====================

// Automatically exclude soft-deleted reviews from all find queries
reviewSchema.pre(/^find/, function () {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

// Exclude soft-deleted reviews from countDocuments
reviewSchema.pre('countDocuments', function () {
  this.where({ isDeleted: { $ne: true } });
});

// Apply soft delete to aggregate if used directly
reviewSchema.pre('aggregate', function () {
  if (!this.options?.includeDeleted) {
    const match = this.pipeline().find(stage => stage.$match);
    if (match) {
      match.$match.isDeleted = { $ne: true };
    } else {
      this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
    }
  }
});

module.exports =
  mongoose.models.Review || mongoose.model('Review', reviewSchema);
