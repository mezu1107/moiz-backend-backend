// src/routes/admin/adminRoutes.js
const router = require('express').Router();
const { auth } = require('../../middleware/auth/auth');
const { role } = require('../../middleware/role/role');
const validate = require('../../middleware/validate/validate');

const { addArea, setDeliveryZone } = require('../../controllers/admin/adminController');
const { getAnalytics } = require('../../controllers/admin/analyticsController');

const { addArea: addAreaSchema } = require('../../validation/schemas/areaSchemas');

router.use(auth, role('admin'));

// Analytics
router.get('/analytics', getAnalytics);

// Area & Zone Management
router.post('/area', addAreaSchema, validate, addArea);
router.post('/delivery-zone', setDeliveryZone);

module.exports = router;