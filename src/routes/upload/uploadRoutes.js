// src/routes/upload/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const upload = require('../../middleware/upload/Upload');
const { uploadImage } = require('../../controllers/upload/uploadController');

router.post('/', auth, role(['admin']), upload.single('image'), uploadImage);

module.exports = router;