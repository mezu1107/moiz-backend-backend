// src/routes/support/supportRoutes.js
const router = require('express').Router();
const { auth, role } = require('../../middleware/auth/auth');
const validate = require('../../middleware/validate/validate');

const {
  createTicket,
  getMyTickets,
  getAllTickets,
  replyTicket,
  updateTicket
} = require('../../controllers/support/supportController');

const {
  createTicket: createSchema,
  replyTicket: replySchema
} = require('../../validation/schemas/supportSchemas');

// Customer
router.use(auth);
router.post('/create', createSchema, validate, createTicket);
router.get('/my', getMyTickets);

// Admin + Support Team
router.use(role(['admin', 'support']));
router.get('/all', getAllTickets);
router.patch('/:id', updateTicket);
router.post('/:id/reply', replySchema, validate, replyTicket);

module.exports = router;