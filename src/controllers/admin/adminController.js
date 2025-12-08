// src/controllers/admin/adminController.js

const Area = require('../../models/area/Area');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');
const mongoose = require('mongoose');

// Helper: Convert { lat, lng } → [lng, lat]
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

// Helper: Convert Leaflet polygon → MongoDB format
const toMongoPolygon = (polygon) => {
  if (!polygon || polygon.type !== 'Polygon') throw new Error('Invalid polygon format');

  const coordinates = polygon.coordinates.map(ring =>
    ring.map(([lat, lng]) => {
      if (typeof lat !== 'number' || typeof lng !== 'number') throw new Error('Invalid coordinate');
      return [lng, lat];
    })
  );

  coordinates.forEach(ring => {
    if (ring.length >= 4) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
    }
  });

  return { type: 'Polygon', coordinates };
};


// ==================== ADD AREA ====================
const addArea = async (req, res) => {
  try {
    const { name, city = 'Lahore' } = req.body;

    const area = await Area.create({
      name: name.trim(),
      city: city.trim().toUpperCase(),
      center: {
        type: 'Point',
        coordinates: [req.body.normalizedCenter.lng, req.body.normalizedCenter.lat]
      },
      polygon: req.body.mongoPolygon,
      isActive: false,
    });

    res.status(201).json({
      success: true,
      message: 'Area created successfully',
      area,
    });
  } catch (err) {
    console.error('addArea error:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to create area' });
  }
};

