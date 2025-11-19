// src/controllers/admin/adminController.js
const MenuItem = require('../../models/menuItem/MenuItem');
const Area = require('../../models/area/Area');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');
const cloudinary = require('../../config/cloudinary');
const streamifier = require('streamifier');

const uploadFromBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'foodapp/menu',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ],
        format: 'webp'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};



const addArea = async (req, res) => {
  try {
    const { name, city = 'Lahore', polygon, center } = req.body;

    if (!name || !polygon || !center) {
      return res.status(400).json({ success: false, message: 'Name, polygon, and center are required' });
    }

    const area = await Area.create({
      name: name.trim(),
      city,
      polygon,
      center,
      isActive: true
    });

    res.status(201).json({ success: true, message: 'Area added successfully!', area });
  } catch (err) {
    console.error('addArea error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Area with this name already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to add area' });
  }
};

const setDeliveryZone = async (req, res) => {
  try {
    const { areaId, deliveryFee = 149, minOrderAmount = 0, estimatedTime = '35-50 min' } = req.body;

    if (!areaId) {
      return res.status(400).json({ success: false, message: 'areaId is required' });
    }

    const zone = await DeliveryZone.findOneAndUpdate(
      { area: areaId },
      {
        deliveryFee: Number(deliveryFee),
        minOrderAmount: Number(minOrderAmount),
        estimatedTime: estimatedTime.trim(),
        isActive: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('area', 'name city');

    res.json({ success: true, message: 'Delivery zone updated successfully', zone });
  } catch (err) {
    console.error('setDeliveryZone error:', err);
    res.status(500).json({ success: false, message: 'Failed to set delivery zone' });
  }
};

module.exports = { addArea, setDeliveryZone };