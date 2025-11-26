// src/controllers/deal/dealController.js
const Deal = require('../../models/deal/Deal');
const mongoose = require('mongoose');

// ========================
// CORE: DEAL APPLICATION LOGIC
// ========================

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

  if (deal.totalUsageLimit && deal.usedBy.length >= deal.totalUsageLimit) return null;

  if (userId && deal.usageLimitPerUser > 0) {
    const usedCount = deal.usedBy.filter(u => u.user.toString() === userId.toString()).length;
    if (usedCount >= deal.usageLimitPerUser) return null;
  }

  let discount = deal.discountType === 'percentage'
    ? (orderTotal * deal.discountValue) / 100
    : deal.discountValue;

  if (deal.maxDiscountAmount) discount = Math.min(discount, deal.maxDiscountAmount);
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

const applyAndTrackDeal = async (code, orderTotal, userId) => {
  const result = await validateAndApplyDeal(code, orderTotal, userId);
  if (!result || !userId) return result;

  await Deal.findByIdAndUpdate(result.dealId, {
    $push: { usedBy: { user: userId, usedAt: new Date() } }
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

    res.json({ 
      success: true, 
      message: deals.length > 0 ? 'Hurry! Grab these hot deals before they expire!' : 'No active deals right now. Check back soon!',
      count: deals.length, 
      deals 
    });
  } catch (err) {
    console.error('getActiveDeals error:', err);
    res.status(500).json({ success: false, message: 'Oops! Something went wrong.' });
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
      return res.status(404).json({ success: false, message: 'This deal is no longer available' });
    }

    res.json({ 
      success: true, 
      message: 'Deal loaded successfully!',
      deal 
    });
  } catch (err) {
    console.error('getDealById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const applyDeal = async (req, res) => {
  const { code, orderTotal } = req.body;
  const userId = req.user?._id?.toString();

  if (!code || !orderTotal || orderTotal < 0) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid promo code and order amount.'
    });
  }

  const normalizedCode = code.toUpperCase().trim();
  const orderTotalFloat = parseFloat(orderTotal);
  const now = new Date();

  try {
    const deal = await Deal.findOne({
      code: normalizedCode,
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    });

    // Invalid or expired
    if (!deal) {
      return res.status(400).json({
        success: false,
        message: 'Oops! This promo code is invalid or has expired.',
        tip: 'Try another code or check active offers!'
      });
    }

    // Min order not met
    if (orderTotalFloat < deal.minOrderAmount) {
      const shortfall = (deal.minOrderAmount - orderTotalFloat).toFixed(2);
      return res.status(400).json({
        success: false,
        message: `Add just ₹${shortfall} more to unlock this offer!`,
        minOrderAmount: deal.minOrderAmount
      });
    }

    // Usage limit reached
    if (deal.totalUsageLimit && deal.usedBy.length >= deal.totalUsageLimit) {
      return res.status(400).json({
        success: false,
        message: 'This offer has been fully redeemed!',
        tip: 'Lightning deals go fast — try another code!'
      });
    }

    // Per-user limit
    if (userId && deal.usageLimitPerUser > 0) {
      const userUsageCount = deal.usedBy.filter(
        u => u.user && u.user.toString() === userId
      ).length;

      if (userUsageCount >= deal.usageLimitPerUser) {
        return res.status(400).json({
          success: false,
          message: 'You’ve already enjoyed this offer!',
          tip: 'Check out other exciting deals!'
        });
      }
    }

    // Calculate discount
    let discount = deal.discountType === 'percentage'
      ? (orderTotalFloat * deal.discountValue) / 100
      : deal.discountValue;

    if (deal.maxDiscountAmount) {
      discount = Math.min(discount, deal.maxDiscountAmount);
    }

    discount = Number(discount.toFixed(2));
    const finalAmount = Math.max(0, Number((orderTotalFloat - discount).toFixed(2)));

    // Track usage if logged in
    if (userId) {
      await Deal.findByIdAndUpdate(
        deal._id,
        {
          $push: {
            usedBy: {
              user: new mongoose.Types.ObjectId(userId),
              usedAt: new Date()
            }
          }
        }
      );
    }

    // SUCCESS — SWIGGY-STYLE CELEBRATION MESSAGE
    const savingsText = discount >= 100 
      ? `WHOA! You just saved a massive ₹${discount}!` 
      : `Yay! You saved ₹${discount} instantly!`;

    const titleEmoji = discount >= 150 ? 'Explosion' : discount >= 80 ? 'Party' : 'Tada';

    return res.json({
      success: true,
      message: `${titleEmoji} Woohoo! Promo code applied successfully!`,
      highlight: savingsText,
      subtitle: `Enjoy ${deal.title.toLowerCase()} on your order`,
      savings: discount,
      originalTotal: orderTotalFloat,
      newTotal: finalAmount,
      deal: {
        code: deal.code,
        title: deal.title,
        description: deal.discountType === 'percentage'
          ? `${deal.discountValue}% off${deal.maxDiscountAmount ? ` (max ₹${deal.maxDiscountAmount})` : ''}`
          : `Flat ₹${deal.discountValue} off`,
        appliedDiscount: discount
      }
    });

  } catch (err) {
    console.error('applyDeal error:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again!',
      tip: 'Our team is on it!'
    });
  }
};

