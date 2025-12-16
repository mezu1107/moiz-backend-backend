const express = require('express');
const router = express.Router();

const areaController = require('../../controllers/area/areaController');
const { getAreas, checkArea } = areaController;

const { checkAreaQuery } = require('../../validation/schemas/areaSchemas');
const validate = require('../../middleware/validate/validate');

// Public routes
router.get('/', getAreas); // GET /api/areas
router.get('/check', checkAreaQuery, validate, checkArea); // GET /api/areas/check?lat=...&lng=...

console.log('Area routes loaded: /api/areas, /api/areas/check');
module.exports = router;
