// src/controllers/admin/adminController.js
// FINAL PRODUCTION — DECEMBER 15, 2025 — FULLY OPTIMIZED & CACHE-AWARE

const Area = require('../../models/area/Area');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');
const mongoose = require('mongoose');
const { clearAreaCache } = require('../../utils/areaCache');

// Helper: Convert { lat, lng } → [lng, lat] GeoJSON Point
const toMongoPoint = (center) => {
  if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number') {
    throw new Error('Center must be { lat: number, lng: number }');
  }
  const { lat, lng } = center;
  if (lat < 23.5 || lat > 37.5 || lng < 60.0 || lng > 78.0) {
    throw new Error('Coordinates outside Pakistan bounds');
  }
  return { type: 'Point', coordinates: [lng, lat] };
};

// Helper: Convert Leaflet polygon → MongoDB GeoJSON Polygon (auto-closes rings)
const toMongoPolygon = (polygon) => {
  if (!polygon || polygon.type !== 'Polygon') {
    throw new Error('Invalid GeoJSON Polygon');
  }

  return {
    type: 'Polygon',
    coordinates: polygon.coordinates,
  };
};


// ==================== ADD AREA ====================
const addArea = async (req, res) => {
  try {
    const { name, city = 'Rawalpindi', center, polygon } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Area name is required' });
    }
    if (!center || !polygon) {
      return res.status(400).json({ success: false, message: 'Center and polygon are required' });
    }

    const mongoCenter = toMongoPoint(center);
const mongoPolygon = req.body.mongoPolygon;

    const area = await Area.create({
      name: name.trim(),
      city: city.trim().toUpperCase(),
      center: mongoCenter,
      polygon: mongoPolygon,
      isActive: false,
    });

    res.status(201).json({
      success: true,
      message: `Area "${area.name}" created successfully in ${area.city}`,
      area,
    });
  } catch (err) {
    console.error('addArea error:', err);
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An area with this name already exists in the city',
      });
    }
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to create area',
    });
  }
};

