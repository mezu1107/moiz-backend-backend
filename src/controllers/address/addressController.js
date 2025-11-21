// src/controllers/address/addressController.js
const Address = require('../../models/address/Address');
const Area = require('../../models/area/Area');

const validatePointInArea = async (point) => {
  return await Area.findOne({
    isActive: true,
    polygon: { $geoIntersects: { $geometry: point } }
  });
};

const createAddress = async (req, res) => {
  const { label, fullAddress, areaId, lat, lng, instructions, isDefault } = req.body;
  const userId = req.user.id;

  try {
    const point = { type: 'Point', coordinates: [lng, lat] };

    const area = await validatePointInArea(point);
    if (!area || area._id.toString() !== areaId) {
      return res.status(400).json({
        success: false,
        message: 'This location is outside our service area'
      });
    }

    if (isDefault) {
      await Address.updateMany({ user: userId }, { isDefault: false });
    }

    const address = await Address.create({
      user: userId,
      label,
      fullAddress,
      area: areaId,
      location: point,
      instructions: instructions || '',
      isDefault: !!isDefault
    });

    await address.populate('area', 'name city');

    res.status(201).json({ success: true, address });
  } catch (err) {
    console.error('createAddress:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getUserAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.id })
      .populate('area', 'name city')
      .sort({ isDefault: -1, createdAt: -1 });

    res.json({ success: true, addresses });
  } catch (err) {
    console.error('getUserAddresses:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateAddress = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const address = await Address.findOne({ _id: id, user: req.user.id });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    if (updates.lat && updates.lng) {
      const newPoint = { type: 'Point', coordinates: [updates.lng, updates.lat] };
      const validArea = await validatePointInArea(newPoint);
      if (!validArea || (updates.areaId && validArea._id.toString() !== updates.areaId)) {
        return res.status(400).json({ success: false, message: 'New location not serviceable' });
      }
      address.location = newPoint;
      if (updates.areaId) address.area = updates.areaId;
    }

    if (updates.isDefault) {
      await Address.updateMany({ user: req.user.id }, { isDefault: false });
      address.isDefault = true;
    }

    Object.keys(updates).forEach(key => {
      if (['label', 'fullAddress', 'instructions'].includes(key)) {
        address[key] = updates[key]?.trim() || address[key];
      }
    });

    await address.save();
    await address.populate('area', 'name city');

    res.json({ success: true, address });
  } catch (err) {
    console.error('updateAddress:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteAddress = async (req, res) => {
  const { id } = req.params;

  try {
    const address = await Address.findOneAndDelete({ _id: id, user: req.user.id });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    if (address.isDefault) {
      const next = await Address.findOne({ user: req.user.id }).sort({ createdAt: -1 });
      if (next) { next.isDefault = true; await next.save(); }
    }

    res.json({ success: true, message: 'Address deleted' });
  } catch (err) {
    console.error('deleteAddress:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const setDefaultAddress = async (req, res) => {
  const { id } = req.params;

  try {
    await Address.updateMany({ user: req.user.id }, { isDefault: false });
    const address = await Address.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { isDefault: true },
      { new: true }
    ).populate('area', 'name city');

    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    res.json({ success: true, address });
  } catch (err) {
    console.error('setDefaultAddress:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createAddress,
  getUserAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};