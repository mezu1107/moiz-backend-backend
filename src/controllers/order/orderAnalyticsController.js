// src/controllers/order/orderAnalyticsController.js
// FINAL PRODUCTION VERSION — NOVEMBER 2025 — PAKISTAN'S BEST FOOD APP ANALYTICS

const Order = require('../../models/order/Order');
const Area = require('../../models/area/Area');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Karachi');

/**
 * GET /api/order/analytics
 * Full Business Intelligence Dashboard
 */
const getOrderAnalytics = async (req, res) => {
  try {
    const { period = '7d', startDate, endDate } = req.query;

    let start, end = moment().endOf('day').toDate();

    if (startDate && endDate) {
      start = moment(startDate).startOf('day').toDate();
      end = moment(endDate).endOf('day').toDate();
    } else {
      const periods = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, 'today': 0 };
      const days = periods[period] ?? 7;
      start = days === 0 
        ? moment().startOf('day').toDate()
        : moment().subtract(days, 'days').startOf('day').toDate();
    }

    // Only count successful/in-progress orders (exclude cancelled/rejected)
    const successMatch = {
      placedAt: { $gte: start, $lte: end },
      status: { $in: ['delivered', 'confirmed', 'preparing', 'out_for_delivery'] }
    };

    const allMatch = {
      placedAt: { $gte: start, $lte: end }
    };

    const [
      revenueResult,
      totalOrders,
      cancelledCount,
      dailyTrend,
      paymentBreakdown,
      topAreas,
      peakHours,
      topDeals,
      guestVsRegistered
    ] = await Promise.all([

      // 1. Total Revenue
      Order.aggregate([
        { $match: successMatch },
        { $group: { _id: null, revenue: { $sum: '$finalAmount' } } }
      ]),

      // 2. Total Successful Orders
      Order.countDocuments(successMatch),

      // 3. Cancelled + Rejected
      Order.countDocuments({ ...allMatch, status: { $in: ['cancelled', 'rejected'] } }),

      // 4. Daily Trend (Date-wise)
      Order.aggregate([
        { $match: { ...successMatch } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$placedAt', timezone: 'Asia/Karachi' } },
            orders: { $sum: 1 },
            revenue: { $sum: '$finalAmount' },
            avgOrderValue: { $avg: '$finalAmount' },
            discount: { $sum: '$discountApplied' }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // 5. Payment Method Breakdown
      Order.aggregate([
        { $match: successMatch },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            revenue: { $sum: '$finalAmount' },
            percentage: { $sum: { $divide: [100, totalOrders || 1] } } // Will fix in JS
          }
        }
      ]),

      // 6. Top 10 Areas
      Order.aggregate([
        { $match: successMatch },
        { $lookup: { from: 'areas', localField: 'area', foreignField: '_id', as: 'areaInfo' } },
        { $unwind: { path: '$areaInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$areaInfo.name',
            areaId: { $first: '$area._id' },
            orders: { $sum: 1 },
            revenue: { $sum: '$finalAmount' }
          }
        },
        { $sort: { orders: -1 } },
        { $limit: 10 }
      ]),

      // 7. Peak Hours (24-hour format)
      Order.aggregate([
        { $match: successMatch },
        {
          $group: {
            _id: { $hour: { date: '$placedAt', timezone: 'Asia/Karachi' } },
            orders: { $sum: 1 }
          }
        },
        { $sort: { orders: -1 } }
      ]),

      // 8. Top Performing Deals
      Order.aggregate([
        { $match: { ...successMatch, 'appliedDeal.dealId': { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$appliedDeal.code',
            dealId: { $first: '$appliedDeal.dealId' },
            title: { $first: '$appliedDeal.title' },
            uses: { $sum: 1 },
            discountGiven: { $sum: '$discountApplied' },
            revenueGenerated: { $sum: '$finalAmount' }
          }
        },
        { $sort: { uses: -1 } },
        { $limit: 10 }
      ]),

      // 9. Guest vs Registered Users
      Order.aggregate([
        { $match: allMatch },
        {
          $group: {
            _id: null,
            registered: { $sum: { $cond: [{ $ifNull: ['$customer', false] }, 1, 0] } },
            guest: { $sum: { $cond: ['$guestInfo.isGuest', 1, 0] } }
          }
        }
      ])
    ]);

    const totalRevenue = revenueResult[0]?.revenue || 0;
    const totalDiscount = dailyTrend.reduce((sum, d) => sum + (d.discount || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const cancellationRate = totalOrders + cancelledCount > 0 
      ? (cancelledCount / (totalOrders + cancelledCount) * 100).toFixed(1) 
      : 0;

    const userSplit = guestVsRegistered[0] || { registered: 0, guest: 0 };
    const totalUsers = userSplit.registered + userSplit.guest;

    res.json({
      success: true,
      analytics: {
        summary: {
          period: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
          totalOrders,
          totalRevenue: Number(totalRevenue.toFixed(0)),
          avgOrderValue: Number(avgOrderValue.toFixed(0)),
          totalDiscountGiven: Number(totalDiscount.toFixed(0)),
          cancelledOrders: cancelledCount,
          cancellationRate: `${cancellationRate}%`,
          conversionRate: totalOrders > 0 ? ((totalOrders / (totalOrders + cancelledCount)) * 100).toFixed(1) + '%' : '0%'
        },
        userInsights: {
          registeredUsers: userSplit.registered,
          guestUsers: userSplit.guest,
          registeredPercentage: totalUsers > 0 ? ((userSplit.registered / totalUsers) * 100).toFixed(1) + '%' : '0%'
        },
        charts: {
          dailyTrend: dailyTrend.map(d => ({
            date: d._id,
            orders: d.orders,
            revenue: Number(d.revenue.toFixed(0)),
            aov: Number(d.avgOrderValue.toFixed(0))
          })),
          paymentMethods: paymentBreakdown.map(p => ({
            method: p._id === 'cash' ? 'Cash on Delivery' :
                    p._id === 'card' ? 'Card' :
                    p._id === 'bank' ? 'Bank Transfer' : p._id.charAt(0).toUpperCase() + p._id.slice(1),
            orders: p.count,
            revenue: Number(p.revenue.toFixed(0)),
            percentage: totalOrders > 0 ? ((p.count / totalOrders) * 100).toFixed(1) + '%' : '0%'
          })),
          topAreas: topAreas.map(a => ({
            area: a._id || 'Unknown',
            orders: a.orders,
            revenue: Number(a.revenue.toFixed(0))
          })),
          peakHours: peakHours.map(h => ({
            hour: h._id,
            label: `${h._id}:00 - ${h._id + 1}:00`,
            orders: h.orders
          })),
          topDeals: topDeals.map(d => ({
            code: d._id,
            title: d.title || d._id,
            uses: d.uses,
            discountGiven: Number(d.discountGiven.toFixed(0)),
            revenueGenerated: Number(d.revenueGenerated.toFixed(0))
          }))
        }
      }
    });

  } catch (err) {
    console.error('getOrderAnalytics error:', err.message);
    res.status(500).json({ success: false, message: 'Analytics temporarily unavailable' });
  }
};

/**
 * GET /api/order/realtime
 * Live Dashboard Stats (Updates every 10 seconds)
 */
const getRealtimeStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = moment().startOf('day').toDate();
    const yesterdayStart = moment().subtract(1, 'day').startOf('day').toDate();

    const [todayStats, yesterdayOrders, liveStatus] = await Promise.all([
      Order.aggregate([
        { $match: { placedAt: { $gte: todayStart }, status: { $in: ['delivered', 'confirmed', 'preparing', 'out_for_delivery'] } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$finalAmount' } } }
      ]),
      Order.countDocuments({ placedAt: { $gte: yesterdayStart, $lt: todayStart }, status: { $in: ['delivered', 'confirmed', 'preparing', 'out_for_delivery'] } }),
      Order.aggregate([
        {
          $facet: {
            pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
            confirmed: [{ $match: { status: 'confirmed' } }, { $count: 'count' }],
            preparing: [{ $match: { status: 'preparing' } }, { $count: 'count' }],
            outForDelivery: [{ $match: { status: 'out_for_delivery' } }, { $count: 'count' }],
            pendingPayment: [{ $match: { status: 'pending_payment' } }, { $count: 'count' }],
            cancelledToday: [{ $match: { placedAt: { $gte: todayStart }, status: { $in: ['cancelled', 'rejected'] } } }, { $count: 'count' }]
          }
        }
      ])
    ]);

    const today = todayStats[0] || { orders: 0, revenue: 0 };
    const live = liveStatus[0];

    const growth = yesterdayOrders > 0
      ? ((today.orders - yesterdayOrders) / yesterdayOrders * 100)
      : today.orders > 0 ? 100 : 0;

    res.json({
      success: true,
      realtime: {
        updatedAt: now.toISOString(),
        today: {
          orders: today.orders,
          revenue: Number(today.revenue.toFixed(0)),
          growth: growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`
        },
        live: {
          pending: live.pending[0]?.count || 0,
          confirmed: live.confirmed[0]?.count || 0,
          preparing: live.preparing[0]?.count || 0,
          outForDelivery: live.outForDelivery[0]?.count || 0,
          pendingPayment: live.pendingPayment[0]?.count || 0,
          cancelledToday: live.cancelledToday[0]?.count || 0
        },
        activeOrders: (live.confirmed[0]?.count || 0) + (live.preparing[0]?.count || 0) + (live.outForDelivery[0]?.count || 0)
      }
    });
  } catch (err) {
    console.error('getRealtimeStats error:', err.message);
    res.status(500).json({ success: false, message: 'Live stats unavailable' });
  }
};

module.exports = {
  getOrderAnalytics,
  getRealtimeStats
};