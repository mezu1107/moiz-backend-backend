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
    console.error('getAreas error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const checkArea = async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });

  try {
    const point = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };
    const area = await Area.findOne({
      polygon: { $geoIntersects: { $geometry: point } },
      isActive: true
    }).select('name city center');

    if (!area) return res.json({ success: true, inService: false });

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
    console.error('checkArea error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addArea = async (req, res) => {
  const { name, city = 'Lahore', polygon, center } = req.body;
  try {
    const area = new Area({ name, city, polygon, center, isActive: true });
    await area.save();
    res.status(201).json({ success: true, area });
  } catch (err) {
    console.error('addArea error:', err);
    res.status(500).json({ success: false, message: 'Failed to create area' });
  }
};

const setDeliveryZone = async (req, res) => {
  const { areaId, deliveryFee = 149, minOrderAmount = 0, estimatedTime = '35-50 min' } = req.body;
  if (!areaId) return res.status(400).json({ success: false, message: 'areaId is required' });

  try {
    const zone = await DeliveryZone.findOneAndUpdate(
      { area: areaId },
      { deliveryFee, minOrderAmount, estimatedTime, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('area', 'name city');

    res.json({ success: true, message: 'Delivery zone updated', zone });
  } catch (err) {
    console.error('setDeliveryZone error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAreas, checkArea, addArea, setDeliveryZone };