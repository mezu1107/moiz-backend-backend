// src/routes/area/areaRoutes.js
const express = require('express');
const router = express.Router();

// Import controller as a whole to avoid partial load issues
const areaController = require('../../controllers/area/areaController');

// Destructure with safety check
const { getAreas, checkArea } = areaController;

// Ensure functions exist
if (!getAreas || typeof getAreas !== 'function') {
  throw new Error('FATAL: getAreas is missing from areaController.js');
}
if (!checkArea || typeof checkArea !== 'function') {
  throw new Error('FATAL: checkArea is missing from areaController.js');
}

const { checkAreaQuery } = require('../../validation/schemas/areaSchemas');
const validate = require('../../middleware/validate/validate');

// Public routes
router.get('/', getAreas); // GET /api/areas
router.get('/check', checkAreaQuery, validate, checkArea); // GET /api/areas/check?lat=...&lng=...

console.log('Area routes loaded: /api/areas, /api/areas/check');
module.exports = router;