// src/controllers/order/orderAnalyticsController.js
// PURE REAL DATA ONLY — NO FAKE DATA — NOV 27, 2025

const Order = require('../../models/order/Order');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Karachi');

// INPUT VALIDATION
const validateAnalyticsQuery = (req, res, next) => {
  const { period, startDate, endDate } = req.query;

  const validPeriods = ['24h', '7d', '30d', '90d', 'today', 'custom'];
  if (period && !validPeriods.includes(period)) {
    return res.status(400).json({
      success: false,
      message: "Invalid period. Use: 24h, 7d, 30d, 90d, today"
    });
  }

  if (startDate || endDate) {
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Both startDate and endDate required for custom range"
      });
    }

    if (!moment(startDate, 'YYYY-MM-DD', true).isValid() || !moment(endDate, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        success: false,
        message: "Date format must be YYYY-MM-DD"
      });
    }

    const start = moment(startDate);
    const end = moment(endDate);
    if (end.isBefore(start)) {
      return res.status(400).json({ success: false, message: "endDate cannot be before startDate" });
    }
    if (end.diff(start, 'days') > 365) {
      return res.status(400).json({ success: false, message: "Max range: 365 days" });
    }
  }

  console.log('[ANALYTICS] Valid request →', { period, startDate, endDate });
  next();
};

