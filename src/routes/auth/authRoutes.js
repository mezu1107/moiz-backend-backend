// src/routes/auth/authRoutes.js
const express = require('express');
const router = express.Router();

const { register, login } = require('../../controllers/auth/authController');
const validate = require('../../middleware/validate/validate');
const { authSchemas } = require('../../validation/schemas');

router.post('/register', authSchemas.register, validate, register);
router.post('/login', authSchemas.login, validate, login);

module.exports = router;