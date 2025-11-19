// src/controllers/menu/menuController.js
const mongoose = require('mongoose');
const MenuItem = require('../../models/menuItem/MenuItem');
const Area = require('../../models/area/Area');
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
      (error, result) => (error ? reject(error) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

const addMenuItem = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Image is required' });
    const result = await uploadFromBuffer(req.file.buffer);
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
    res.status(201).json({ success: true, message: 'Menu item added successfully!', item });
  } catch (err) {
    console.error('addMenuItem error:', err);
    res.status(500).json({ success: false, message: 'Failed to add item' });
  }
};

const getMenuByLocation = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });
    const point = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };
    const area = await Area.findOne({
      polygon: { $geoIntersects: { $geometry: point } },
      isActive: true
    });
    if (!area) return res.status(400).json({ success: false, message: 'Delivery not available in this area' });
    const menu = await MenuItem.find({
      isAvailable: true,
      $or: [{ availableInAreas: { $size: 0 } }, { availableInAreas: area._id }]
    }).sort({ category: 1, name: 1 });
    res.json({ success: true, area: area.name, city: area.city, menu });
  } catch (err) {
    console.error('getMenuByLocation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (req.file) {
      if (item.cloudinaryId) await cloudinary.uploader.destroy(item.cloudinaryId);
      const result = await uploadFromBuffer(req.file.buffer);
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
    res.json({ success: true, message: 'Menu item updated successfully!', item });
  } catch (err) {
    console.error('updateMenuItem error:', err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.cloudinaryId) await cloudinary.uploader.destroy(item.cloudinaryId);
    res.json({ success: true, message: 'Menu item deleted successfully!' });
  } catch (err) {
    console.error('deleteMenuItem error:', err);
    res.status(500).json({ success: false, message: 'Delete failed' });
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

const toggleAvailability = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json({ success: true, message: `Item ${item.isAvailable ? 'enabled' : 'disabled'}`, item });
  } catch (err) {
    console.error('toggleAvailability error:', err);
    res.status(500).json({ success: false, message: 'Toggle failed' });
  }
};

const getAllMenuItemsWithFilters = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      category,
      isVeg,
      isSpicy,
      minPrice,
      maxPrice,
      search,
      availableOnly = 'true',
      sort = 'category_asc' // new: default sorting
    } = req.query;

    const query = {};
    if (availableOnly === 'true') query.isAvailable = true;
    if (category) query.category = category;
    if (isVeg !== undefined) query.isVeg = isVeg === 'true';
    if (isSpicy !== undefined) query.isSpicy = isSpicy === 'true';
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search && search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      query.$or = [{ name: regex }, { description: regex }];
    }

    let sortOption = {};
    switch (sort) {
      case 'name_asc':   sortOption = { name: 1 }; break;
      case 'name_desc':  sortOption = { name: -1 }; break;
      case 'price_asc':  sortOption = { price: 1 }; break;
      case 'price_desc': sortOption = { price: -1 }; break;
      case 'newest':     sortOption = { createdAt: -1 }; break;
      case 'oldest':     sortOption = { createdAt: 1 }; break;
      case 'category_asc':
      default:           sortOption = { category: 1, name: 1 }; break;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      MenuItem.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .select('-cloudinaryId -__v')
        .lean(),
      MenuItem.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      items
    });
  } catch (err) {
    console.error('getAllMenuItemsWithFilters error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSingleMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid menu item ID' });

    const item = await MenuItem.findById(id).select('-cloudinaryId -__v').lean();
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });
    if (!item.isAvailable)
      return res.status(404).json({ success: false, message: 'This item is currently unavailable' });

    res.json({ success: true, item });
  } catch (err) {
    console.error('getSingleMenuItem error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  addMenuItem,
  getMenuByLocation,
  updateMenuItem,
  deleteMenuItem,
  getAllMenuItems,
  toggleAvailability,
  getAllMenuItemsWithFilters,
  getSingleMenuItem
};