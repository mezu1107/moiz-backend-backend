// src/models/review/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
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

// === INDEXES ===
reviewSchema.index({ order: 1 }, { unique: true });
reviewSchema.index({ customer: 1, createdAt: -1 });
reviewSchema.index({ isApproved: 1, createdAt: -1 });
reviewSchema.index({ isFeatured: 1, createdAt: -1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ isDeleted: 1, deletedAt: -1 });

// === CORRECT MODERN PRE HOOKS FOR MONGOOSE 6+ (NO 'next' PARAMETER) ===

// Automatically exclude soft-deleted reviews from all find queries
reviewSchema.pre(/^find/, function () {
  // 'this' refers to the current query
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
});

// Exclude soft-deleted reviews from countDocuments
reviewSchema.pre('countDocuments', function () {
  this.where({ isDeleted: { $ne: true } });
});

// Optional: Also apply to aggregate if you use it directly on the model
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

module.exports = mongoose.model('Review', reviewSchema);