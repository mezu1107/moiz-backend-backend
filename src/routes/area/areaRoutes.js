const express = require('express');
const router = express.Router();
const validate = require('../../middleware/validate/validate');
const { getAreas, checkArea } = require('../../controllers/area/areaController');
const { checkAreaQuery } = require('../../validation/schemas/areaSchemas');

// Public routes only
router.get('/', getAreas);
router.get('/check', checkAreaQuery, validate, checkArea);

module.exports = router;