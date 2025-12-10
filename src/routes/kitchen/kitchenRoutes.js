// src/routes/kitchen/kitchenRoutes.js
const router = require('express').Router();
const { auth, role } = require('../../middleware/auth/auth');
const KitchenOrder = require('../../models/kitchen/KitchenOrder');

router.use(auth, role('admin'));

router.get('/orders', async (req, res) => {
  const orders = await KitchenOrder.find()
    .populate('items.menuItem', 'name')
    .sort({ placedAt: -1 });
  res.json({ success: true, orders });
});

module.exports = router;