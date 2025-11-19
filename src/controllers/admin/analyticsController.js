// src/controllers/admin/analyticsController.js
const Order = require('../../models/order/Order');
const moment = require('moment');

const getAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = moment().subtract(days, 'days').startOf('day');

    const dailySales = await Order.aggregate([
      { $match: { placedAt: { $gte: startDate.toDate() }, status: 'delivered' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$placedAt' } },
          revenue: { $sum: '$finalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const topItems = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItem',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.priceAtOrder', '$items.quantity'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: '_id',
          as: 'item'
        }
      },
      { $unwind: '$item' },
      {
        $project: {
          name: '$item.name',
          image: '$item.image',
          totalSold: 1,
          revenue: 1
        }
      }
    ]);

    const peakHours = await Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: { $hour: '$placedAt' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { orders: -1 } },
      { $limit: 24 }
    ]);

    res.json({ success: true, data: { dailySales, topItems, peakHours } });
  } catch (err) {
    console.error('getAnalytics error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAnalytics };