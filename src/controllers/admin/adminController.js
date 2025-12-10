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


// src/controllers/admin/adminController.js
// ... (existing imports and helpers remain unchanged)

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
      message: `Area "${area.name}" created successfully in ${area.city}`,
      area,
    });
  } catch (err) {
    console.error('addArea error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: 'An area with this name already exists in the city' 
      });
    }
    res.status(400).json({ 
      success: false, 
      message: err.message || 'Failed to create area' 
    });
  }
};

// ==================== UPDATE AREA ====================
const updateArea = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid area ID format' 
      });
    }

    const updateData = {};

    if (req.body.name !== undefined) updateData.name = req.body.name.trim();
    if (req.body.city !== undefined) updateData.city = req.body.city.trim().toUpperCase();
    if (req.body.normalizedCenter) {
      updateData.center = {
        type: 'Point',
        coordinates: [req.body.normalizedCenter.lng, req.body.normalizedCenter.lat],
      };
    }
    if (req.body.mongoPolygon) updateData.polygon = req.body.mongoPolygon;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No update data provided' 
      });
    }

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
      return res.status(404).json({ 
        success: false, 
        message: 'Area not found or already deleted' 
      });
    }

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
      message: areas.length ? 'Areas fetched successfully' : 'No areas found matching criteria',
      areas: result,
      pagination: { total, page: +page, pages: Math.ceil(total / limit), limit: +limit },
    });
  } catch (err) {
    console.error('getAllAreasWithZones error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch areas and delivery zones' 
    });
  }
};

// ==================== GET SINGLE AREA ====================
const getAreaById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid area ID format' 
      });
    }

    const area = await Area.findById(id);
    if (!area) return res.status(404).json({ 
      success: false, 
      message: 'Area not found' 
    });

    const zone = await DeliveryZone.findOne({ area: id }).lean();

    res.json({ 
      success: true, 
      message: 'Area details fetched successfully',
      area, 
      deliveryZone: zone || null 
    });
  } catch (err) {
    console.error('getAreaById error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching area' 
    });
  }
};

// ==================== DELETE AREA ====================
const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid area ID format' 
      });
    }

    await DeliveryZone.deleteOne({ area: id });
    const deleted = await Area.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ 
      success: false, 
      message: 'Area not found or already deleted' 
    });

    res.json({ 
      success: true, 
      message: `Area "${deleted.name}" and its delivery zone deleted permanently` 
    });
  } catch (err) {
    console.error('deleteArea error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete area' 
    });
  }
};

// ==================== UPDATE DELIVERY ZONE (UPSERT) ====================
const updateDeliveryZone = async (req, res) => {
  try {
    const { areaId } = req.params;
    const { deliveryFee = 149, minOrderAmount = 0, estimatedTime = '35-50 min', isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(areaId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid area ID format' 
      });
    }

    const area = await Area.findById(areaId);
    if (!area) return res.status(404).json({ 
      success: false, 
      message: 'Area not found' 
    });

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
      message: zone.isActive 
        ? `Delivery activated for "${area.name}"` 
        : `Delivery paused for "${area.name}"`,
      zone,
    });
  } catch (err) {
    console.error('updateDeliveryZone error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update delivery zone' 
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
        message: 'Delivery zone not found for this area' 
      });
    }
    await Area.findByIdAndUpdate(areaId, { isActive: false });
    res.json({ 
      success: true, 
      message: 'Delivery zone removed and area deactivated' 
    });
  } catch (err) {
    console.error('deleteDeliveryZone error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete delivery zone' 
    });
  }
};

// ==================== TOGGLE AREA ACTIVE ====================
const toggleAreaActive = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid area ID format' 
      });
    }

    const area = await Area.findById(id);
    if (!area) return res.status(404).json({ 
      success: false, 
      message: 'Area not found' 
    });

    area.isActive = !area.isActive;
    await area.save();

    if (!area.isActive) {
      await DeliveryZone.updateOne({ area: id }, { isActive: false });
    }

    return res.json({
      success: true,
      message: area.isActive 
        ? `"${area.name}" is now ACTIVE and available for service` 
        : `"${area.name}" is now INACTIVE and paused`,
      area: { _id: area._id, name: area.name, isActive: area.isActive },
    });
  } catch (err) {
    console.error('toggleAreaActive error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to toggle area status' 
    });
  }
};

// ==================== TOGGLE DELIVERY ZONE ====================
// src/controllers/admin/adminController.js

const toggleDeliveryZone = async (req, res) => {
  try {
    const { areaId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(areaId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid area ID' 
      });
    }

    const area = await Area.findById(areaId);
    if (!area) return res.status(404).json({ 
      success: false, 
      message: 'Area not found' 
    });

    // Toggle + upsert (same as before)
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
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Activate area if delivery is enabled
    if (zone.isActive && !area.isActive) {
      await Area.findByIdAndUpdate(areaId, { isActive: true });
    }

    // REFRESH AREA TO GET LATEST isActive
    const updatedArea = await Area.findById(areaId).lean();

    return res.json({
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
      // THIS IS THE KEY LINE YOUR FRONTEND NEEDS
      hasDeliveryZone: true,
      area: {
        _id: updatedArea._id,
        name: updatedArea.name,
        city: updatedArea.city,
        isActive: updatedArea.isActive,
        center: updatedArea.center ? {
          lat: updatedArea.center.coordinates[1],
          lng: updatedArea.center.coordinates[0]
        } : null
      }
    });
  } catch (err) {
    console.error('toggleDeliveryZone error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to toggle delivery zone' 
    });
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