// src/controllers/deal/dealController.js
const Deal = require('../../models/deal/Deal');

const getAllDeals = async (req, res) => {
  try {
    const deals = await Deal.find()
      .populate('applicableItems', 'name image')
      .populate('applicableAreas', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: deals.length, deals });
  } catch (err) {
    console.error('getAllDeals error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getActiveDeals = async (req, res) => {
  try {
    const now = new Date();
    const deals = await Deal.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    })
      .populate('applicableItems', 'name image')
      .populate('applicableAreas', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: deals.length, deals });
  } catch (err) {
    console.error('getActiveDeals error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getDealById = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('applicableItems', 'name image')
      .populate('applicableAreas', 'name');
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });

    const now = new Date();
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && (!deal.isActive || deal.validFrom > now || deal.validUntil < now)) {
      return res.status(404).json({ success: false, message: 'Deal not available' });
    }

    res.json({ success: true, deal });
  } catch (err) {
    console.error('getDealById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createDeal = async (req, res) => {
  try {
    if (req.body.code) req.body.code = req.body.code.toUpperCase().trim();
    const deal = await Deal.create(req.body);
    await deal.populate('applicableItems', 'name image').populate('applicableAreas', 'name');
    res.status(201).json({ success: true, message: 'Deal created successfully', deal });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Deal code already exists' });
    console.error('createDeal error:', err);
    res.status(500).json({ success: false, message: 'Failed to create deal' });
  }
};

const updateDeal = async (req, res) => {
  try {
    if (req.body.code) req.body.code = req.body.code.toUpperCase().trim();
    const deal = await Deal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    await deal.populate('applicableItems', 'name image').populate('applicableAreas', 'name');
    res.json({ success: true, message: 'Deal updated successfully', deal });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Deal code already exists' });
    console.error('updateDeal error:', err);
    res.status(500).json({ success: false, message: 'Failed to update deal' });
  }
};

const deleteDeal = async (req, res) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    res.json({ success: true, message: 'Deal deleted successfully' });
  } catch (err) {
    console.error('deleteDeal error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const toggleDealStatus = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    deal.isActive = !deal.isActive;
    await deal.save();
    await deal.populate('applicableItems', 'name image').populate('applicableAreas', 'name');
    res.json({ success: true, message: `Deal ${deal.isActive ? 'activated' : 'deactivated'}`, deal });
  } catch (err) {
    console.error('toggleDealStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const validateAndApplyDeal = async (code, orderTotal, userId = null) => {
  if (!code || !orderTotal) return null;
  const normalizedCode = code.toUpperCase().trim();
  const now = new Date();

  const deal = await Deal.findOne({
    code: normalizedCode,
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  });

  if (!deal || orderTotal < deal.minOrderAmount) return null;

  if (userId && deal.usageLimitPerUser > 0) {
    const used = deal.usedBy.filter(u => u.user.toString() === userId).length;
    if (used >= deal.usageLimitPerUser) return null;
  }

  let discount = deal.discountType === 'percentage'
    ? (orderTotal * deal.discountValue) / 100
    : deal.discountValue;

  if (deal.maxDiscountAmount) discount = Math.min(discount, deal.maxDiscountAmount);

  return {
    dealId: deal._id,
    code: deal.code,
    title: deal.title,
    discountType: deal.discountType,
    discountValue: deal.discountValue,
    discount,
    finalAmount: Math.max(0, orderTotal - discount)
  };
};

const applyDeal = async (req, res) => {
  const { code, orderTotal } = req.body;
  const userId = req.user?._id;
  const result = await validateAndApplyDeal(code, orderTotal, userId);
  if (!result) return res.status(400).json({ success: false, message: 'Invalid or inapplicable promo code' });
  res.json({ success: true, deal: result });
};

const applyAndTrackDeal = async (code, orderTotal, userId) => {
  const result = await validateAndApplyDeal(code, orderTotal, userId);
  if (!result || !userId) return result;

  await Deal.findByIdAndUpdate(result.dealId, { $push: { usedBy: { user: userId } } });
  return result;
};

const getDealAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, dealId } = req.query;
    const Order = require('../../models/order/Order');

    const match = { 'appliedDeal.dealId': { $exists: true }, status: { $in: ['delivered', 'confirmed'] } };
    if (dealId) match['appliedDeal.dealId'] = dealId;

    const analytics = await Deal.aggregate([
      { $match: { isActive: true, validFrom: { $lte: new Date() }, validUntil: { $gte: new Date() } } },
      {
        $lookup: {
          from: 'orders',
          let: { dealId: '$_id' },
          pipeline: [{ $match: { $expr: { $eq: ['$appliedDeal.dealId', '$$dealId'] }, status: { $in: ['delivered', 'confirmed'] } } }],
          as: 'orders'
        }
      },
      {
        $project: {
          title: 1,
          code: 1,
          totalUses: { $size: '$usedBy' },
          successfulOrders: { $size: '$orders' },
          totalDiscountGiven: {
            $sum: {
              $map: {
                input: '$orders',
                in: '$$this.discountApplied'
              }
            }
          },
          revenueGenerated: { $sum: '$orders.finalAmount' }
        }
      },
      { $sort: { successfulOrders: -1 } }
    ]);

    const summary = {
      totalActiveDeals: analytics.length,
      totalOrdersWithDeals: analytics.reduce((s, d) => s + d.successfulOrders, 0),
      totalDiscountDistributed: analytics.reduce((s, d) => s + d.totalDiscountGiven, 0),
      topPerformingDeal: analytics[0] || null
    };

    res.json({ success: true, summary, analytics });
  } catch (err) {
    console.error('getDealAnalytics error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSingleDealStats = async (req, res) => {
  try {
    const { id } = req.params;
    const Order = require('../../models/order/Order');

    const deal = await Deal.findById(id).populate('usedBy.user', 'name phone');
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });

    const orders = await Order.find({
      'appliedDeal.dealId': id,
      status: { $in: ['delivered', 'confirmed'] }
    }).populate('customer', 'name phone');

    const stats = {
      deal: { title: deal.title, code: deal.code, discountType: deal.discountType, discountValue: deal.discountValue },
      totalUses: deal.usedBy.length,
      successfulRedemptions: orders.length,
      totalDiscount: orders.reduce((s, o) => s + (o.discountApplied || 0), 0),
      users: deal.usedBy.map(u => ({ name: u.user?.name || 'Deleted', phone: u.user?.phone || 'N/A', usedAt: u.usedAt }))
    };

    res.json({ success: true, stats });
  } catch (err) {
    console.error('getSingleDealStats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getDealUsageChart = async (req, res) => {
  try {
    const { dealId, period = 'daily', days = 30 } = req.query;
    const daysNum = Math.min(365, Math.max(1, parseInt(days)));
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - daysNum);
    const Order = require('../../models/order/Order');

    const format = period === 'weekly' ? '%Y-W%V' : period === 'monthly' ? '%Y-%m' : '%Y-%m-%d';

    const match = {
      'appliedDeal.dealId': { $exists: true },
      status: { $in: ['delivered', 'confirmed'] },
      placedAt: { $gte: cutoff }
    };
    if (dealId) match['appliedDeal.dealId'] = dealId;

    const data = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format, date: '$placedAt' } },
            dealId: '$appliedDeal.dealId'
          },
          uses: { $sum: 1 },
          discount: { $sum: '$discountApplied' }
        }
      },
      {
        $lookup: { from: 'deals', localField: '_id.dealId', foreignField: '_id', as: 'deal' }
      },
      { $unwind: { path: '$deal', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          date: '$_id.date',
          code: { $ifNull: ['$deal.code', 'Unknown'] },
          uses: 1,
          discount: 1
        }
      },
      { $sort: { date: 1 } }
    ]);

    res.json({ success: true, chartType: 'line', title: dealId ? 'Deal Usage Trend' : 'All Deals Trend', data });
  } catch (err) {
    console.error('getDealUsageChart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getTopDealsChart = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = Math.min(20, Math.max(1, parseInt(limit)));
    const Order = require('../../models/order/Order');

    const data = await Order.aggregate([
      {
        $match: {
          'appliedDeal.dealId': { $exists: true },
          status: { $in: ['delivered', 'confirmed'] }
        }
      },
      {
        $group: {
          _id: '$appliedDeal.dealId',
          uses: { $sum: 1 },
          discount: { $sum: '$discountApplied' }
        }
      },
      { $lookup: { from: 'deals', localField: '_id', foreignField: '_id', as: 'deal' } },
      { $unwind: { path: '$deal', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          code: { $ifNull: ['$deal.code', 'DELETED'] },
          title: { $ifNull: ['$deal.title', 'Deleted Deal'] },
          uses: 1,
          discount: 1
        }
      },
      { $sort: { uses: -1 } },
      { $limit: limitNum }
    ]);

    res.json({ success: true, chartType: 'bar', title: `Top ${limitNum} Deals`, data });
  } catch (err) {
    console.error('getTopDealsChart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getDiscountImpactChart = async (req, res) => {
  try {
    const Order = require('../../models/order/Order');

    const data = await Order.aggregate([
      {
        $match: {
          'appliedDeal.dealId': { $exists: true },
          status: { $in: ['delivered', 'confirmed'] }
        }
      },
      {
        $group: {
          _id: '$appliedDeal.dealId',
          code: { $first: '$appliedDeal.code' },
          avgDiscount: { $avg: '$discountApplied' },
          avgOrderValue: { $avg: '$finalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $lookup: { from: 'deals', localField: '_id', foreignField: '_id', as: 'deal' } },
      { $unwind: { path: '$deal', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          code: { $ifNull: ['$code', '$deal.code'] },
          title: { $ifNull: ['$deal.title', 'Unknown'] },
          avgDiscount: 1,
          avgOrderValue: 1,
          orders: 1
        }
      }
    ]);

    res.json({
      success: true,
      chartType: 'scatter',
      title: 'Discount vs Revenue Impact',
      xAxis: 'Avg Discount',
      yAxis: 'Avg Order Value',
      sizeBy: 'Orders',
      data
    });
  } catch (err) {
    console.error('getDiscountImpactChart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllDeals,
  getActiveDeals,
  getDealById,
  createDeal,
  updateDeal,
  deleteDeal,
  toggleDealStatus,
  applyDeal,
  validateAndApplyDeal,
  applyAndTrackDeal,
  getDealAnalytics,
  getSingleDealStats,
  getDealUsageChart,
  getTopDealsChart,
  getDiscountImpactChart
};