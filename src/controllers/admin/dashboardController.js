// src/controllers/admin/dashboardController.js
const Order = require('../../models/order/Order');
const Rider = require('../../models/rider/Rider');
const moment = require('moment');

const getDashboardStats = async (req, res) => {
  try {
    const today = moment().startOf('day');
    const startOfMonth = moment().startOf('month');

    const [stats] = await Order.aggregate([
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
            { $match: { status: { $in: ['pending', 'confirmed', 'preparing'] } } },
            { $count: 'total' }
          ],
          activeRiders: [
            { $lookup: { from: 'riders', localField: 'rider', foreignField: '_id', as: 'riderInfo' } },
            { $match: { 'riderInfo.isOnline': true, 'riderInfo.isAvailable': true } },
            { $count: 'total' }
          ]
        }
      }
    ]);

    const liveRiders = await Rider.find({
      isOnline: true,
      isAvailable: true
    }).select('currentLocation rating totalDeliveries user').populate('user', 'name phone');

    res.json({
      success: true,
      data: {
        revenueToday: stats.todayRevenue[0]?.total || 0,
        ordersToday: stats.todayOrders[0]?.total || 0,
        pendingOrders: stats.pendingOrders[0]?.total || 0,
        activeRiders: stats.activeRiders[0]?.total || 0,
        liveRiders: liveRiders.map(r => ({
          id: r._id,
          name: r.user.name,
          phone: r.user.phone,
          rating: r.rating,
          deliveries: r.totalDeliveries,
          location: {
            lat: r.currentLocation.coordinates[1],
            lng: r.currentLocation.coordinates[0]
          }
        })),
        updatedAt: new Date()
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboardStats };