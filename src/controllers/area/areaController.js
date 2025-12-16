// src/controllers/area/areaController.js
const Area = require('../../models/area/Area');

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
        _id: a._id,
        name: a.name,
        city: a.city,
        center: a.center, // ✅ FIXED (lat/lng)
      })),
    });
  } catch (err) {
    console.error('getAreas error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// GET /api/areas/check?lat=...&lng=...
const checkArea = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates: lat and lng must be numbers',
      });
    }

    // Reject if outside Pakistan
    if (
      latNum < 23.5 ||
      latNum > 37.5 ||
      lngNum < 60.0 ||
      lngNum > 78.0
    ) {
      return res.json({
        success: true,
        inService: false,
        hasDeliveryZone: false,
        message: 'Location outside Pakistan',
      });
    }

    // Cache + DB lookup
    const result = await getAreaAndZoneByCoords(lngNum, latNum);

    if (!result || !result.area) {
      return res.json({
        success: true,
        inService: false,
        hasDeliveryZone: false,
        message: 'Sorry, we do not serve this location yet',
      });
    }

    const { area, zone, hasDelivery } = result;

    return res.json({
      success: true,
      inService: true,
      hasDeliveryZone: hasDelivery,
      area,
      delivery: hasDelivery
        ? {
            fee: zone.deliveryFee,
            minOrder: zone.minOrderAmount,
            estimatedTime: zone.estimatedTime,
          }
        : null,
      message: hasDelivery
        ? `Delivery available! Fee: Rs.${zone.deliveryFee}`
        : 'We are in your area! Delivery coming soon',
    });
  } catch (err) {
    console.error('checkArea error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Import AFTER functions (avoid circular dependency)
const { getAreaAndZoneByCoords } = require('../../utils/areaCache');

module.exports = { getAreas, checkArea };
