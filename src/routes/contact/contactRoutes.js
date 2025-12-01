// src/routes/contact/contactRoutes.js
const router = require('express').Router();
const validate = require('../../middleware/validate/validate');
const { submitContactMessage } = require('../../controllers/contact/contactController');
const { submitContact } = require('../../validation/schemas/contactSchemas');

// Public route - no auth needed
router.post('/submit', submitContact, validate, submitContactMessage);

module.exports = router;