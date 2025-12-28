// src/controllers/area/areaController.js
const Area = require('../../models/area/Area');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone'); // ← ADD THIS LINE

// GET /api/areas
const getAreas = async (req, res) => {
  try {
    const areas = await Area.find({ isActive: true })
      .select('name city center')
      .sort({ name: 1 })
      .lean();

    if (!areas.length) {
      return res.json({ success: true, areas: [] });
    }

    // Get all relevant delivery zones in one query
    const areaIds = areas.map(a => a._id);
    const zones = await DeliveryZone.find({ area: { $in: areaIds }, isActive: true }).lean();

    const zoneMap = zones.reduce((acc, z) => {
      acc[z.area.toString()] = z;
      return acc;
    }, {});

    const result = areas.map(area => {
      const zone = zoneMap[area._id.toString()];
      
      return {
        _id: area._id,
        name: area.name,
        city: area.city,
        center: area.center,
        deliveryZone: zone ? {
          deliveryFee: zone.deliveryFee,
          minOrderAmount: zone.minOrderAmount,
          estimatedTime: zone.estimatedTime,
          isActive: zone.isActive
        } : null,
        hasDeliveryZone: !!zone
      };
    });

    res.json({
      success: true,
      areas: result,
    });
  } catch (err) {
    console.error('getAreas error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching areas',
    });
  }
};

// ... rest of the file remains the same ...
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
