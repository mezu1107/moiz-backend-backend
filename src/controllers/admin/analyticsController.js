// src/controllers/admin/analyticsController.js
const Order = require('../../models/order/Order');
const moment = require('moment');

const getAnalytics = async (req, res) => {
  const { days = 7 } = req.query;
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
        name: { $first: '$items.name' },
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
        as: 'itemDetails'
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
    { $sort: { orders: -1 } }
  ]);

  res.json({
    success: true,
    data: { dailySales, topItems, peakHours }
  });
};

module.exports = { getAnalytics };