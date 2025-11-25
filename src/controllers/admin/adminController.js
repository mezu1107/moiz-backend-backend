// src/controllers/admin/adminController.js
const Area = require('../../models/area/Area');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');
const cloudinary = require('../../config/cloudinary');
const streamifier = require('streamifier');

const uploadFromBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'foodapp/areas',
        transformation: [{ width: 1200, crop: 'limit' }, { quality: 'auto' }],
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
      return res.status(400).json({ success: false, message: 'Name, polygon, and center required' });
    }

    const existing = await Area.findOne({
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
      city
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Area already exists' });
    }

    const area = await Area.create({
      name: name.trim(),
      city,
      polygon, // ← no JSON.parse
      center,  // ← no JSON.parse
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Area added successfully',
      area
    });
  } catch (err) {
    console.error('addArea error:', err);
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

    res.json({
      success: true,
      message: 'Delivery zone updated',
      zone
    });
  } catch (err) {
    console.error('setDeliveryZone error:', err);
    res.status(500).json({ success: false, message: 'Failed to set delivery zone' });
  }
};

module.exports = { addArea, setDeliveryZone };