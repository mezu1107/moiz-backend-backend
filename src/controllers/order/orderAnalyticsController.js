// src/controllers/order/orderAnalyticsController.js
const Order = require('../../models/order/Order');
const User = require('../../models/user/User');
const moment = require('moment-timezone');

// Set timezone to Pakistan
moment.tz.setDefault('Asia/Karachi');

/**
 * GET /api/orders/analytics
 * Full business analytics dashboard
 */
const getOrderAnalytics = async (req, res) => {
  try {
    const { period = '7d', startDate, endDate } = req.query;
    const now = new Date();
    let start, end;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      switch (period) {
        case '24h':
          start = moment(now).subtract(24, 'hours').toDate();
          break;
        case '7d':
          start = moment(now).subtract(7, 'days').toDate();
          break;
        case '30d':
          start = moment(now).subtract(30, 'days').toDate();
          break;
        case '90d':
          start = moment(now).subtract(90, 'days').toDate();
          break;
        default:
          start = moment(now).subtract(7, 'days').toDate();
      }
      end = now;
    }

    const match = {
      placedAt: { $gte: start, $lte: end },
      status: { $in: ['delivered', 'confirmed', 'preparing', 'out_for_delivery'] }
    };

    const totalOrders = await Order.countDocuments(match);
    const totalRevenue = await Order.aggregate([
      { $match: match },
      { $group: { _id: null, revenue: { $sum: '$finalAmount' } } }
    ]);

    const avgOrderValue =
      totalOrders > 0
        ? (totalRevenue[0]?.revenue || 0) / totalOrders
        : 0;

    const dailyData = await Order.aggregate([
      { $match: { ...match, placedAt: { $exists: true } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$placedAt',
              timezone: 'Asia/Karachi'
            }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$finalAmount' },
          discount: { $sum: '$discountApplied' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const paymentMethodStats = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          amount: { $sum: '$finalAmount' }
        }
      }
    ]);

    // ✅ FIXED: Missing bracket
    const topAreas = await Order.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'areas',
          localField: 'area',
          foreignField: '_id',
          as: 'areaInfo'
        }
      },
      { $unwind: '$areaInfo' },
      {
        $group: {
          _id: '$areaInfo.name',
          orders: { $sum: 1 },
          revenue: { $sum: '$finalAmount' }
        }
      },
      { $sort: { orders: -1 } },
      { $limit: 10 }
    ]);

    const peakHours = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $hour: { date: '$placedAt', timezone: 'Asia/Karachi' }
          },
          orders: { $sum: 1 }
        }
      },
      { $sort: { orders: -1 } },
      { $limit: 6 }
    ]);

    const dealPerformance = await Order.aggregate([
      { $match: { ...match, 'appliedDeal.dealId': { $exists: true } } },
      {
        $group: {
          _id: '$appliedDeal.dealId',
          code: { $first: '$appliedDeal.code' },
          uses: { $sum: 1 },
          discountGiven: { $sum: '$discountApplied' },
          revenue: { $sum: '$finalAmount' }
        }
      },
      {
        $lookup: {
          from: 'deals',
          localField: '_id',
          foreignField: '_id',
          as: 'deal'
        }
      },
      { $unwind: { path: '$deal', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          code: { $ifNull: ['$code', '$deal.code'] },
          title: { $ifNull: ['$deal.title', 'Deleted Deal'] },
          uses: 1,
          discountGiven: 1,
          revenue: 1
        }
      },
      { $sort: { uses: -1 } },
      { $limit: 10 }
    ]);

    const summary = {
      period: { start: start.toISOString(), end: end.toISOString() },
      totalOrders,
      totalRevenue: Number((totalRevenue[0]?.revenue || 0).toFixed(2)),
      avgOrderValue: Number(avgOrderValue.toFixed(2)),
      totalDiscountGiven: Number(
        dailyData.reduce((sum, d) => sum + (d.discount || 0), 0).toFixed(2)
      )
    };

    res.json({
      success: true,
      summary,
      charts: {
        dailyTrend: dailyData,
        paymentMethods: paymentMethodStats,
        topAreas,
        peakHours,
        dealPerformance
      }
    });
  } catch (err) {
    console.error('getOrderAnalytics error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/orders/realtime
 * Live dashboard stats
 */
const getRealtimeStats = async (req, res) => {
  try {
    const today = moment().startOf('day');
    const yesterday = moment().subtract(1, 'day').startOf('day');

    const [todayStats, yesterdayStats] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            placedAt: { $gte: today.toDate() },
            status: {
              $in: ['delivered', 'confirmed', 'preparing', 'out_for_delivery']
            }
          }
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$finalAmount' }
          }
        }
      ]),

      Order.aggregate([
        {
          $match: {
            placedAt: { $gte: yesterday.toDate(), $lt: today.toDate() },
            status: {
              $in: ['delivered', 'confirmed', 'preparing', 'out_for_delivery']
            }
          }
        },
        { $group: { _id: null, orders: { $sum: 1 } } }
      ])
    ]);

    const todayOrders = todayStats[0]?.orders || 0;
    const todayRevenue = todayStats[0]?.revenue || 0;
    const yesterdayOrders = yesterdayStats[0]?.orders || 0;

    const ordersGrowth =
      yesterdayOrders > 0
        ? ((todayOrders - yesterdayOrders) / yesterdayOrders * 100).toFixed(1)
        : todayOrders > 0
        ? '100'
        : '0';

    const liveOrders = await Order.countDocuments({
      status: ['pending', 'confirmed', 'preparing', 'out_for_delivery']
    });

    const pendingPayments = await Order.countDocuments({
      status: 'pending_payment',
      paymentStatus: 'pending'
    });

    res.json({
      success: true,
      live: {
        activeOrders: liveOrders,
        pendingPayments,
        todayOrders,
        todayRevenue: Number(todayRevenue.toFixed(2)),
        ordersGrowth: `${ordersGrowth}%`
      }
    });
  } catch (err) {
    console.error('getRealtimeStats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Live Order Tracking for Customer & Admin
 * GET /api/orders/track/:orderId
 */
const trackOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('customer', 'name phone')
      .populate('rider', 'name phone currentLocation locationUpdatedAt')
      .populate('address', 'label fullAddress location')
      .populate('area', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Access control
    const isOwner = order.customer?._id?.toString() === req.user?.id;
    const isRider =
      req.user?.role === 'rider' &&
      order.rider?._id?.toString() === req.user.id;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isRider && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Rider live location
    let riderLocation = null;
    if (order.rider?.currentLocation?.coordinates) {
      riderLocation = {
        lat: order.rider.currentLocation.coordinates[1],
        lng: order.rider.currentLocation.coordinates[0],
        updatedAt: order.rider.locationUpdatedAt || order.rider.updatedAt
      };
    }

    const getETA = () => {
      const placed = moment(order.placedAt);
      const now = moment();

      switch (order.status) {
        case 'pending':
        case 'confirmed':
          return '10–15 min';
        case 'preparing':
          return '20–30 min';
        case 'out_for_delivery':
          return '5–15 min';
        case 'delivered':
          return 'Delivered';
        default:
          const mins = now.diff(placed, 'minutes');
          return mins < 30 ? '30–45 min' : '45–60 min';
      }
    };

    const trackingData = {
      orderId: order._id,
      status: order.status,
      statusText:
        order.status.charAt(0).toUpperCase() +
        order.status.slice(1).replace('_', ' '),

      placedAt: order.placedAt,
      estimatedDelivery: order.estimatedDelivery,
      currentETA: getETA(),
      paymentMethod: order.paymentMethod,
      totalAmount: order.finalAmount,
      canCancel: ['pending', 'confirmed', 'pending_payment'].includes(
        order.status
      ),

      customer: {
        name: order.customer.name,
        phone: order.customer.phone
      },

      address: order.address,

      rider: order.rider
        ? {
            name: order.rider.name,
            phone: order.rider.phone,
            location: riderLocation
          }
        : null,

      timeline: [
        { status: 'Order Placed', time: order.placedAt, completed: true },
        {
          status: 'Confirmed',
          time: order.confirmedAt || null,
          completed: ['confirmed', 'preparing', 'out_for_delivery', 'delivered'].includes(order.status)
        },
        {
          status: 'Preparing',
          time: order.preparingAt || order.updatedAt,
          completed: ['preparing', 'out_for_delivery', 'delivered'].includes(order.status)
        },
        {
          status: 'Out for Delivery',
          time: order.outForDeliveryAt || order.updatedAt,
          completed: ['out_for_delivery', 'delivered'].includes(order.status)
        },
        {
          status: 'Delivered',
          time: order.deliveredAt || null,
          completed: order.status === 'delivered'
        }
      ]
    };

    res.json({
      success: true,
      tracking: trackingData
    });
  } catch (err) {
    console.error('trackOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getOrderAnalytics,
  getRealtimeStats,
  trackOrder
};
