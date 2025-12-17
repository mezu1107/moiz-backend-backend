// src/routes/admin/contactAdminRoutes.js
const router = require('express').Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');
const { param } = require('express-validator');

const {
  getAllContactMessages,
  markMessageAsReplied
} = require('../../controllers/admin/contactAdminController');

// 🔐 HTTP → admin only
router.use(auth);
router.use(role('admin'));

router.get('/messages', getAllContactMessages);

router.patch(
  '/messages/:id/replied',
  [
    param('id').isMongoId().withMessage('Invalid message ID')
  ],
  validate,
  markMessageAsReplied
);

module.exports = router;
