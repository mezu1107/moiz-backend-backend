// src/controllers/menu/menuController.js
const MenuItem = require('../../models/menuItem/MenuItem');
const Area = require('../../models/area/Area');
const cloudinary = require('../../config/cloudinary');
const { validationResult } = require('express-validator');

const getMenuByLocation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { lat, lng } = req.query;

  try {
    const point = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };
    const area = await Area.findOne({
      polygon: { $geoIntersects: { $geometry: point } },
      isActive: true
    });

    if (!area) return res.status(400).json({ success: false, message: 'No delivery in this area' });

    const menu = await MenuItem.find({
      isAvailable: true,
      $or: [
        { availableInAreas: { $exists: true, $eq: [] } },
        { availableInAreas: area._id }
      ]
    }).sort({ category: 1, name: 1 });

    res.json({ success: true, area: area.name, menu });
  } catch (err) {
    console.error('getMenuByLocation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addMenuItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { name, description, price, category, availableInAreas, isVeg, isSpicy } = req.body;
    const image = req.file?.path || null;
    const cloudinaryId = req.file?.filename || null;

    const item = new MenuItem({
      name, description, price, category, image, cloudinaryId,
      availableInAreas: availableInAreas || [],
      isVeg: isVeg ?? false,
      isSpicy: isSpicy ?? false
    });

    await item.save();
    res.status(201).json({ success: true, item });
  } catch (err) {
    console.error('addMenuItem error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateMenuItem = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const item = await MenuItem.findById(id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    if (req.file) {
      if (item.cloudinaryId) await cloudinary.uploader.destroy(item.cloudinaryId);
      updates.image = req.file.path;
      updates.cloudinaryId = req.file.filename;
    }

    Object.assign(item, updates);
    await item.save();

    res.json({ success: true, item });
  } catch (err) {
    console.error('updateMenuItem error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteMenuItem = async (req, res) => {
  const { id } = req.params;

  try {
    const item = await MenuItem.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    if (item.cloudinaryId) await cloudinary.uploader.destroy(item.cloudinaryId);

    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    console.error('deleteMenuItem error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAllMenuItems = async (req, res) => {
  try {
    const items = await MenuItem.find().sort({ category: 1, name: 1 });
    res.json({ success: true, items });
  } catch (err) {
    console.error('getAllMenuItems error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getMenuByLocation,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getAllMenuItems
};