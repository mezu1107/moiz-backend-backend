// src/controllers/area/areaController.js
const Area = require('../../models/area/Area');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');
const { getAreaByCoords } = require('../../utils/areaCache');

// GET /api/areas
const getAreas = async (req, res) => {
  try {
    const areas = await Area.find({ isActive: true })
      .select('name city center')
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      areas: areas.map(a => ({
        ...a,
        center: a.centerLatLng // ensure client uses correct virtual
      }))
    });
  } catch (err) {
    console.error('getAreas error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/areas/check?lat=&lng=
const checkArea = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    // MongoDB order: [lng, lat]
    const area = await getAreaByCoords(lngNum, latNum);

    if (!area) {
      return res.json({
        success: true,
        inService: false,
        message: 'Location outside service zone'
      });
    }

    const zone = await DeliveryZone.findOne({
      area: area._id,
      isActive: true
    })
      .select('deliveryFee minOrderAmount estimatedTime')
      .lean();

    res.json({
      success: true,
      inService: !!zone,
      area: {
        _id: area._id,
        name: area.name,
        city: area.city,
        center: area.centerLatLng
      },
      delivery: zone
        ? {
            fee: zone.deliveryFee,
            minOrder: zone.minOrderAmount,
            estimatedTime: zone.estimatedTime
          }
        : null,
      message: zone
        ? 'Delivery available!'
        : 'Area mapped but delivery paused'
    });
  } catch (err) {
    console.error('checkArea error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAreas,
  checkArea
};