// ==================== UPDATE AREA ====================
const updateArea = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid area ID' });
    }

    const updateData = {};

    // Name & City
    if (req.body.name !== undefined) {
      updateData.name = req.body.name.trim();
    }
    if (req.body.city !== undefined) {
      updateData.city = req.body.city.trim().toUpperCase();
    }

    // Center – use pre-validated & normalized data from validation
    if (req.body.normalizedCenter) {
      updateData.center = {
        type: 'Point',
        coordinates: [req.body.normalizedCenter.lng, req.body.normalizedCenter.lat], // [lng, lat]
      };
    }

    // Polygon – use pre-converted MongoDB-ready polygon
    if (req.body.mongoPolygon) {
      updateData.polygon = req.body.mongoPolygon;
    }

    // If nothing to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No update data provided' });
    }

    // Prevent duplicate name in same city
    if (updateData.name || updateData.city) {
      const duplicateQuery = { _id: { $ne: id } };
      if (updateData.name) duplicateQuery.name = { $regex: `^${updateData.name}$`, $options: 'i' };
      if (updateData.city) duplicateQuery.city = updateData.city;

      const existing = await Area.findOne(duplicateQuery);

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Another area with this name already exists in the city',
        });
      }
    }

    // Update area
    const area = await Area.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }

    return res.json({
      success: true,
      message: 'Area updated successfully',
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
      .select('name city center isActive createdAt')
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
      center: area.center ? { lat: area.center.coordinates[1], lng: area.center.coordinates[0] } : null,
      deliveryZone: zoneMap[area._id] || null,
      hasDeliveryZone: !!zoneMap[area._id],
    }));

    const total = await Area.countDocuments(query);

    res.json({
      success: true,
      areas: result,
      pagination: { total, page: +page, pages: Math.ceil(total / limit), limit: +limit },
    });
  } catch (err) {
    console.error('getAllAreasWithZones error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==================== GET SINGLE AREA ====================
const getAreaById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const area = await Area.findById(id);
    if (!area) return res.status(404).json({ success: false, message: 'Area not found' });

    const zone = await DeliveryZone.findOne({ area: id }).lean();

    res.json({ success: true, area, deliveryZone: zone || null });
  } catch (err) {
    console.error('getAreaById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==================== DELETE AREA ====================
const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    await DeliveryZone.deleteOne({ area: id });
    const deleted = await Area.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Area not found' });

    res.json({ success: true, message: 'Area deleted permanently' });
  } catch (err) {
    console.error('deleteArea error:', err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

// ==================== UPDATE DELIVERY ZONE (UPSERT) ====================
const updateDeliveryZone = async (req, res) => {
  try {
    const { areaId } = req.params;
    const { deliveryFee = 149, minOrderAmount = 0, estimatedTime = '35-50 min', isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(areaId)) {
      return res.status(400).json({ success: false, message: 'Invalid areaId' });
    }

    const area = await Area.findById(areaId);
    if (!area) return res.status(404).json({ success: false, message: 'Area not found' });

    const zone = await DeliveryZone.findOneAndUpdate(
      { area: areaId },
      {
        deliveryFee: Number(deliveryFee),
        minOrderAmount: Number(minOrderAmount),
        estimatedTime: estimatedTime.trim(),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Area.findByIdAndUpdate(areaId, { isActive: zone.isActive });

    res.json({
      success: true,
      message: zone.isActive ? 'Delivery activated' : 'Delivery paused',
      zone,
    });
  } catch (err) {
    console.error('updateDeliveryZone error:', err);
    res.status(500).json({ success: false, message: 'Failed to update zone' });
  }
};

// ==================== DELETE DELIVERY ZONE ====================
const deleteDeliveryZone = async (req, res) => {
  try {
    const { areaId } = req.params;
    const result = await DeliveryZone.deleteOne({ area: areaId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }
    await Area.findByIdAndUpdate(areaId, { isActive: false });
    res.json({ success: true, message: 'Delivery zone removed' });
  } catch (err) {
    console.error('deleteDeliveryZone error:', err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

// ==================== TOGGLE AREA ACTIVE ====================
const toggleAreaActive = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid area ID' });
    }

    const area = await Area.findById(id);
    if (!area) return res.status(404).json({ success: false, message: 'Area not found' });

    area.isActive = !area.isActive;
    await area.save();

    // If area is turned OFF → disable delivery too
    if (!area.isActive) {
      await DeliveryZone.updateOne({ area: id }, { isActive: false });
    }

    return res.json({
      success: true,
      message: area.isActive ? 'Area activated (inService: true)' : 'Area deactivated (inService: false)',
      area: { _id: area._id, name: area.name, isActive: area.isActive },
    });
  } catch (err) {
    console.error('toggleAreaActive error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==================== TOGGLE DELIVERY ZONE (hasDeliveryZone) ====================
const toggleDeliveryZone = async (req, res) => {
  try {
    const { areaId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(areaId)) {
      return res.status(400).json({ success: false, message: 'Invalid areaId' });
    }

    const area = await Area.findById(areaId);
    if (!area) return res.status(404).json({ success: false, message: 'Area not found' });

    // Toggle delivery zone (create if not exists)
    const zone = await DeliveryZone.findOneAndUpdate(
      { area: areaId },
      [
        {
          $set: {
            isActive: { $not: "$isActive" },
            deliveryFee: { $ifNull: ["$deliveryFee", 149] },
            minOrderAmount: { $ifNull: ["$minOrderAmount", 0] },
            estimatedTime: { $ifNull: ["$estimatedTime", "35-50 min"] },
          }
        }
      ],
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // Keep area.isActive in sync: if delivery ON → area must be ON
    if (zone.isActive && !area.isActive) {
      await Area.findByIdAndUpdate(areaId, { isActive: true });
    }

    return res.json({
      success: true,
      message: zone.isActive
        ? 'Delivery enabled → hasDeliveryZone: true'
        : 'Delivery paused → hasDeliveryZone: false',
      deliveryZone: {
        areaId: zone.area,
        deliveryFee: zone.deliveryFee,
        minOrderAmount: zone.minOrderAmount,
        estimatedTime: zone.estimatedTime,
        isActive: zone.isActive,
      },
    });
  } catch (err) {
    console.error('toggleDeliveryZone error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

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
};
