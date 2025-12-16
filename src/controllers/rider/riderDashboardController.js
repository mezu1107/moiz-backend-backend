// src/controllers/rider/riderDashboardController.js
// FINAL PRODUCTION — DECEMBER 15, 2025 — RIDER DASHBOARD CONTROLLER

const Order = require('../../models/order/Order');
const User = require('../../models/user/User');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Karachi');

const getRiderDashboard = async (req, res) => {
  try {
    const riderId = req.user._id;

    // Date boundaries
    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    const yesterdayStart = moment().subtract(1, 'day').startOf('day').toDate();
    const yesterdayEnd = moment().subtract(1, 'day').endOf('day').toDate();

    const [
      rider,
      todayStats,
      yesterdayStats,
      activeOrdersCount,
      recentDeliveries,
      assignmentStats,
    ] = await Promise.all([
      // Rider profile
      User.findById(riderId).select(
        'name rating totalDeliveries earnings isOnline isAvailable'
      ).lean(),

      // Today's delivered orders
      Order.aggregate([
        {
          $match: {
            rider: riderId,
            status: 'delivered',
            deliveredAt: { $gte: todayStart, $lte: todayEnd },
          },
        },
        {
          $group: {
            _id: null,
            deliveries: { $sum: 1 },
            earnings: { $sum: { $multiply: ['$finalAmount', 0.8] } }, // 80% to rider
            totalTime: {
              $sum: { $subtract: ['$deliveredAt', '$outForDeliveryAt'] },
            },
          },
        },
      ]),

      // Yesterday's delivered orders (for growth)
      Order.aggregate([
        {
          $match: {
            rider: riderId,
            status: 'delivered',
            deliveredAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
          },
        },
        {
          $group: {
            _id: null,
            deliveries: { $sum: 1 },
          },
        },
      ]),

      // Active orders count
      Order.countDocuments({
        rider: riderId,
        status: { $in: ['confirmed', 'preparing', 'out_for_delivery'] },
      }),

      // Recent 5 deliveries
      Order.find({ rider: riderId, status: 'delivered' })
        .select('finalAmount paymentMethod collectedAmount deliveredAt outForDeliveryAt')
        .sort({ deliveredAt: -1 })
        .limit(5)
        .lean(),

      // For acceptance rate: total assigned vs delivered
      Order.aggregate([
        {
          $match: {
            rider: riderId,
            status: { $in: ['delivered', 'rejected'] }, // rejected by rider
          },
        },
        {
          $group: {
            _id: null,
            delivered: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
            },
            rejected: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    // Safe extraction
    const todayData = todayStats[0] || { deliveries: 0, earnings: 0, totalTime: 0 };
    const yesterdayData = yesterdayStats[0] || { deliveries: 0 };
    const assignmentData = assignmentStats[0] || { delivered: 0, rejected: 0 };

    // Growth calculations
    const deliveriesGrowth =
      yesterdayData.deliveries > 0
        ? ((todayData.deliveries - yesterdayData.deliveries) / yesterdayData.deliveries) * 100
        : todayData.deliveries > 0
        ? 100
        : 0;

    // Average delivery time
    const avgDeliveryTimeMins =
      todayData.deliveries > 0
        ? Math.round(todayData.totalTime / todayData.deliveries / 60000) // ms → minutes
        : 0;

    // Acceptance rate
    const totalAssigned = assignmentData.delivered + assignmentData.rejected;
    const acceptanceRate =
      totalAssigned > 0
        ? Math.round((assignmentData.delivered / totalAssigned) * 100)
        : 100;

    // Format recent deliveries
    const recent = recentDeliveries.map((order) => ({
      shortId: order._id.toString().slice(-6).toUpperCase(),
      amount: order.finalAmount,
      earnings: Math.round(order.finalAmount * 0.8),
      method: order.paymentMethod === 'cash' ? 'COD' : 'Online',
      collected: order.collectedAmount || null,
      timeTaken:
        order.outForDeliveryAt && order.deliveredAt
          ? Math.round((order.deliveredAt - order.outForDeliveryAt) / 60000) + ' min'
          : 'N/A',
      deliveredAt: moment(order.deliveredAt).format('h:mm A'),
    }));

    res.json({
      success: true,
      message: 'Dashboard loaded successfully',
      data: {
        profile: {
          name: rider.name,
          rating: rider.rating ? Number(rider.rating.toFixed(1)) : 5.0,
          totalDeliveries: rider.totalDeliveries || 0,
          totalEarnings: Math.round(rider.earnings || todayData.earnings),
          isOnline: rider.isOnline,
          isAvailable: rider.isAvailable,
        },
        today: {
          deliveries: todayData.deliveries,
          earnings: Math.round(todayData.earnings),
          growth: deliveriesGrowth > 0 ? `+${deliveriesGrowth.toFixed(0)}%` : `${deliveriesGrowth.toFixed(0)}%`,
          avgDeliveryTime: avgDeliveryTimeMins > 0 ? `${avgDeliveryTimeMins} min` : 'N/A',
        },
        activeOrders: activeOrdersCount,
        recentDeliveries: recent,
        stats: {
          acceptanceRate: `${acceptanceRate}%`,
          lifetimeDeliveries: rider.totalDeliveries || 0,
          avgRating: rider.rating ? rider.rating.toFixed(1) : '5.0',
        },
      },
    });
  } catch (err) {
    console.error('getRiderDashboard Error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard',
    });
  }
};

module.exports = { getRiderDashboard };