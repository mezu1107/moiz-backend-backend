// src/controllers/review/reviewController.js
const Review = require('../../models/review/Review');
const Order = require('../../models/order/Order');

// SUBMIT REVIEW (Customer after delivery)
const submitReview = async (req, res) => {
  const { orderId, rating, comment, images } = req.body;
  const customerId = req.user.id;

  try {
    const order = await Order.findOne({
      _id: orderId,
      customer: customerId,
      status: 'delivered'
    });

    if (!order) {
      return res.status(400).json({ success: false, message: 'Order not eligible for review' });
    }

    const existing = await Review.findOne({ order: orderId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Review already submitted' });
    }

    const review = await Review.create({
      order: orderId,
      customer: customerId,
      rating,
      comment: comment?.trim() || null,
      images: images || []
    });

    await review.populate('customer', 'name');

    // Notify admin
    global.io?.to('admin').emit('new-review', {
      reviewId: review._id,
      rating,
      customer: review.customer.name,
      orderId: orderIdShort(orderId)
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been submitted',
      review
    });
  } catch (err) {
    console.error('submitReview error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
};

// GET REVIEWS (Public + Admin)
const getReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, approved, featured } = req.query;
    const filter = {};

    if (approved !== undefined) filter.isApproved = approved === 'true';
    if (featured === 'true') filter.isFeatured = true;

    const reviews = await Review.find(filter)
      .populate('customer', 'name')
      .populate('order', 'finalAmount')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit);

    const total = await Review.countDocuments(filter);

    res.json({
      success: true,
      reviews,
      pagination: { page: +page, limit: +limit, total }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ADMIN: Approve/Reject/Feature Review
const reviewAction = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  try {
    const review = await Review.findById(id).populate('customer', 'name');
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    if (action === 'approve') review.isApproved = true;
    if (action === 'reject') review.isApproved = false;
    if (action === 'feature') review.isFeatured = true;
    if (action === 'unfeature') review.isFeatured = false;

    await review.save();

    res.json({ success: true, message: `Review ${action}d`, review });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

// ADMIN: Reply to Review
const replyReview = async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  try {
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    review.reply = {
      text: text.trim(),
      repliedBy: req.user.id,
      repliedAt: new Date()
    };

    await review.save();
    await review.populate('customer', 'fcmToken');

    // Notify customer
    if (review.customer.fcmToken) {
      await admin.messaging().send({
        token: review.customer.fcmToken,
        notification: {
          title: 'Reply to Your Review',
          body: 'The restaurant replied to your feedback!'
        }
      });
    }

    global.io?.to('admin').emit('review-reply', { reviewId: id });

    res.json({ success: true, message: 'Reply sent', review });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reply' });
  }
};

module.exports = {
  submitReview,
  getReviews,
  reviewAction,
  replyReview
};