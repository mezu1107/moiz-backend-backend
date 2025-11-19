// src/controllers/admin/dashboardController.js
const Order = require('../../models/order/Order');
const Rider = require('../../models/rider/Rider');
const moment = require('moment');

const getDashboardStats = async (req, res) => {
  try {
    const today = moment().startOf('day');

    const stats = await Order.aggregate([
      {
        $facet: {
          todayRevenue: [
            { $match: { placedAt: { $gte: today.toDate() }, status: 'delivered' } },
            { $group: { _id: null, total: { $sum: '$finalAmount' } } }
          ],
          todayOrders: [
            { $match: { placedAt: { $gte: today.toDate() } } },
            { $count: 'total' }
          ],
          pendingOrders: [
            { $match: { status: { $in: ['pending', 'confirmed', 'preparing', 'out_for_delivery'] } } },
            { $count: 'total' }
          ],
          activeRiders: [
            {
              $lookup: {
                from: 'riders',
                localField: 'rider',
                foreignField: '_id',
                as: 'riderInfo'
              }
            },
            { $unwind: { path: '$riderInfo', preserveNullAndEmptyArrays: true } },
            { $match: { 'riderInfo.isOnline': true, 'riderInfo.isAvailable': true } },
            { $count: 'total' }
          ]
        }
      }
    ]);

    const liveRiders = await Rider.find({
      isOnline: true,
      isAvailable: true
    })
      .select('currentLocation rating totalDeliveries user')
      .populate('user', 'name phone');

    const riders = liveRiders.map(r => ({
      id: r._id,
      name: r.user.name,
      phone: r.user.phone,
      rating: r.rating || 0,
      deliveries: r.totalDeliveries || 0,
      location: {
        lat: r.currentLocation?.coordinates[1] || 0,
        lng: r.currentLocation?.coordinates[0] || 0
      }
    }));

    res.json({
      success: true,
      data: {
        revenueToday: stats[0].todayRevenue[0]?.total || 0,
        ordersToday: stats[0].todayOrders[0]?.total || 0,
        pendingOrders: stats[0].pendingOrders[0]?.total || 0,
        activeRiders: stats[0].activeRiders[0]?.total || 0,
        liveRiders: riders,
        updatedAt: new Date()
      }
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboardStats };