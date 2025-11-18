// src/controllers/deal/dealController.js
const Deal = require('../../models/deal/Deal');

const getActiveDeals = async (req, res) => {
  try {
    const now = new Date();
    const deals = await Deal.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    }).sort({ createdAt: -1 });

    res.json(deals);
  } catch (err) {
    console.error('getActiveDeals error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const createDeal = async (req, res) => {
  try {
    const deal = new Deal(req.body);
    await deal.save();
    res.status(201).json(deal);
  } catch (err) {
    console.error('createDeal error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const deal = await Deal.findByIdAndUpdate(id, req.body, { new: true });
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    res.json(deal);
  } catch (err) {
    console.error('updateDeal error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const deal = await Deal.findByIdAndDelete(id);
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    res.json({ message: 'Deal deleted successfully' });
  } catch (err) {
    console.error('deleteDeal error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// YE LINE SAB SE ZAROORI HAI — BINA ISKE SAB FAIL!
module.exports = {
  getActiveDeals,
  createDeal,
  updateDeal,
  deleteDeal
};