// src/controllers/address/addressController.js

const Address = require('../../models/address/Address');
const Area = require('../../models/area/Area');

// Validate if a point lies inside the polygon of a specific area
const validatePointInArea = async (point, areaId) => {
  return await Area.findOne({
    _id: areaId,
    isActive: true,
    polygon: { $geoIntersects: { $geometry: point } }
  });
};

// ====================== CREATE ADDRESS ======================
const createAddress = async (req, res) => {
  const { label, fullAddress, areaId, lat, lng, instructions, isDefault } = req.body;
  const userId = req.user.id;

  if (!areaId || !lat || !lng) {
    return res.status(400).json({
      success: false,
      message: 'areaId, lat, and lng are required'
    });
  }

  try {
    const point = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };

    const area = await validatePointInArea(point, areaId);
    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'This location is not in any serviceable area'
      });
    }

    if (isDefault) {
      await Address.updateMany({ user: userId }, { isDefault: false });
    }

    const address = await Address.create({
      user: userId,
      label: label.trim(),
      fullAddress: fullAddress.trim(),
      area: areaId,
      location: point,
      instructions: instructions?.trim(),
      isDefault: !!isDefault
    });

    await address.populate('area', 'name city');

    res.status(201).json({ success: true, address });

  } catch (err) {
    console.error('createAddress error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====================== GET USER ADDRESSES ======================
const getUserAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.id })
      .populate('area', 'name city')
      .sort({ isDefault: -1, createdAt: -1 });

    res.json({ success: true, addresses });

  } catch (err) {
    console.error('getUserAddresses error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====================== UPDATE ADDRESS ======================
const updateAddress = async (req, res) => {
  const { id } = req.params;
  const { label, fullAddress, areaId, lat, lng, instructions, isDefault } = req.body;

  try {
    const address = await Address.findOne({ _id: id, user: req.user.id });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    // If coordinates changed → validate new point
    if (lat && lng &&
      (parseFloat(lat) !== address.location.coordinates[1] ||
       parseFloat(lng) !== address.location.coordinates[0])
    ) {
      const point = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };
      const newAreaId = areaId || address.area;

      const area = await validatePointInArea(point, newAreaId);
      if (!area) {
        return res.status(400).json({ success: false, message: 'New location not serviceable' });
      }

      address.location = point;
      address.area = newAreaId;
    }

    if (isDefault) {
      await Address.updateMany({ user: req.user.id }, { isDefault: false });
      address.isDefault = true;
    }

    address.label = label?.trim() || address.label;
    address.fullAddress = fullAddress?.trim() || address.fullAddress;
    address.instructions = instructions?.trim();

    await address.save();
    await address.populate('area', 'name city');

    res.json({ success: true, address });

  } catch (err) {
    console.error('updateAddress error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====================== DELETE ADDRESS ======================
const deleteAddress = async (req, res) => {
  const { id } = req.params;

  try {
    const address = await Address.findOneAndDelete({
      _id: id,
      user: req.user.id
    });

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    // If default address deleted → set next available as default
    if (address.isDefault) {
      const next = await Address.findOne({ user: req.user.id }).sort({ createdAt: -1 });
      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }

    res.json({ success: true, message: 'Address deleted' });

  } catch (err) {
    console.error('deleteAddress error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====================== SET DEFAULT ADDRESS ======================
const setDefaultAddress = async (req, res) => {
  const { id } = req.params;

  try {
    await Address.updateMany({ user: req.user.id }, { isDefault: false });

    const address = await Address.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { isDefault: true },
      { new: true }
    ).populate('area', 'name city');

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    res.json({ success: true, address });

  } catch (err) {
    console.error('setDefaultAddress error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====================== EXPORTS ======================
module.exports = {
  createAddress,
  getUserAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};
