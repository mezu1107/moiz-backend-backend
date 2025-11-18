// src/controllers/menu/menuController.js
const MenuItem = require('../../models/menuItem/MenuItem');
const Area = require('../../models/area/Area');
const cloudinary = require('../../config/cloudinary');
const axios = require('axios');
// Inside src/controllers/menu/menuController.js  ← REPLACE THIS ONE ONLY
const uploadToCloudinary = async (buffer, originalname) => {
  const formData = new FormData();
  
  // Convert buffer to Blob (Node.js 18+)
  const blob = new Blob([buffer], { type: originalname.endsWith('.png') ? 'image/png' : 'image/jpeg' });
  formData.append('file', blob);
  formData.append('upload_preset', 'foodapp_menu');
  formData.append('folder', 'foodapp/menu');

  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  );

  return res.data; // { secure_url, public_id }
};

const addMenuItem = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);

    const item = await MenuItem.create({
      name: req.body.name?.trim(),
      description: req.body.description?.trim(),
      price: Number(req.body.price),
      category: req.body.category,
      image: result.secure_url,
      cloudinaryId: result.public_id,
      availableInAreas: req.body.availableInAreas ? JSON.parse(req.body.availableInAreas) : [],
      isVeg: req.body.isVeg === 'true',
      isSpicy: req.body.isSpicy === 'true',
      isAvailable: true
    });

    res.status(201).json({
      success: true,
      message: 'Menu item added!',
      item
    });
  } catch (err) {
    console.error('Upload failed:', err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: err.response?.data || err.message
    });
  }
};

const getMenuByLocation = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const point = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };

    const area = await Area.findOne({
      polygon: { $geoIntersects: { $geometry: point } },
      isActive: true
    });

    if (!area) {
      return res.status(400).json({
        success: false,
        message: 'Sorry, we do not deliver to this location yet.'
      });
    }

    const menu = await MenuItem.find({
      isAvailable: true,
      $or: [
        { availableInAreas: { $size: 0 } },
        { availableInAreas: area._id }
      ]
    }).sort({ category: 1, name: 1 });

    res.json({ success: true, area: area.name, city: area.city, menu });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const updateMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.file) {
      if (item.cloudinaryId) await cloudinary.uploader.destroy(item.cloudinaryId);
      const result = await uploadToCloudinary(req.file.buffer);
      item.image = result.secure_url;
      item.cloudinaryId = result.public_id;
    }

    item.set({
      name: req.body.name?.trim() || item.name,
      description: req.body.description?.trim() || item.description,
      price: req.body.price ? Number(req.body.price) : item.price,
      category: req.body.category || item.category,
      availableInAreas: req.body.availableInAreas ? JSON.parse(req.body.availableInAreas) : item.availableInAreas,
      isVeg: req.body.isVeg !== undefined ? req.body.isVeg === 'true' : item.isVeg,
      isSpicy: req.body.isSpicy !== undefined ? req.body.isSpicy === 'true' : item.isSpicy,
      isAvailable: req.body.isAvailable !== 'false'
    });

    await item.save();
    res.json({ success: true, message: 'Updated!', item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    if (item.cloudinaryId) await cloudinary.uploader.destroy(item.cloudinaryId);
    res.json({ success: true, message: 'Deleted!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

const getAllMenuItems = async (req, res) => {
  const items = await MenuItem.find().sort({ category: 1, name: 1 });
  res.json({ success: true, items });
};

module.exports = {
  getMenuByLocation,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getAllMenuItems
};