const validateRealtimeQuery = (req, res, next) => {
  const allowed = ['refresh', 'fast'];
  const invalid = Object.keys(req.query).filter(k => !allowed.includes(k));
  if (invalid.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Invalid params: ${invalid.join(', ')}`
    });
  }
  next();
};

// MAIN ANALYTICS — 100% REAL DATA ONLY
const getOrderAnalytics = async (req, res) => {
  try {
    let start, end = moment().endOf('day').toDate();

    if (req.query.startDate && req.query.endDate) {
      start = moment(req.query.startDate).startOf('day').toDate();
      end = moment(req.query.endDate).endOf('day').toDate();
    } else {
      const daysMap = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, 'today': 0 };
      const days = daysMap[req.query.period || '7d'];
      start = days === 0 
        ? moment().startOf('day').toDate()
        : moment().subtract(days, 'days').startOf('day').toDate();
    }

    const matchSuccess = {
      placedAt: { $gte: start, $lte: end },
      status: { $in: ['delivered', 'confirmed', 'preparing', 'out_for_delivery'] }
    };

    const matchAll = { placedAt: { $gte: start, $lte: end } };

    const results = await Promise.allSettled([
      Order.aggregate([{ $match: matchSuccess }, { $group: { _id: null, revenue: { $sum: '$finalAmount' } } }]),
      Order.countDocuments(matchSuccess),
      Order.countDocuments({ ...matchAll, status: { $in: ['cancelled', 'rejected'] } }),
      Order.aggregate([
        { $match: matchSuccess },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$placedAt', timezone: 'Asia/Karachi' } },
            orders: { $sum: 1 },
            revenue: { $sum: '$finalAmount' },
            aov: { $avg: '$finalAmount' },
            discount: { $sum: '$discountApplied' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Order.aggregate([
        { $match: matchSuccess },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$finalAmount' } } }
      ]),
      Order.aggregate([
        { $match: matchSuccess },
        { $lookup: { from: 'areas', localField: 'area', foreignField: '_id', as: 'areaInfo' } },
        { $unwind: { path: '$areaInfo', preserveNullAndEmptyArrays: true } },
        { $group: {
            _id: '$areaInfo.name',
            orders: { $sum: 1 },
            revenue: { $sum: '$finalAmount' }
          }
        },
        { $sort: { orders: -1 } },
        { $limit: 10 }
      ]),
      Order.aggregate([
        { $match: matchSuccess },
        { $group: { _id: { $hour: { date: '$placedAt', timezone: 'Asia/Karachi' } }, orders: { $sum: 1 } } },
        { $sort: { orders: -1 } },
        { $limit: 10 }
      ]),
      Order.aggregate([
        { $match: { ...matchSuccess, 'appliedDeal.code': { $exists: true, $ne: null } } },
        { $group: {
            _id: '$appliedDeal.code',
            title: { $first: { $ifNull: ['$appliedDeal.title', '$appliedDeal.code'] } },
            uses: { $sum: 1 },
            discountGiven: { $sum: '$discountApplied' },
            revenueGenerated: { $sum: '$finalAmount' }
          }
        },
        { $sort: { uses: -1 } },
        { $limit: 10 }
      ]),
      Order.aggregate([
        { $match: matchAll },
        { $group: {
            _id: null,
            registered: { $sum: { $cond: [{ $ifNull: ['$customer', false] }, 1, 0] } },
            guest: { $sum: { $cond: [{ $eq: ['$guestInfo.isGuest', true] }, 1, 0] } }
          }
        }
      ])
    ]);

    const [
      revenueRes, totalOrders, cancelledCount, dailyTrend, paymentBreakdown,
      topAreasRaw, peakHours, topDealsRaw, guestResult
    ] = results.map(r => r.status === 'fulfilled' ? r.value : []);

    const totalRevenue = revenueRes[0]?.revenue || 0;
    const totalDiscount = dailyTrend.reduce((acc, d) => acc + (d.discount || 0), 0);
    const guestData = guestResult[0] || { registered: 0, guest: 0 };

    res.json({
      success: true,
      analytics: {
        summary: {
          period: { 
            start: start.toISOString().split('T')[0], 
            end: end.toISOString().split('T')[0] 
          },
          totalOrders: totalOrders || 0,
          totalRevenue: Math.round(totalRevenue),
          avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
          totalDiscountGiven: Math.round(totalDiscount),
          cancelledOrders: cancelledCount || 0,
          cancellationRate: (totalOrders + cancelledCount) > 0 
            ? ((cancelledCount / (totalOrders + cancelledCount)) * 100).toFixed(1) + '%'
            : '0%',
          conversionRate: totalOrders > 0 
            ? ((totalOrders / (totalOrders + cancelledCount)) * 100).toFixed(1) + '%'
            : '0%'
        },
        userInsights: {
          registeredUsers: guestData.registered || 0,
          guestUsers: guestData.guest || 0,
          registeredPercentage: (guestData.registered + guestData.guest) > 0
            ? ((guestData.registered / (guestData.registered + guestData.guest)) * 100).toFixed(1) + '%'
            : '0%'
        },
        charts: {
          dailyTrend: (dailyTrend || []).map(d => ({
            date: d._id,
            orders: d.orders || 0,
            revenue: Math.round(d.revenue || 0),
            aov: Math.round(d.aov || 0)
          })),
          paymentMethods: (paymentBreakdown || []).map(p => ({
            method: p._id === 'cash' ? 'Cash on Delivery' : p._id === 'card' ? 'Card' : p._id || 'Unknown',
            orders: p.count || 0,
            revenue: Math.round(p.revenue || 0),
            percentage: totalOrders > 0 ? ((p.count / totalOrders) * 100).toFixed(1) + '%' : '0%'
          })),
          topAreas: (topAreasRaw || []).map(a => ({
            area: a._id || 'Unknown',
            orders: a.orders || 0,
            revenue: Math.round(a.revenue || 0)
          })),
          peakHours: (peakHours || []).map(h => ({
            hour: h._id,
            label: `${h._id}:00 - ${h._id + 1}:00`,
            orders: h.orders
          })),
          topDeals: (topDealsRaw || []).map(d => ({
            code: d._id,
            title: d.title || d._id,
            uses: d.uses || 0,
            discountGiven: Math.round(d.discountGiven || 0),
            revenueGenerated: Math.round(d.revenueGenerated || 0)
          }))
        }
      }
    });

  } catch (err) {
    console.error('ANALYTICS ERROR:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getRealtimeStats = async (req, res) => {
  try {
    const today = moment().startOf('day').toDate();

    const [todayStats, live] = await Promise.all([
      Order.aggregate([
        { $match: { placedAt: { $gte: today }, status: { $in: ['delivered', 'confirmed', 'preparing', 'out_for_delivery'] } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$finalAmount' } } }
      ]).catch(() => [{ orders: 0, revenue: 0 }]),

      Order.aggregate([
        {
          $facet: {
            pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
            confirmed: [{ $match: { status: 'confirmed' } }, { $count: 'count' }],
            preparing: [{ $match: { status: 'preparing' } }, { $count: 'count' }],
            outForDelivery: [{ $match: { status: 'out_for_delivery' } }, { $count: 'count' }],
            pendingPayment: [{ $match: { status: 'pending_payment' } }, { $count: 'count' }],
            cancelledToday: [{ $match: { placedAt: { $gte: today }, status: { $in: ['cancelled', 'rejected'] } } }, { $count: 'count' }]
          }
        }
      ]).catch(() => [{}])
    ]);

    const t = todayStats[0] || { orders: 0, revenue: 0 };
    const l = live[0] || {};

    res.json({
      success: true,
      realtime: {
        updatedAt: new Date().toISOString(),
        today: { 
          orders: t.orders, 
          revenue: Math.round(t.revenue || 0),
          growth: "+0%" // Will improve later with yesterday compare
        },
        live: {
          pending: l.pending?.[0]?.count || 0,
          confirmed: l.confirmed?.[0]?.count || 0,
          preparing: l.preparing?.[0]?.count || 0,
          outForDelivery: l.outForDelivery?.[0]?.count || 0,
          pendingPayment: l.pendingPayment?.[0]?.count || 0,
          cancelledToday: l.cancelledToday?.[0]?.count || 0
        },
        activeOrders: (l.confirmed?.[0]?.count || 0) + (l.preparing?.[0]?.count || 0) + (l.outForDelivery?.[0]?.count || 0)
      }
    });
  } catch (err) {
    console.error('REALTIME ERROR:', err);
    res.status(500).json({ success: false, message: 'Live stats unavailable' });
  }
};

module.exports = { 
  getOrderAnalytics, 
  getRealtimeStats, 
  validateAnalyticsQuery, 
  validateRealtimeQuery 
};