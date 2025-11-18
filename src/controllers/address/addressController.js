// src/controllers/address/addressController.js
const Address = require('../../models/address/Address');
const Area = require('../../models/area/Area');

const createAddress = async (req, res) => {
  const { label, fullAddress, areaId, lat, lng, instructions, isDefault } = req.body;
  const userId = req.user.id;

  try {
    const point = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };

    const area = await Area.findOne({
      _id: areaId,
      isActive: true,
      polygon: { $geoIntersects: { $geometry: point } }
    });

    if (!area) return res.status(400).json({ success: false, message: 'Location not in serviceable area' });

    if (isDefault) {
      await Address.updateMany({ user: userId }, { isDefault: false });
    }

    const address = new Address({
      user: userId,
      label,
      fullAddress,
      area: areaId,
      location: point,
      instructions,
      isDefault: !!isDefault
    });

    await address.save();
    await address.populate('area', 'name city');

    res.status(201).json({ success: true, address });
  } catch (err) {
    console.error('createAddress error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

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

const updateAddress = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const address = await Address.findOne({ _id: id, user: req.user.id });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    if (updates.lat && updates.lng) {
      const point = { type: 'Point', coordinates: [parseFloat(updates.lng), parseFloat(updates.lat)] };
      const area = await Area.findOne({
        _id: updates.areaId || address.area,
        isActive: true,
        polygon: { $geoIntersects: { $geometry: point } }
      });

      if (!area) return res.status(400).json({ success: false, message: 'New location not serviceable' });

      updates.location = point;
      updates.area = area._id;
    }

    if (updates.isDefault) {
      await Address.updateMany({ user: req.user.id }, { isDefault: false });
    }

    Object.assign(address, updates);
    await address.save();
    await address.populate('area', 'name city');

    res.json({ success: true, address });
  } catch (err) {
    console.error('updateAddress error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteAddress = async (req, res) => {
  const { id } = req.params;

  try {
    const address = await Address.findOneAndDelete({ _id: id, user: req.user.id });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    if (address.isDefault) {
      const fallback = await Address.findOne({ user: req.user.id });
      if (fallback) {
        fallback.isDefault = true;
        await fallback.save();
      }
    }

    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (err) {
    console.error('deleteAddress error:', err);
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
    console.error('setDefaultAddress error:', err);
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