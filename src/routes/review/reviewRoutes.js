// src/routes/review/reviewRoutes.js
const router = require('express').Router();
const { auth, optionalAuth } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');
const { role } = require('../../middleware/role/role');
const {
  submitReview,
  getReviews,
  reviewAction,
  replyReview,
  deleteReview,
  getReviewAnalytics,
  getTopReviews,
} = require('../../controllers/review/reviewController');

const {
  submitReview: submitSchema,
  reviewAction: actionSchema,
  replyReview: replySchema,
  deleteReview: deleteSchema,
} = require('../../validation/schemas/reviewSchemas');

// Public Routes
router.get('/', optionalAuth, getReviews);
router.get('/approved', optionalAuth, (req, res, next) => {
  req.query.approved = 'true';
  getReviews(req, res, next);
});
router.get('/top', optionalAuth, getTopReviews);
// Customer Route
router.post('/submit', auth, submitSchema, validate, submitReview);

// Admin & Support Protected Routes
router.use(auth, role(['admin', 'support']));

router.get('/all', getReviews);
router.get('/analytics', getReviewAnalytics);

router.patch('/:id/action', actionSchema, validate, reviewAction);
router.post('/:id/reply', replySchema, validate, replyReview);
router.delete('/:id', deleteSchema, validate, deleteReview);

module.exports = router;