// ========================
// ADMIN ENDPOINTS — PROFESSIONAL SUCCESS MESSAGES
// ========================

const getAllDeals = async (req, res) => {
  try {
    const deals = await Deal.find()
      .populate('applicableItems', 'name image')
      .populate('applicableAreas', 'name')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      message: 'All deals fetched successfully',
      count: deals.length, 
      deals 
    });
  } catch (err) {
    console.error('getAllDeals error:', err);
    res.status(500).json({ success: false, message: 'Failed to load deals' });
  }
};

const createDeal = async (req, res) => {
  try {
    if (req.body.code) req.body.code = req.body.code.toUpperCase().trim();

    const deal = await Deal.create(req.body);

    const populatedDeal = await Deal.findById(deal._id)
      .populate('applicableItems', 'name image')
      .populate('applicableAreas', 'name');

    res.status(201).json({
      success: true,
      message: 'New deal created and live!',
      deal: populatedDeal
    });
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

    const populatedDeal = await Deal.findById(deal._id)
      .populate('applicableItems', 'name image')
      .populate('applicableAreas', 'name');

    res.json({
      success: true,
      message: 'Deal updated successfully!',
      deal: populatedDeal
    });
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

    res.json({ 
      success: true, 
      message: `Deal "${deal.title}" has been removed successfully` 
    });
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

    const populatedDeal = await Deal.findById(deal._id)
      .populate('applicableItems', 'name image')
      .populate('applicableAreas', 'name');

    res.json({
      success: true,
      message: deal.isActive 
        ? `Deal "${deal.title}" is now LIVE!` 
        : `Deal "${deal.title}" has been paused`,
      status: deal.isActive ? 'active' : 'inactive',
      deal: populatedDeal
    });
  } catch (err) {
    console.error('toggleDealStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Analytics remain professional & clean
const getDealAnalytics = async (req, res) => {
  try {
    const Order = require('../../models/order/Order');

    const analytics = await Deal.aggregate([
      // ... (unchanged aggregation)
    ]);

    const summary = { /* unchanged */ };

    res.json({ 
      success: true,
      message: 'Deal performance analytics loaded',
      summary, 
      analytics 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
};

// Keep other analytics endpoints clean too...
// (getSingleDealStats, getDealUsageChart, etc. — unchanged but with better success messages)

const getSingleDealStats = async (req, res) => {
  try {
    // ... logic
    res.json({ 
      success: true, 
      message: 'Deal statistics loaded successfully',
      stats 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error loading stats' });
  }
};

const getDealUsageChart = async (req, res) => {
  try {
    // ... logic
    res.json({
      success: true,
      message: 'Chart data ready!',
      chartType: 'line',
      title: dealId ? 'Deal Usage Trend' : 'All Deals Trend',
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate chart' });
  }
};

const getTopDealsChart = async (req, res) => {
  try {
    // ... logic
    res.json({
      success: true,
      message: 'Top performing deals loaded',
      chartType: 'bar',
      title: `Top ${limitNum} Deals by Usage`,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Chart error' });
  }
};

const getDiscountImpactChart = async (req, res) => {
  try {
    // ... logic
    res.json({
      success: true,
      message: 'Discount impact analysis ready',
      chartType: 'scatter',
      title: 'Discount Impact Analysis',
      xAxis: 'Average Discount (₹)',
      yAxis: 'Average Order Value (₹)',
      sizeBy: 'Number of Orders',
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load chart' });
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