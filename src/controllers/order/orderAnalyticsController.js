// src/controllers/order/orderAnalyticsController.js
// FINAL PRODUCTION — DECEMBER 21, 2025 — FULLY SYNCED WITH ORDER CONTROLLER

const Order = require('../../models/order/Order');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Karachi');

// Helper: Convert Decimal128 → number safely
const toNumber = (decimal) => decimal ? parseFloat(decimal.toString()) : 0;

// ====================== INPUT VALIDATION ======================
const validateAnalyticsQuery = (req, res, next) => {
  const { period, startDate, endDate } = req.query;

  const validPeriods = ['24h', '7d', '30d', '90d', 'today', 'yesterday', 'custom'];
  if (period && !validPeriods.includes(period)) {
    return res.status(400).json({
      success: false,
      message: "Invalid period. Valid: 24h, 7d, 30d, 90d, today, yesterday, custom"
    });
  }

  if (period === 'custom' || (startDate && endDate)) {
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Both startDate and endDate required for custom range"
      });
    }

    if (!moment(startDate, 'YYYY-MM-DD', true).isValid() || !moment(endDate, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD"
      });
    }

    const start = moment(startDate);
    const end = moment(endDate);
    if (end.isBefore(start)) {
      return res.status(400).json({ success: false, message: "endDate cannot be before startDate" });
    }
    if (end.diff(start, 'days') > 365) {
      return res.status(400).json({ success: false, message: "Maximum range: 365 days" });
    }
  }

  next();
};

