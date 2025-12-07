// src/controllers/admin/adminController.js

const Area = require('../../models/area/Area');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');
const mongoose = require('mongoose');

// Convert { lat, lng } → MongoDB GeoJSON Point [lng, lat]
const toMongoPoint = (center) => {
  if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number') {
    throw new Error('Center must be { lat: number, lng: number }');
  }
  const { lat, lng } = center;

  if (lat < 23.5 || lat > 37.5 || lng < 60.0 || lng > 78.0) {
    throw new Error('Coordinates outside Pakistan bounds (23.5–37.5 lat, 60.0–78.0 lng)');
  }

  return {
    type: 'Point',
    coordinates: [lng, lat], // MongoDB requires [longitude, latitude]
  };
};

// Convert Leaflet polygon [[lat, lng], ...] → MongoDB [[[lng, lat], ...]]
const toMongoPolygon = (polygon) => {
  if (!polygon || polygon.type !== 'Polygon' || !Array.isArray(polygon.coordinates)) {
    throw new Error('Polygon must be a valid GeoJSON Polygon object');
  }

  const coordinates = polygon.coordinates.map((ring) =>
    ring.map((point) => {
      const [lat, lng] = point;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        throw new Error('All polygon coordinates must be numbers');
      }
      return [lng, lat]; // Flip to [lng, lat]
    })
  );

  // Auto-close all rings (GeoJSON requirement)
  coordinates.forEach((ring) => {
    if (ring.length >= 4) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([...first]);
      }
    }
  });

  return { type: 'Polygon', coordinates };
};

// ==================== ADD AREA ====================
const addArea = async (req, res) => {
  try {
    const { name, city = 'Lahore', center, polygon } = req.body;

    if (!name?.trim() || !center || !polygon) {
      return res.status(400).json({
        success: false,
        message: 'name, center, and polygon are required',
      });
    }

    const mongoCenter = toMongoPoint(center);
    const mongoPolygon = toMongoPolygon(polygon);

    const trimmedName = name.trim();
    const normalizedCity = city.trim().toUpperCase();

    const exists = await Area.findOne({
      name: { $regex: `^${trimmedName}$`, $options: 'i' },
      city: normalizedCity,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Area with this name already exists in the city',
      });
    }

    const area = await Area.create({
      name: trimmedName,
      city: normalizedCity,
      center: mongoCenter,
      polygon: mongoPolygon,
      isActive: false,
    });

    res.status(201).json({
      success: true,
      message: 'Area created successfully',
      area,
    });
  } catch (err) {
    console.error('addArea error:', err);
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
    const { name, city, center, polygon } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid area ID' });
    }

    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (city !== undefined) updateData.city = city.trim().toUpperCase();
    if (center !== undefined) updateData.center = toMongoPoint(center);
    if (polygon !== undefined) updateData.polygon = toMongoPolygon(polygon);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No update data provided' });
    }

    // Check for duplicate name in same city
    if (updateData.name || updateData.city) {
      const duplicateCheck = {
        _id: { $ne: id },
        name: updateData.name ? { $regex: `^${updateData.name}$`, $options: 'i' } : { $exists: true },
        city: updateData.city || { $exists: true },
      };
      if (await Area.findOne(duplicateCheck)) {
        return res.status(400).json({
          success: false,
          message: 'Area name already exists in this city',
        });
      }
    }

    const area = await Area.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }

    res.json({
      success: true,
      message: 'Area updated successfully',
      area,
    });
  } catch (err) {
    console.error('updateArea error:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to update area',
    });
  }
};

// ==================== GET ALL AREAS WITH ZONES (Best for Admin Panel) ====================
const getAllAreasWithZones = async (req, res) => {
  try {
    const { page = 1, limit = 20, city, active } = req.query;

    const query = {};
    if (city) query.city = new RegExp(city, 'i');
    if (active !== undefined) query.isActive = active === 'true';

    const areas = await Area.find(query)
      .select('name city center isActive createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .lean();

    const areaIds = areas.map((a) => a._id);
    const zones = await DeliveryZone.find({ area: { $in: areaIds } }).lean();
    const zoneMap = zones.reduce((acc, z) => {
      acc[z.area.toString()] = z;
      return acc;
    }, {});

    const result = areas.map((area) => ({
      ...area,
      center: area.centerLatLng, // { lat, lng } from virtual
      deliveryZone: zoneMap[area._id] || null,
      hasDeliveryZone: !!zoneMap[area._id],
    }));

    const total = await Area.countDocuments(query);

    res.json({
      success: true,
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==================== GET SINGLE AREA + ZONE ====================
const getAreaById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const area = await Area.findById(id);
    if (!area) return res.status(404).json({ success: false, message: 'Area not found' });

    const zone = await DeliveryZone.findOne({ area: id }).lean();

    res.json({
      success: true,
      area,
      deliveryZone: zone || null,
    });
  } catch (err) {
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

    res.json({ success: true, message: 'Area and delivery zone deleted' });
  } catch (err) {
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
    ).populate('area', 'name city');

    // Sync area.isActive with zone
    await Area.findByIdAndUpdate(areaId, { isActive: zone.isActive });

    res.json({
      success: true,
      message: zone.isActive ? 'Delivery activated' : 'Delivery paused',
      zone,
    });
  } catch (err) {
    console.error(err);
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
    res.json({ success: true, message: 'Delivery zone deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

// ==================== TOGGLE AREA ACTIVE (Quick Switch) ====================
const toggleAreaActive = async (req, res) => {
  try {
    const { id } = req.params;
    const area = await Area.findById(id);
    if (!area) return res.status(404).json({ success: false, message: 'Area not found' });

    area.isActive = !area.isActive;
    await area.save();

    if (!area.isActive) {
      await DeliveryZone.updateMany({ area: id }, { isActive: false });
    }

    res.json({
      success: true,
      message: `Area ${area.isActive ? 'activated' : 'deactivated'}`,
      area: { _id: area._id, name: area.name, isActive: area.isActive },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Toggle failed' });
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
};