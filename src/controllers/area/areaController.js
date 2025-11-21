// src/controllers/area/areaController.js
const Area = require('../../models/area/Area');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');

const getAreas = async (req, res) => {
  try {
    const areas = await Area.find({ isActive: true })
      .select('name city center')
      .sort({ name: 1 });
    res.json({ success: true, areas });
  } catch (err) {
    console.error('getAreas:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const checkArea = async (req, res) => {
  const { lat, lng } = req.query;

  try {
    const point = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };
    const area = await Area.findOne({
      isActive: true,
      polygon: { $geoIntersects: { $geometry: point } }
    }).select('name city center');

    if (!area) {
      return res.json({ success: true, inService: false, message: 'Out of service area' });
    }

    const zone = await DeliveryZone.findOne({ area: area._id });

    res.json({
      success: true,
      inService: true,
      area: { _id: area._id, name: area.name, city: area.city, center: area.center },
      delivery: zone ? {
        fee: zone.deliveryFee,
        minOrder: zone.minOrderAmount,
        estimatedTime: zone.estimatedTime
      } : { fee: 149, minOrder: 0, estimatedTime: '35-50 min' }
    });
  } catch (err) {
    console.error('checkArea:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addArea = async (req, res) => {
  try {
    const area = await Area.create(req.body);
    res.status(201).json({ success: true, area });
  } catch (err) {
    console.error('addArea:', err);
    res.status(400).json({ success: false, message: err.message || 'Invalid area data' });
  }
};

const setDeliveryZone = async (req, res) => {
  const { areaId, deliveryFee = 149, minOrderAmount = 0, estimatedTime = '35-50 min' } = req.body;

  try {
    const zone = await DeliveryZone.findOneAndUpdate(
      { area: areaId },
      { deliveryFee, minOrderAmount, estimatedTime, isActive: true },
      { upsert: true, new: true }
    ).populate('area', 'name');

    res.json({ success: true, zone });
  } catch (err) {
    console.error('setDeliveryZone:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAreas, checkArea, addArea, setDeliveryZone };