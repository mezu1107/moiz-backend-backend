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

const checkArea = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    // === 1. Validate coordinates ===
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates: lat and lng must be numbers',
      });
    }

    // Optional: Reject outside Pakistan early (saves query time)
    if (latNum < 23.5 || latNum > 37.5 || lngNum < 60.0 || lngNum > 78.0) {
      return res.json({
        success: true,
        inService: false,
        hasDeliveryZone: false,
        message: 'Location outside Pakistan',
      });
    }

    // === 2. GeoJSON Point: MongoDB expects [longitude, latitude] ===
    const point = {
      type: 'Point',
      coordinates: [lngNum, latNum], // [lng, lat] — correct order!
    };

    // === 3. Find ACTIVE area that contains this point ===
    const area = await Area.findOne({
      isActive: true,
      polygon: {
        $geoIntersects: {
          $geometry: point,
        },
      },
    })
      .select('name city center _id')
      .lean(); // lean() = faster + virtuals still work

    // Not inside any active area
    if (!area) {
      return res.json({
        success: true,
        inService: false,
        hasDeliveryZone: false,
        message: 'Sorry, we do not serve this location yet',
      });
    }

    // === 4. Check if delivery is ACTIVE in this area ===
    const zone = await DeliveryZone.findOne({
      area: area._id,
      isActive: true,
    })
      .select('deliveryFee minOrderAmount estimatedTime')
      .lean();

    const hasDelivery = !!zone;

    // === 5. Final Response ===
    return res.json({
      success: true,
      inService: true,                    // Area is mapped + active → show menu
      hasDeliveryZone: hasDelivery,       // Can actually deliver now?
      area: {
        _id: area._id,
        name: area.name,
        city: area.city,
        center: area.centerLatLng,        // virtual: { lat, lng }
      },
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
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

module.exports = {
  getAreas,
  checkArea
};
