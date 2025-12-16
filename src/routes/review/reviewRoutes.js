// src/routes/review/reviewRoutes.js
const router = require('express').Router();
const { auth, role } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');

const {
  submitReview,
  getReviews,
  reviewAction,
  replyReview
} = require('../../controllers/review/reviewController');

const {
  submitReview: submitSchema,
  reviewAction: actionSchema,
  replyReview: replySchema
} = require('../../validation/schemas/reviewSchemas');

// Public — approved reviews
router.get('/', getReviews);
router.get('/approved', (req, res, next) => {
  req.query.approved = 'true';
  getReviews(req, res, next);
});

// Customer — submit review
router.post('/submit', auth, submitSchema, validate, submitReview);

// Admin routes
router.use(auth, role(['admin', 'support']));

router.get('/all', getReviews);
router.patch('/:id/action', actionSchema, validate, reviewAction);
router.post('/:id/reply', replySchema, validate, replyReview);

module.exports = router;