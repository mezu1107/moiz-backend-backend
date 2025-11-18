// src/routes/upload/uploadRoutes.js
const express = require('express');
const router = express.Router();

const { uploadImage } = require('../../controllers/upload/uploadController');

// Public upload (can be protected later if needed)
router.post('/', uploadImage);

module.exports = router;