// src/controllers/review/reviewController.js
const Review = require('../../models/review/Review');
const Order = require('../../models/order/Order');
const orderIdShort = require('../../utils/orderIdShort');
const admin = require('firebase-admin');

// SUBMIT REVIEW
const submitReview = async (req, res) => {
  const { orderId, rating, comment, images } = req.body;
  const customerId = req.user._id;

  try {
    const order = await Order.findOne({
      _id: orderId,
      customer: customerId,
      status: 'delivered',
    });

    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Order not found or not eligible for review.',
      });
    }

    const existingReview = await Review.findOne({ order: orderId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a review for this order.',
      });
    }

    const review = await Review.create({
      order: orderId,
      customer: customerId,
      rating,
      comment: comment?.trim() || null,
      images: images?.filter(Boolean) || [],
    });

    await review.populate('customer', 'name');

    global.io?.to('admin').emit('new-review', {
      reviewId: review._id,
      orderId: orderIdShort(orderId),
      rating,
      customerName: review.customer.name,
      createdAt: review.createdAt,
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been submitted and is awaiting approval.',
      data: { review },
    });
  } catch (err) {
    console.error('submitReview error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit review. Please try again later.',
    });
  }
};

// GET REVIEWS
const getReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, approved, featured, sort = '-createdAt' } = req.query;
    const filter = {};

    if (approved !== undefined) filter.isApproved = approved === 'true';
    if (featured === 'true') filter.isFeatured = true;

    if (!req.user || !['admin', 'support'].includes(req.user.role)) {
      filter.isApproved = true;
    }

    const reviews = await Review.find(filter)
      .populate('customer', 'name')
      .populate('order', 'finalAmount placedAt')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Review.countDocuments(filter);

    return res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('getReviews error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews.',
    });
  }
};

// ADMIN: Action (approve/reject/feature)
const reviewAction = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  try {
    const review = await Review.findById(id)
      .populate('customer', 'name fcmToken');

    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    const actions = {
      approve: () => (review.isApproved = true),
      reject: () => (review.isApproved = false),
      feature: () => (review.isFeatured = true),
      unfeature: () => (review.isFeatured = false),
    };

    if (!actions[action]) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    actions[action]();
    await review.save();

    if ((action === 'approve' || action === 'reject') && review.customer?.fcmToken) {
      try {
        await admin.messaging().send({
          token: review.customer.fcmToken,
          notification: {
            title: 'Review Update',
            body: action === 'approve' ? 'Your review has been approved!' : 'Your review was not approved.',
          },
        });
      } catch (fcmErr) {
        console.warn('FCM failed:', fcmErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Review ${action}d successfully`,
      data: { review },
    });
  } catch (err) {
    console.error('reviewAction error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update review' });
  }
};

// ADMIN: Reply
const replyReview = async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  try {
    const review = await Review.findById(id).populate('customer', 'name fcmToken');
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    review.reply = {
      text: text.trim(),
      repliedBy: req.user._id,
      repliedAt: new Date(),
    };
    await review.save();

    if (review.customer?.fcmToken) {
      try {
        await admin.messaging().send({
          token: review.customer.fcmToken,
          notification: {
            title: 'Restaurant Replied to Your Review',
            body: 'Tap to view the reply.',
          },
          data: { type: 'review_reply', reviewId: id },
        });
      } catch (fcmErr) {
        console.warn('FCM failed:', fcmErr.message);
      }
    }

    global.io?.to('admin').emit('review-reply', {
      reviewId: review._id,
      replyText: text,
      repliedBy: req.user.name || 'Admin',
    });

    return res.json({
      success: true,
      message: 'Reply sent successfully',
      data: { review },
    });
  } catch (err) {
    console.error('replyReview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send reply' });
  }
};

// ADMIN: Delete Review
const deleteReview = async (req, res) => {
  const { id } = req.params;
  const { hardDelete = false } = req.body;

  try {
    if (hardDelete && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can permanently delete reviews',
      });
    }

    if (hardDelete) {
      const result = await Review.deleteOne({ _id: id });
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'Review not found' });
      }
      global.io?.to('admin').emit('review-deleted', { reviewId: id, hard: true });
      return res.json({ success: true, message: 'Review permanently deleted' });
    }

    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (review.isDeleted) return res.status(400).json({ success: false, message: 'Already deleted' });

    review.isDeleted = true;
    review.deletedAt = new Date();
    review.deletedBy = req.user._id;
    await review.save();

    global.io?.to('admin').emit('review-deleted', { reviewId: id, hard: false });

    return res.json({
      success: true,
      message: 'Review deleted successfully',
      data: { review },
    });
  } catch (err) {
    console.error('deleteReview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete review' });
  }
};

// ADMIN: Analytics Dashboard
const getReviewAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [total, approved, pending, avgRatingAgg, distribution, trend, topReviews] = await Promise.all([
      Review.countDocuments(),
      Review.countDocuments({ isApproved: true }),
      Review.countDocuments({ isApproved: false }),
      Review.aggregate([{ $match: { isApproved: true } }, { $group: { _id: null, avg: { $avg: '$rating' } } }]),
      Review.aggregate([
        { $match: { isApproved: true } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Review.aggregate([
        { $match: { createdAt: { $gte: startDate }, isApproved: true } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, avg: { $avg: '$rating' } } },
        { $sort: { _id: 1 } },
      ]),
      Review.find({ isApproved: true }).sort({ rating: -1, createdAt: -1 }).limit(5).populate('customer', 'name').select('rating comment createdAt customer'),
    ]);

    const avgRating = avgRatingAgg[0]?.avg?.toFixed(2) || 'N/A';

    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach((d) => (dist[d._id] = d.count));

    return res.json({
      success: true,
      data: {
        summary: {
          totalReviews: total,
          approvedReviews: approved,
          pendingReviews: pending,
          averageRating: avgRating,
          approvalRate: total > 0 ? ((approved / total) * 100).toFixed(1) + '%' : '0%',
        },
        ratingDistribution: dist,
        recentTrend: trend.map((t) => ({ date: t._id, reviews: t.count, avgRating: t.avg?.toFixed(2) || null })),
        topReviews,
        period: `${days} days`,
      },
    });
  } catch (err) {
    console.error('getReviewAnalytics error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

module.exports = {
  submitReview,
  getReviews,
  reviewAction,
  replyReview,
  deleteReview,
  getReviewAnalytics,
};