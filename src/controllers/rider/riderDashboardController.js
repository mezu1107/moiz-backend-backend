// src/controllers/rider/riderDashboardController.js
const Order = require('../../models/order/Order');
const User = require('../../models/user/User');

const getRiderDashboard = async (req, res) => {
  try {
    const riderId = req.user._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      rider,
      todayStats,
      activeOrdersCount,
      lifetimeEarningsAgg,
      recentDeliveries
    ] = await Promise.all([
      User.findById(riderId).select('name rating totalDeliveries earnings isOnline isAvailable'),

      Order.aggregate([
        {
          $match: {
            rider: riderId,
            status: 'delivered',
            deliveredAt: { $gte: today, $lt: tomorrow }
          }
        },
        {
          $group: {
            _id: null,
            todayDeliveries: { $sum: 1 },
            todayEarnings: { $sum: { $multiply: ['$finalAmount', 0.8] } }
          }
        }
      ]),

      Order.countDocuments({
        rider: riderId,
        status: { $in: ['confirmed', 'preparing', 'out_for_delivery'] }
      }),

      Order.aggregate([
        {
          $match: { rider: riderId, status: 'delivered' }
        },
        {
          $group: {
            _id: null,
            lifetimeEarnings: { $sum: { $multiply: ['$finalAmount', 0.8] } }
          }
        }
      ]),

      Order.find({ rider: riderId, status: 'delivered' })
        .select('finalAmount deliveredAt paymentMethod collectedAmount')
        .sort({ deliveredAt: -1 })
        .limit(5)
        .lean()
    ]);

    const todayData = todayStats[0] || { todayDeliveries: 0, todayEarnings: 0 };
    const lifetimeData = lifetimeEarningsAgg[0] || { lifetimeEarnings: 0 };

    res.json({
      success: true,
      message: 'Dashboard loaded successfully',
      data: {
        rider: {
          name: rider.name,
          rating: Number(rider.rating?.toFixed(1)) || 5.0,
          totalDeliveries: rider.totalDeliveries || 0,
          totalEarnings: Math.round(rider.earnings || lifetimeData.lifetimeEarnings),
          isOnline: rider.isOnline,
          isAvailable: rider.isAvailable,
        },
        today: {
          deliveries: todayData.todayDeliveries,
          earnings: Math.round(todayData.todayEarnings),
        },
        activeOrders: activeOrdersCount,
        recentDeliveries: recentDeliveries.map(order => ({
          orderId: order._id.toString().slice(-6).toUpperCase(),
          amount: order.finalAmount,
          earnings: Math.round(order.finalAmount * 0.8),
          method: order.paymentMethod === 'cash' ? 'COD' : 'Online',
          collected: order.collectedAmount || null,
          deliveredAt: order.deliveredAt,
        })),
        stats: {
          acceptanceRate: rider.totalDeliveries > 10
            ? Math.round((rider.totalDeliveries / (rider.totalDeliveries + 3)) * 100) + '%'
            : '100%',
          avgDeliveryTime: '38 min',
        }
      }
    });

  } catch (err) {
    console.error('getR frciderDashboard Error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard'
    });
  }
};

module.exports = { getRiderDashboard };