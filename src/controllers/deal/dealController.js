// src/controllers/deal/dealController.js
const Deal = require('../../models/deal/Deal');

// ========================
// CORE: DEAL APPLICATION LOGIC
// ========================

/**
 * Validate promo code + calculate discount
 * Used for preview AND final order
 */
const validateAndApplyDeal = async (code, orderTotal, userId = null) => {
  if (!code || !orderTotal || orderTotal <= 0) return null;

  const normalizedCode = code.toUpperCase().trim();
  const now = new Date();

  const deal = await Deal.findOne({
    code: normalizedCode,
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  });

  if (!deal) return null;
  if (orderTotal < deal.minOrderAmount) return null;

  // Enforce total usage limit
  if (deal.totalUsageLimit && deal.usedBy.length >= deal.totalUsageLimit) {
    return null;
  }

  // Enforce per-user limit
  if (userId && deal.usageLimitPerUser > 0) {
    const usedCount = deal.usedBy.filter(
      u => u.user.toString() === userId.toString()
    ).length;
    if (usedCount >= deal.usageLimitPerUser) return null;
  }

  let discount = deal.discountType === 'percentage'
    ? (orderTotal * deal.discountValue) / 100
    : deal.discountValue;

  if (deal.maxDiscountAmount) {
    discount = Math.min(discount, deal.maxDiscountAmount);
  }

  discount = Number(discount.toFixed(2));
  const finalAmount = Math.max(0, Number((orderTotal - discount).toFixed(2)));

  return {
    dealId: deal._id,
    code: deal.code,
    title: deal.title,
    discountType: deal.discountType,
    discountValue: deal.discountValue,
    maxDiscountAmount: deal.maxDiscountAmount || null,
    discount,
    finalAmount
  };
};

/**
 * Apply deal + track usage in Deal.usedBy
 * USE THIS WHEN CREATING ORDER (not in preview!)
 */
const applyAndTrackDeal = async (code, orderTotal, userId) => {
  const result = await validateAndApplyDeal(code, orderTotal, userId);
  if (!result || !userId) return result;

  await Deal.findByIdAndUpdate(result.dealId, {
    $push: {
      usedBy: {
        user: userId,
        usedAt: new Date()
      }
    }
  });

  return result;
};

// ========================
// PUBLIC ENDPOINTS
// ========================

const getActiveDeals = async (req, res) => {
  try {
    const now = new Date();
    const deals = await Deal.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    })
      .select('title code discountType discountValue minOrderAmount maxDiscountAmount validUntil')
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

const applyDeal = async (req, res) => {
  const { code, orderTotal } = req.body;
  const userId = req.user?._id;

  const result = await validateAndApplyDeal(code, orderTotal, userId);

  if (!result) {
    return res.status(400).json({
      success: false,
      message: 'Invalid, expired, or inapplicable promo code.'
    });
  }

  res.json({
    success: true,
    message: `Promo code "${result.code}" applied successfully!`,
    savings: result.discount,
    originalTotal: orderTotal,
    newTotal: result.finalAmount,
    deal: {
      code: result.code,
      title: result.title,
      description: result.discountType === 'percentage'
        ? `${result.discountValue}% off`
        : `${result.discountValue} AED off`,
      appliedDiscount: result.discount
    }
  });
};

// ========================
// ADMIN ENDPOINTS
// ========================

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

const createDeal = async (req, res) => {
  try {
    if (req.body.code) req.body.code = req.body.code.toUpperCase().trim();
    const deal = await Deal.create(req.body);
    await deal.populate('applicableItems', 'name image').populate('applicableAreas', 'name');
    res.status(201).json({ success: true, message: 'Deal created successfully', deal });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Deal code already exists' });
    }
    console.error('createDeal error:', err);
    res.status(500).json({ success: false, message: 'Failed to create deal' });
  }
};