const validateRealtimeQuery = (req, res, next) => {
  const allowed = ['mode']; // future-proof
  const invalid = Object.keys(req.query).filter(k => !allowed.includes(k));
  if (invalid.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Invalid query params: ${invalid.join(', ')}`
    });
  }
  next();
};

// ====================== MAIN ANALYTICS ======================
const getOrderAnalytics = async (req, res) => {
  try {
    let startDate, endDate;

    // Determine date range
    if (req.query.startDate && req.query.endDate) {
      startDate = moment(req.query.startDate).startOf('day').toDate();
      endDate = moment(req.query.endDate).endOf('day').toDate();
    } else {
      const period = req.query.period || '7d';
      const map = {
        '24h': () => moment().subtract(1, 'day').startOf('day'),
        'today': () => moment().startOf('day'),
        'yesterday': () => moment().subtract(1, 'day').startOf('day'),
        '7d': () => moment().subtract(7, 'days').startOf('day'),
        '30d': () => moment().subtract(30, 'days').startOf('day'),
        '90d': () => moment().subtract(90, 'days').startOf('day')
      };

      const getStart = map[period] || map['7d'];
      startDate = getStart().toDate();
      endDate = period === 'today' || period === 'yesterday'
        ? getStart().endOf('day').toDate()
        : moment().endOf('day').toDate();
    }

    // Previous period for growth comparison
    const daysDiff = moment(endDate).diff(moment(startDate), 'days') + 1;
    const prevStart = moment(startDate).subtract(daysDiff, 'days').toDate();
    const prevEnd = moment(endDate).subtract(daysDiff, 'days').toDate();

    // Match conditions
    const matchCurrent = { placedAt: { $gte: startDate, $lte: endDate } };
    const matchPrev = { placedAt: { $gte: prevStart, $lte: prevEnd } };
    const matchSuccess = status => ({
      ...matchCurrent,
      status: { $in: status }
    });

    // Successful orders only
    const successStatuses = ['delivered', 'confirmed', 'preparing', 'out_for_delivery'];

    // Run all aggregations in parallel
    const [
      currentSuccess,
      currentCancelled,
      prevSuccess,
      dailyTrend,
      paymentMethods,
      topAreas,
      peakHours,
      topDeals,
      userType
    ] = await Promise.all([
      // Current period - success
      Order.aggregate([
        { $match: matchSuccess(successStatuses) },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$finalAmount' },
            discount: { $sum: '$discountApplied' }
          }
        }
      ]),

      // Current cancelled/rejected
      Order.countDocuments({ ...matchCurrent, status: { $in: ['cancelled', 'rejected'] } }),

      // Previous period - success (for growth)
      Order.aggregate([
        { $match: { ...matchPrev, status: { $in: successStatuses } } },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$finalAmount' }
          }
        }
      ]),

      // Daily trend
      Order.aggregate([
        { $match: matchSuccess(successStatuses) },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$placedAt', timezone: 'Asia/Karachi' } },
            orders: { $sum: 1 },
            revenue: { $sum: '$finalAmount' },
            aov: { $avg: '$finalAmount' },
            discount: { $sum: '$discountApplied' }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Payment methods
      Order.aggregate([
        { $match: matchSuccess(successStatuses) },
        {
          $group: {
            _id: '$paymentMethod',
            orders: { $sum: 1 },
            revenue: { $sum: '$finalAmount' }
          }
        }
      ]),

      // Top 10 areas
      Order.aggregate([
        { $match: matchSuccess(successStatuses) },
        { $lookup: { from: 'areas', localField: 'area', foreignField: '_id', as: 'areaInfo' } },
        { $unwind: { path: '$areaInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$areaInfo.name' || 'Unknown',
            orders: { $sum: 1 },
            revenue: { $sum: '$finalAmount' }
          }
        },
        { $sort: { orders: -1 } },
        { $limit: 10 }
      ]),

      // Peak hours
      Order.aggregate([
        { $match: matchSuccess(successStatuses) },
        {
          $group: {
            _id: { $hour: { date: '$placedAt', timezone: 'Asia/Karachi' } },
            orders: { $sum: 1 }
          }
        },
        { $sort: { orders: -1 } },
        { $limit: 8 }
      ]),

      // Top deals
      Order.aggregate([
        { $match: { ...matchSuccess(successStatuses), 'appliedDeal.code': { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$appliedDeal.code',
            title: { $first: { $ifNull: ['$appliedDeal.title', '$appliedDeal.code'] } },
            uses: { $sum: 1 },
            discountGiven: { $sum: '$discountApplied' },
            revenue: { $sum: '$finalAmount' }
          }
        },
        { $sort: { uses: -1 } },
        { $limit: 10 }
      ]),

      // User type breakdown
      Order.aggregate([
        { $match: matchCurrent },
        {
          $group: {
            _id: null,
            registered: { $sum: { $cond: [{ $ifNull: ['$customer', false] }, 1, 0] } },
            guest: { $sum: { $cond: [{ $eq: ['$guestInfo.isGuest', true] }, 1, 0] } }
          }
        }
      ])
    ]);

    // Extract values safely
    const current = currentSuccess[0] || { orders: 0, revenue: 0, discount: 0 };
    const prev = prevSuccess[0] || { orders: 0, revenue: 0 };

    const totalOrders = current.orders;
    const totalRevenueRaw = current.revenue;
    const totalDiscountRaw = current.discount;

    const totalRevenue = toNumber(totalRevenueRaw);
    const totalDiscount = toNumber(totalDiscountRaw);

    // Growth calculations
    const prevOrders = prev.orders;
    const prevRevenue = toNumber(prev.revenue);

    const ordersGrowth = prevOrders > 0
      ? ((totalOrders - prevOrders) / prevOrders * 100).toFixed(1)
      : totalOrders > 0 ? '100' : '0';

    const revenueGrowth = prevRevenue > 0
      ? ((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
      : totalRevenue > 0 ? '100' : '0';

    const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const cancellationRate = (totalOrders + currentCancelled) > 0
      ? ((currentCancelled / (totalOrders + currentCancelled)) * 100).toFixed(1)
      : '0';

    const users = userType[0] || { registered: 0, guest: 0 };
    const totalUsers = users.registered + users.guest;
    const registeredPct = totalUsers > 0
      ? ((users.registered / totalUsers) * 100).toFixed(1)
      : '0';

    res.json({
      success: true,
      analytics: {
        period: {
          label: req.query.period || (req.query.startDate ? 'custom' : '7d'),
          start: moment(startDate).format('YYYY-MM-DD'),
          end: moment(endDate).format('YYYY-MM-DD'),
          days: daysDiff
        },
        summary: {
          totalOrders,
          totalRevenue: Math.round(totalRevenue),
          avgOrderValue: aov,
          totalDiscountGiven: Math.round(totalDiscount),
          cancelledOrders: currentCancelled,
          cancellationRate: cancellationRate + '%',
          ordersGrowth: (ordersGrowth > 0 ? '+' : '') + ordersGrowth + '%',
          revenueGrowth: (revenueGrowth > 0 ? '+' : '') + revenueGrowth + '%'
        },
        userInsights: {
          registeredOrders: users.registered,
          guestOrders: users.guest,
          registeredPercentage: registeredPct + '%'
        },
        charts: {
          dailyTrend: dailyTrend.map(d => ({
            date: d._id,
            orders: d.orders,
            revenue: Math.round(toNumber(d.revenue)),
            aov: Math.round(toNumber(d.aov) || 0),
            discount: Math.round(toNumber(d.discount) || 0)
          })),
          paymentMethods: paymentMethods.map(p => {
            const label = {
              cash: 'Cash on Delivery',
              card: 'Card',
              wallet: 'Wallet',
              easypaisa: 'Easypaisa',
              jazzcash: 'JazzCash',
              bank: 'Bank Transfer'
            }[p._id] || p._id || 'Other';
            return {
              method: label,
              orders: p.orders,
              revenue: Math.round(toNumber(p.revenue)),
              percentage: totalOrders > 0 ? ((p.orders / totalOrders) * 100).toFixed(1) + '%' : '0%'
            };
          }),
          topAreas: topAreas.map(a => ({
            area: a._id,
            orders: a.orders,
            revenue: Math.round(toNumber(a.revenue))
          })),
          peakHours: peakHours.map(h => ({
            hour: h._id,
            label: `${h._id}:00 - ${h._id + 1}:00`,
            orders: h.orders
          })),
          topDeals: topDeals.map(d => ({
            code: d._id,
            title: d.title,
            uses: d.uses,
            discountGiven: Math.round(toNumber(d.discountGiven)),
            revenueGenerated: Math.round(toNumber(d.revenue))
          }))
        }
      }
    });

  } catch (err) {
    console.error('ANALYTICS ERROR:', err);
    res.status(500).json({ success: false, message: 'Analytics temporarily unavailable' });
  }
};

const getRealtimeStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = moment().startOf('day').toDate();
    const yesterdayStart = moment().subtract(1, 'day').startOf('day').toDate();
    const yesterdayEnd = moment().subtract(1, 'day').endOf('day').toDate();

    const pipeline = [
      {
        $facet: {
          todaySuccess: [
            {
              $match: {
                placedAt: { $gte: todayStart },
                status: { $in: ['delivered', 'confirmed', 'preparing', 'out_for_delivery'] }
              }
            },
            {
              $group: {
                _id: null,
                orders: { $sum: 1 },
                revenue: { $sum: '$finalAmount' }
              }
            }
          ],

          yesterdaySuccess: [
            {
              $match: {
                placedAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
                status: { $in: ['delivered', 'confirmed', 'preparing', 'out_for_delivery'] }
              }
            },
            {
              $group: {
                _id: null,
                orders: { $sum: 1 },
                revenue: { $sum: '$finalAmount' }
              }
            }
          ],

          liveStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],

          cancelledToday: [
            {
              $match: {
                placedAt: { $gte: todayStart },
                status: { $in: ['cancelled', 'rejected'] }
              }
            },
            { $count: 'count' }
          ]
        }
      }
    ];

    // ✅ FIXED HERE
    const [data] = await Order.aggregate(pipeline);

    const today = data.todaySuccess[0] || { orders: 0, revenue: 0 };
    const yesterday = data.yesterdaySuccess[0] || { orders: 0, revenue: 0 };

    const todayRevenue = toNumber(today.revenue);
    const yesterdayRevenue = toNumber(yesterday.revenue);

    const ordersGrowth =
      yesterday.orders > 0
        ? ((today.orders - yesterday.orders) / yesterday.orders * 100).toFixed(1)
        : today.orders > 0 ? 100 : 0;

    const statusMap = {};
    data.liveStatus.forEach(s => {
      statusMap[s._id] = s.count;
    });

    const active =
      (statusMap.confirmed || 0) +
      (statusMap.preparing || 0) +
      (statusMap.out_for_delivery || 0);

    res.json({
      success: true,
      realtime: {
        updatedAt: now.toISOString(),
        today: {
          orders: today.orders,
          revenue: Math.round(todayRevenue),
          growth: (ordersGrowth > 0 ? '+' : '') + ordersGrowth + '%'
        },
        live: {
          pending: statusMap.pending || 0,
          confirmed: statusMap.confirmed || 0,
          preparing: statusMap.preparing || 0,
          outForDelivery: statusMap.out_for_delivery || 0,
          pendingPayment: statusMap.pending_payment || 0,
          cancelledToday: data.cancelledToday[0]?.count || 0
        },
        activeOrders: active,
        systemStatus: 'operational'
      }
    });

  } catch (err) {
    console.error('REALTIME STATS ERROR:', err);
    res.status(500).json({
      success: false,
      message: 'Live stats temporarily unavailable'
    });
  }
};


module.exports = {
  getOrderAnalytics,
  getRealtimeStats,
  validateAnalyticsQuery,
  validateRealtimeQuery
};