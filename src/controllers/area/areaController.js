// src/controllers/area/areaController.js
const Area = require('../../models/area/Area');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone'); // ← ADD THIS LINE
const haversineDistance = require('../../utils/haversine');
const { getAreaAndZoneByCoords } = require('../../utils/areaCache');
// GET /api/areas
const getAreas = async (req, res) => {
  try {
    const areas = await Area.find({ isActive: true })
      .select('name city center polygon isActive') // ← add polygon if needed later
      .sort({ name: 1 })
      .lean();

    if (!areas.length) {
      return res.json({
        success: true,
        message: 'No active delivery areas found',
        areas: [],
      });
    }

    // Bulk fetch active delivery zones
    const areaIds = areas.map(a => a._id);
    const zones = await DeliveryZone.find({
      area: { $in: areaIds },
      isActive: true,
    }).lean();

    const zoneMap = zones.reduce((acc, z) => {
      acc[z.area.toString()] = z;
      return acc;
    }, {});

    // Transform for frontend (Leaflet-friendly + delivery info)
    const result = areas.map(area => {
      const zone = zoneMap[area._id.toString()];

      return {
        _id: area._id.toString(),
        name: area.name,
        city: area.city,
        // ← IMPORTANT: Add centerLatLng virtual (same as admin endpoints)
        centerLatLng: area.center
          ? {
              lat: Number(area.center.coordinates[1].toFixed(6)),
              lng: Number(area.center.coordinates[0].toFixed(6)),
            }
          : null,
        // Optional: include full center GeoJSON if some components need it
        center: area.center,
        // Delivery zone summary (already good, but enhanced with freeDeliveryAbove)
        deliveryZone: zone
          ? {
              deliveryFee: zone.deliveryFee,
              minOrderAmount: zone.minOrderAmount,
              estimatedTime: zone.estimatedTime,
              isActive: zone.isActive,
              freeDeliveryAbove: zone.freeDeliveryAbove, // ← ADD THIS!
            }
          : null,
        hasDeliveryZone: !!zone,
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
      message: 'Failed to fetch delivery areas',
    });
  }
};

// src/controllers/area/areaController.js → checkArea (GET /api/areas/check)
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

    // Reject outside Pakistan
    if (latNum < 23.5 || latNum > 37.5 || lngNum < 60.0 || lngNum > 78.0) {
      return res.json({
        success: true,
        inService: false,
        hasDeliveryZone: false,
        message: 'Location outside Pakistan',
      });
    }

    const result = await getAreaAndZoneByCoords(lngNum, latNum);

    if (!result || !result.area) {
      return res.json({
        success: true,
        inService: false,
        hasDeliveryZone: false,
        message: 'Sorry, we do not serve this location yet',
      });
    }

    const { area, zone } = result;
    const hasDelivery = !!zone?.isActive;

    // No active delivery zone
    if (!hasDelivery) {
      return res.json({
        success: true,
        inService: true,
        hasDeliveryZone: false,
        area: { _id: area._id.toString(), name: area.name, city: area.city },
        message: 'We are in your area! Delivery coming soon',
      });
    }

    // === Same logic as /delivery/calculate (without orderAmount) ===
    const centerLat = area.center.coordinates[1];
    const centerLng = area.center.coordinates[0];

    const distanceKmRaw = haversineDistance(
      { lat: latNum, lng: lngNum },
      { lat: centerLat, lng: centerLng }
    );

    const distanceKm = Number(distanceKmRaw.toFixed(1)); // safe number

    let deliveryFee = 0;
    let reason = '';
    let deliverable = true;

    if (zone.feeStructure === 'distance') {
      if (distanceKm > zone.maxDistanceKm) {
        deliverable = false;
        reason = `Too far (${distanceKm} km). Max: ${zone.maxDistanceKm} km`;
      } else {
        deliveryFee = zone.baseFee + Math.round(distanceKmRaw * zone.distanceFeePerKm);
reason = `Base fee Rs.${zone.baseFee} + ${distanceKm} km × Rs.${zone.distanceFeePerKm}/km`;
      }
    } else {
      deliveryFee = zone.deliveryFee;
      reason = 'Flat delivery fee';
    }

    // Free delivery not applied here (needs orderAmount) → handled in frontend or /calculate

    res.json({
      success: true,
      inService: true,
      deliverable,
      area: { _id: area._id.toString(), name: area.name, city: area.city },
      distanceKm: distanceKm.toString(),
      deliveryFee,
      reason,
      minOrderAmount: zone.minOrderAmount,
      estimatedTime: zone.estimatedTime,
      freeDeliveryAbove: zone.freeDeliveryAbove,
      message: deliverable
        ? `Delivery available! ${reason}`
        : reason,
    });
  } catch (err) {
    console.error('checkArea error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};



module.exports = { getAreas, checkArea };
