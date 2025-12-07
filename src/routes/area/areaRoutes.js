// src/routes/area/areaRoutes.js
const express = require('express');
const router = express.Router();

const { getAreas, checkArea } = require('../../controllers/area/areaController');
const { checkAreaQuery } = require('../../validation/schemas/areaSchemas');
const validate = require('../../middleware/validate/validate');

// Public routes — no auth required
router.get('/', getAreas);                    // GET /api/areas → list active areas
router.get('/check', checkAreaQuery, validate, checkArea); // GET /api/areas/check?lat=...&lng=...

module.exports = router;