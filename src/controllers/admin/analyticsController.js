// src/controllers/admin/analyticsController.js
const Order = require('../../models/order/Order');
const moment = require('moment-timezone');

moment.tz.setDefault('Asia/Karachi');

const getAnalytics = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 90); // Max 90 days
    const startDate = moment().subtract(days, 'days').startOf('day');

    const matchDelivered = { status: 'delivered', placedAt: { $gte: startDate.toDate() } };

    const [dailySales, totalRevenue, totalOrders, topItems, peakHours, cancellationRate] = await Promise.all([
      // 1. Daily Revenue & Orders
      Order.aggregate([
        { $match: matchDelivered },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$placedAt' } },
            revenue: { $sum: '$finalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // 2. Total Revenue (last X days)
      Order.aggregate([
        { $match: matchDelivered },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } }
      ]),

      // 3. Total Delivered Orders
      Order.countDocuments(matchDelivered),

      // 4. Top 10 Selling Items
      Order.aggregate([
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
        { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: { $ifNull: ['$item.name', 'Deleted Item'] },
            image: '$item.image',
            totalSold: 1,
            revenue: 1
          }
        }
      ]),

      // 5. Peak Hours (24h)
      Order.aggregate([
        { $match: { status: 'delivered' } },
        {
          $group: {
            _id: { $hour: '$placedAt' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { orders: -1 } }
      ]),

      // 6. Cancellation Rate
      Order.aggregate([
        {
          $facet: {
            total: [{ $match: { placedAt: { $gte: startDate.toDate() } } }, { $count: 'count' }],
            cancelled: [
              { $match: { placedAt: { $gte: startDate.toDate() }, status: 'cancelled' } },
              { $count: 'count' }
            ]
          }
        }
      ])
    ]);

    const cancelledCount = cancellationRate[0]?.cancelled[0]?.count || 0;
    const totalAllOrders = cancellationRate[0]?.total[0]?.count || 1;
    const cancelRate = ((cancelledCount / totalAllOrders) * 100).toFixed(1);

    res.json({
      success: true,
      data: {
        summary: {
          period: `${days} days`,
          totalRevenue: totalRevenue[0]?.total || 0,
          totalOrders: totalOrders,
          cancellationRate: `${cancelRate}%`
        },
        dailySales: dailySales.map(d => ({
          date: d._id,
          revenue: d.revenue,
          orders: d.orders
        })),
        topItems,
        peakHours: peakHours.map(h => ({ hour: h._id, orders: h.orders })),
        updatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Analytics Error:', err);
    res.status(500).json({ success: false, message: 'Analytics failed' });
  }
};

module.exports = { getAnalytics };