// ==================== UPDATE AREA ====================
const updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid area ID format' });
    }

    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name.trim();
    if (req.body.city !== undefined) updateData.city = req.body.city.trim().toUpperCase();
    if (req.body.center) updateData.center = toMongoPoint(req.body.center);
    if (req.body.polygon) updateData.polygon = toMongoPolygon(req.body.polygon);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No update data provided' });
    }

    // Prevent duplicate name+city
    if (updateData.name || updateData.city) {
      const duplicateQuery = { _id: { $ne: id } };
      if (updateData.name) duplicateQuery.name = { $regex: `^${updateData.name}$`, $options: 'i' };
      if (updateData.city) duplicateQuery.city = updateData.city;

      const existing = await Area.findOne(duplicateQuery);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Area "${updateData.name || existing.name}" already exists in ${updateData.city || existing.city}`,
        });
      }
    }

    const area = await Area.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found or already deleted' });
    }

    // Clear cache on geometry or activation change
    clearAreaCache();

    return res.json({
      success: true,
      message: `Area "${area.name}" updated successfully`,
      area,
    });
  } catch (err) {
    console.error('updateArea error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update area',
    });
  }
};

// ==================== GET ALL AREAS + ZONES ====================
const getAllAreasWithZones = async (req, res) => {
  try {
    const { page = 1, limit = 50, city, active } = req.query;
    const query = {};
    if (city) query.city = new RegExp(city, 'i');
    if (active !== undefined) query.isActive = active === 'true';

    const areas = await Area.find(query)
      .select('name city center polygon isActive createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .lean();

    const areaIds = areas.map(a => a._id);
    const zones = await DeliveryZone.find({ area: { $in: areaIds } }).lean();
    const zoneMap = zones.reduce((acc, z) => {
      acc[z.area.toString()] = z;
      return acc;
    }, {});

    const result = areas.map(area => ({
      ...area,
      centerLatLng: area.center ? {
        lat: Number(area.center.coordinates[1].toFixed(6)),
        lng: Number(area.center.coordinates[0].toFixed(6)),
      } : null,
      polygonLatLng: area.polygon?.coordinates?.map(ring =>
        ring.map(([lng, lat]) => [lat, lng])
      ) || null,
      deliveryZone: zoneMap[area._id?.toString()] || null,
      hasDeliveryZone: !!zoneMap[area._id?.toString()],
    }));

    const total = await Area.countDocuments(query);

    res.json({
      success: true,
      message: areas.length ? 'Areas fetched successfully' : 'No areas found matching criteria',
      areas: result,
      pagination: {
        total,
        page: +page,
        pages: Math.ceil(total / limit),
        limit: +limit,
      },
    });
  } catch (err) {
    console.error('getAllAreasWithZones error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch areas and delivery zones',
    });
  }
};

// ==================== GET SINGLE AREA ====================
const getAreaById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid area ID format' });
    }

    const area = await Area.findById(id).lean();
    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }

    const zone = await DeliveryZone.findOne({ area: id }).lean();

    const responseArea = {
      ...area,
      centerLatLng: area.center ? {
        lat: Number(area.center.coordinates[1].toFixed(6)),
        lng: Number(area.center.coordinates[0].toFixed(6)),
      } : null,
      polygonLatLng: area.polygon?.coordinates?.map(ring =>
        ring.map(([lng, lat]) => [lat, lng])
      ) || null,
    };

    res.json({
      success: true,
      message: 'Area details fetched successfully',
      area: responseArea,
      deliveryZone: zone || null,
    });
  } catch (err) {
    console.error('getAreaById error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching area',
    });
  }
};

// ==================== DELETE AREA ====================
const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid area ID format' });
    }

    await DeliveryZone.deleteOne({ area: id });
    const deleted = await Area.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Area not found or already deleted' });
    }

    clearAreaCache(); // Critical: prevent stale geo results

    res.json({
      success: true,
      message: `Area "${deleted.name}" and its delivery zone deleted permanently`,
    });
  } catch (err) {
    console.error('deleteArea error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete area',
    });
  }
};

// ==================== UPDATE DELIVERY ZONE (UPSERT) ====================
const updateDeliveryZone = async (req, res) => {
  try {
    const { areaId } = req.params;
    const {
      deliveryFee,
      baseFee,
      distanceFeePerKm,
      maxDistanceKm,
      feeStructure = 'flat',
      minOrderAmount,
      estimatedTime,
      isActive,
      freeDeliveryAbove, // NEW
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(areaId)) {
      return res.status(400).json({ success: false, message: 'Invalid area ID format' });
    }

    const area = await Area.findById(areaId);
    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }

    const updateData = {
      feeStructure,
      minOrderAmount: minOrderAmount !== undefined ? Number(minOrderAmount) : undefined,
      estimatedTime: estimatedTime?.trim(),
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      freeDeliveryAbove: freeDeliveryAbove !== undefined ? Number(freeDeliveryAbove) : undefined, // NEW
    };

    // Only set flat fee if structure is flat
    if (feeStructure === 'flat') {
      updateData.deliveryFee = deliveryFee !== undefined ? Number(deliveryFee) : undefined;
    }

    // Only set distance fields if structure is distance
    if (feeStructure === 'distance') {
      updateData.baseFee = baseFee !== undefined ? Number(baseFee) : undefined;
      updateData.distanceFeePerKm = distanceFeePerKm !== undefined ? Number(distanceFeePerKm) : undefined;
      updateData.maxDistanceKm = maxDistanceKm !== undefined ? Number(maxDistanceKm) : undefined;
      updateData.deliveryFee = 0; // reset flat fee
    }

    const zone = await DeliveryZone.findOneAndUpdate(
      { area: areaId },
      updateData,
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    // Sync area.isActive with zone.isActive
    if (area.isActive !== zone.isActive) {
      await Area.findByIdAndUpdate(areaId, { isActive: zone.isActive });
    }

    clearAreaCache();

    res.json({
      success: true,
      message: zone.isActive
        ? `Delivery settings updated for "${area.name}"`
        : `Delivery paused for "${area.name}"`,
      zone,
    });
  } catch (err) {
    console.error('updateDeliveryZone error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update delivery zone',
    });
  }
};



// ==================== DELETE DELIVERY ZONE ====================
const deleteDeliveryZone = async (req, res) => {
  try {
    const { areaId } = req.params;
    const result = await DeliveryZone.deleteOne({ area: areaId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Delivery zone not found for this area',
      });
    }

    await Area.findByIdAndUpdate(areaId, { isActive: false });
    clearAreaCache();

    res.json({
      success: true,
      message: 'Delivery zone removed and area deactivated',
    });
  } catch (err) {
    console.error('deleteDeliveryZone error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete delivery zone',
    });
  }
};

// ==================== TOGGLE AREA ACTIVE ====================
const toggleAreaActive = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid area ID format' });
    }

    const area = await Area.findById(id);
    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }

    area.isActive = !area.isActive;
    await area.save();

    if (!area.isActive) {
      await DeliveryZone.updateOne({ area: id }, { isActive: false });
    }

    clearAreaCache();

    res.json({
      success: true,
      message: area.isActive
        ? `"${area.name}" is now ACTIVE and available for service`
        : `"${area.name}" is now INACTIVE and paused`,
      area: { _id: area._id, name: area.name, isActive: area.isActive },
    });
  } catch (err) {
    console.error('toggleAreaActive error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle area status',
    });
  }
};

// ==================== TOGGLE DELIVERY ZONE ====================
const toggleDeliveryZone = async (req, res) => {
  try {
    const { areaId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(areaId)) {
      return res.status(400).json({ success: false, message: 'Invalid area ID' });
    }

    const area = await Area.findById(areaId);
    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }

    let zone = await DeliveryZone.findOne({ area: areaId });

    if (!zone) {
      // First time: create and enable
      zone = await DeliveryZone.create({
        area: areaId,
        isActive: true,
      });
    } else {
      // Toggle existing
      zone.isActive = !zone.isActive;
      await zone.save();
    }

    // Activate area if delivery is on
    if (zone.isActive && !area.isActive) {
      await Area.findByIdAndUpdate(areaId, { isActive: true });
    }

    clearAreaCache();

    const updatedArea = await Area.findById(areaId).select('name city isActive center').lean();

    res.json({
      success: true,
      message: zone.isActive
        ? `Delivery ENABLED for "${area.name}"`
        : `Delivery PAUSED for "${area.name}"`,
      deliveryZone: {
        areaId: zone.area,
        deliveryFee: zone.deliveryFee,
        minOrderAmount: zone.minOrderAmount,
        estimatedTime: zone.estimatedTime,
        isActive: zone.isActive,
      },
      hasDeliveryZone: true,
      area: {
        _id: updatedArea._id,
        name: updatedArea.name,
        city: updatedArea.city,
        isActive: updatedArea.isActive || zone.isActive,
        centerLatLng: updatedArea.center
          ? {
              lat: Number(updatedArea.center.coordinates[1].toFixed(6)),
              lng: Number(updatedArea.center.coordinates[0].toFixed(6)),
            }
          : null,
      },
    });
  } catch (err) {
    console.error('toggleDeliveryZone error:', err);
    res.status(500).json({ success: false, message: 'Failed to toggle delivery zone' });
  }
};


// New: Calculate delivery fee based on user location
// ==================== TO CALCULATE DELIVERY FEE ====================
const calculateDeliveryFee = async (req, res) => {
  try {
    const { lat, lng, orderAmount } = req.body; // orderAmount added

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const orderAmt = parseFloat(orderAmount || 0);

    if (isNaN(userLat) || isNaN(userLng) || isNaN(orderAmt)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates or order amount' });
    }

    // Find area containing user's point
    const area = await Area.findOne({
      polygon: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [userLng, userLat],
          },
        },
      },
      isActive: true,
    });

    if (!area) {
      return res.json({
        success: true,
        inService: false,
        message: 'We do not deliver to this location yet',
      });
    }

    const zone = await DeliveryZone.findOne({ area: area._id, isActive: true });

    if (!zone) {
      return res.json({
        success: true,
        inService: true,
        hasDelivery: false,
        area: area.name,
        message: 'Area covered, but delivery not active yet',
      });
    }

    // Check free delivery
    if (zone.freeDeliveryAbove && orderAmt >= zone.freeDeliveryAbove) {
      return res.json({
        success: true,
        inService: true,
        deliverable: true,
        area: area.name,
        city: area.city,
        distanceKm: 0,
        deliveryFee: 0,
        reason: `Free delivery for orders ≥ Rs.${zone.freeDeliveryAbove}`,
        minOrderAmount: zone.minOrderAmount,
        estimatedTime: zone.estimatedTime,
      });
    }

    // Calculate distance from area center
    const centerLng = area.center.coordinates[0];
    const centerLat = area.center.coordinates[1];

    const distanceKm = haversineDistance(
      { lat: userLat, lng: userLng },
      { lat: centerLat, lng: centerLng }
    );

    let deliveryFee = 0;
    let reason = '';

    if (zone.feeStructure === 'distance') {
      if (distanceKm > zone.maxDistanceKm) {
        return res.json({
          success: true,
          inService: true,
          deliverable: false,
          area: area.name,
          distanceKm: distanceKm.toFixed(1),
          message: `Too far (${distanceKm.toFixed(1)} km). Max: ${zone.maxDistanceKm} km`,
        });
      }

      deliveryFee = zone.baseFee + Math.round(distanceKm * zone.distanceFeePerKm);
      reason = `Distance-based: ${distanceKm.toFixed(1)} km × Rs.${zone.distanceFeePerKm}/km`;
    } else {
      deliveryFee = zone.deliveryFee;
      reason = 'Flat delivery fee';
    }

    res.json({
      success: true,
      inService: true,
      deliverable: true,
      area: area.name,
      city: area.city,
      distanceKm: distanceKm.toFixed(1),
      deliveryFee,
      reason,
      minOrderAmount: zone.minOrderAmount,
      estimatedTime: zone.estimatedTime,
    });
  } catch (err) {
    console.error('calculateDeliveryFee error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// Haversine formula (accurate for short distances)
function haversineDistance(coord1, coord2) {
  const R = 6371; // Earth radius in kilometers
  const dLat = deg2rad(coord2.lat - coord1.lat);
  const dLon = deg2rad(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(coord1.lat)) *
      Math.cos(deg2rad(coord2.lat)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}


module.exports = {
  addArea,
  updateArea,
  getAllAreasWithZones,
  getAreaById,
  deleteArea,
  updateDeliveryZone,
  deleteDeliveryZone,
  toggleAreaActive,
  toggleDeliveryZone,
  calculateDeliveryFee,
};