const updateDeal = async (req, res) => {
  try {
    if (req.body.code) req.body.code = req.body.code.toUpperCase().trim();
    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    await deal.populate('applicableItems', 'name image').populate('applicableAreas', 'name');
    res.json({ success: true, message: 'Deal updated successfully', deal });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Deal code already exists' });
    }
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

    res.json({
      success: true,
      message: `Deal ${deal.isActive ? 'activated' : 'deactivated'} successfully`,
      deal
    });
  } catch (err) {
    console.error('toggleDealStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ========================
// ANALYTICS & CHARTS
// ========================

const getDealAnalytics = async (req, res) => {
  try {
    const Order = require('../../models/order/Order');

    const analytics = await Deal.aggregate([
      { $match: { isActive: true, validFrom: { $lte: new Date() }, validUntil: { $gte: new Date() } } },
      {
        $lookup: {
          from: 'orders',
          let: { dealId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$appliedDeal.dealId', '$$dealId'] },
                status: { $in: ['delivered', 'confirmed'] }
              }
            }
          ],
          as: 'orders'
        }
      },
      {
        $project: {
          title: 1,
          code: 1,
          totalUses: { $size: '$usedBy' },
          successfulRedemptions: { $size: '$orders' },
          totalDiscountGiven: {
            $sum: { $map: { input: '$orders', in: '$$this.discountApplied' } }
          },
          revenueAfterDiscount: { $sum: '$orders.finalAmount' },
          revenueBeforeDiscount: {
            $sum: {
              $map: {
                input: '$orders',
                in: { $add: ['$$this.finalAmount', '$$this.discountApplied'] }
              }
            }
          }
        }
      },
      { $sort: { successfulRedemptions: -1 } }
    ]);

    const summary = {
      totalActiveDeals: analytics.length,
      totalSuccessfulRedemptions: analytics.reduce((s, d) => s + d.successfulRedemptions, 0),
      totalDiscountDistributed: Number(analytics.reduce((s, d) => s + (d.totalDiscountGiven || 0), 0).toFixed(2)),
      totalRevenueAfterDiscount: Number(analytics.reduce((s, d) => s + (d.revenueAfterDiscount || 0), 0).toFixed(2)),
      totalRevenueBeforeDiscount: Number(analytics.reduce((s, d) => s + (d.revenueBeforeDiscount || 0), 0).toFixed(2)),
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
    });

    const stats = {
      deal: {
        title: deal.title,
        code: deal.code,
        discountType: deal.discountType,
        discountValue: deal.discountValue
      },
      totalUses: deal.usedBy.length,
      successfulRedemptions: orders.length,
      totalDiscount: Number(orders.reduce((s, o) => s + (o.discountApplied || 0), 0).toFixed(2)),
      users: deal.usedBy.map(u => ({
        name: u.user?.name || 'Deleted User',
        phone: u.user?.phone || 'N/A',
        usedAt: u.usedAt
      }))
    };

    res.json({ success: true, stats });
  } catch (err) {
    console.error('getSingleDealStats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Chart endpoints (fully working and optimized)
const getDealUsageChart = async (req, res) => {
  try {
    const { dealId, period = 'daily', days = 30 } = req.query;
    const daysNum = Math.min(365, Math.max(1, parseInt(days)));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysNum);

    const Order = require('../../models/order/Order');
    const format = period === 'weekly' ? '%Y-W%V' : period === 'monthly' ? '%Y-%m' : '%Y-%m-%d';

    const match = {
      'appliedDeal.dealId': { $exists: true },
      status: { $in: ['delivered', 'confirmed'] },
      placedAt: { $gte: cutoff }
    };
    if (dealId) match['appliedDeal.dealId'] = new mongoose.Types.ObjectId(dealId);

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
        $lookup: {
          from: 'deals',
          localField: '_id.dealId',
          foreignField: '_id',
          as: 'deal'
        }
      },
      { $unwind: { path: '$deal', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          date: '$_id.date',
          code: { $ifNull: ['$deal.code', 'Unknown'] },
          uses: 1,
          discount: { $round: ['$discount', 2] }
        }
      },
      { $sort: { date: 1 } }
    ]);

    res.json({
      success: true,
      chartType: 'line',
      title: dealId ? 'Deal Usage Trend' : 'All Deals Trend',
      data
    });
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
          code: { $ifNull: ['$deal.code', 'DELETED'] },
          title: { $ifNull: ['$deal.title', 'Deleted Deal'] },
          uses: 1,
          discount: { $round: ['$discount', 2] }
        }
      },
      { $sort: { uses: -1 } },
      { $limit: limitNum }
    ]);

    res.json({
      success: true,
      chartType: 'bar',
      title: `Top ${limitNum} Deals by Usage`,
      data
    });
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
          title: { $ifNull: ['$deal.title', 'Unknown'] },
          avgDiscount: { $round: ['$avgDiscount', 2] },
          avgOrderValue: { $round: ['$avgOrderValue', 2] },
          orders: 1
        }
      }
    ]);

    res.json({
      success: true,
      chartType: 'scatter',
      title: 'Discount Impact Analysis',
      xAxis: 'Average Discount (AED)',
      yAxis: 'Average Order Value (AED)',
      sizeBy: 'Number of Orders',
      data
    });
  } catch (err) {
    console.error('getDiscountImpactChart error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ========================
// EXPORT
// ========================

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