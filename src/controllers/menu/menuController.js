// src/controllers/menu/menuController.js
const mongoose = require('mongoose');
const MenuItem = require('../../models/menuItem/MenuItem');
const Area = require('../../models/area/Area');
const cloudinary = require('../../config/cloudinary');
const streamifier = require('streamifier');

// Reusable Cloudinary upload
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'foodapp/menu',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto:best', fetch_format: 'webp' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// ADD NEW MENU ITEM
const addMenuItem = async (req, res) => {
  try {
    // Image is required
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    // Upload image to Cloudinary
    const image = await uploadToCloudinary(req.file.buffer);

    // availableInAreas is already validated & cleaned by express-validator
    // It is guaranteed to be a clean array of valid ObjectIds (or empty)
    const areaIds = Array.isArray(req.body.availableInAreas)
      ? req.body.availableInAreas
      : [];

    // Parse booleans safely
    const isVeg = req.body.isVeg === true || req.body.isVeg === 'true';
    const isSpicy = req.body.isSpicy === true || req.body.isSpicy === 'true';

    // Create menu item
    const item = await MenuItem.create({
      name: req.body.name.trim(),
      description: req.body.description?.trim() || '',
      price: Number(req.body.price),
      category: req.body.category,
      image: image.secure_url,
      cloudinaryId: image.public_id,
      availableInAreas: areaIds, // Clean & safe
      isVeg,
      isSpicy,
      isAvailable: true
    });

    return res.status(201).json({
      success: true,
      message: 'Menu item added successfully!',
      item
    });

  } catch (err) {
    console.error('addMenuItem error:', err);

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to add item',
      error: err.message
    });
  }
};

// GET MENU BASED ON USER LOCATION
const getMenuByLocation = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const point = {
      type: 'Point',
      coordinates: [parseFloat(lng), parseFloat(lat)]
    };

    const area = await Area.findOne({
      isActive: true,
      polygon: { $geoIntersects: { $geometry: point } }
    }).select('name city _id');

    if (!area) {
      return res.status(400).json({
        success: false,
        message: "Sorry, we don't deliver to this location yet"
      });
    }

    const menu = await MenuItem.find({
      isAvailable: true,
      $or: [
        { availableInAreas: { $size: 0 } }, // Global items
        { availableInAreas: area._id }
      ]
    })
      .sort({ category: 1, name: 1 })
      .select('-cloudinaryId -__v')
      .lean();

    res.json({
      success: true,
      area: area.name,
      city: area.city,
      menu
    });
  } catch (err) {
    console.error('getMenuByLocation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// UPDATE MENU ITEM
const updateMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Handle image update
    if (req.file) {
      if (item.cloudinaryId) {
        await cloudinary.uploader.destroy(item.cloudinaryId).catch(() => {});
      }
      const result = await uploadToCloudinary(req.file.buffer);
      item.image = result.secure_url;
      item.cloudinaryId = result.public_id;
    }

    // Update text fields
    if (req.body.name !== undefined) item.name = req.body.name.trim();
    if (req.body.description !== undefined) item.description = req.body.description.trim();
    if (req.body.price !== undefined) item.price = Number(req.body.price);
    if (req.body.category !== undefined) item.category = req.body.category;

    // Booleans
    if (req.body.isVeg !== undefined) {
      item.isVeg = req.body.isVeg === true || req.body.isVeg === 'true';
    }
    if (req.body.isSpicy !== undefined) {
      item.isSpicy = req.body.isSpicy === true || req.body.isSpicy === 'true';
    }
    if (req.body.isAvailable !== undefined) {
      item.isAvailable = req.body.isAvailable === true || req.body.isAvailable === 'true';
    }

    // availableInAreas – already validated and cleaned
    if (req.body.availableInAreas !== undefined) {
      const areas = Array.isArray(req.body.availableInAreas)
        ? req.body.availableInAreas
        : [];
      item.availableInAreas = areas;
    }

    await item.save();

    res.json({
      success: true,
      message: 'Menu item updated successfully!',
      item
    });
  } catch (err) {
    console.error('updateMenuItem error:', err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

// DELETE MENU ITEM
const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (item.cloudinaryId) {
      await cloudinary.uploader.destroy(item.cloudinaryId).catch(() => {});
    }

    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (err) {
    console.error('deleteMenuItem error:', err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

// ADMIN: GET ALL ITEMS
const getAllMenuItems = async (req, res) => {
  try {
    const items = await MenuItem.find()
      .sort({ category: 1, name: 1 })
      .select('-cloudinaryId -__v');

    res.json({ success: true, items });
  } catch (err) {
    console.error('getAllMenuItems error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// TOGGLE AVAILABILITY
const toggleAvailability = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    item.isAvailable = req.body.isAvailable;
    await item.save();

    res.json({
      success: true,
      message: item.isAvailable ? 'Item is now available' : 'Item is now unavailable',
      item
    });
  } catch (err) {
    console.error('toggleAvailability error:', err);
    res.status(500).json({ success: false, message: 'Failed to toggle availability' });
  }
};

// PUBLIC: FILTERED MENU WITH PAGINATION
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
      sort = 'category_asc'
    } = req.query;

    const query = { isAvailable: availableOnly === 'true' };

    if (category) query.category = category;
    if (isVeg !== undefined) query.isVeg = isVeg === 'true';
    if (isSpicy !== undefined) query.isSpicy = isSpicy === 'true';

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search?.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      query.$or = [{ name: regex }, { description: regex }];
    }

    const sortOptions = {
      name_asc: { name: 1 },
      name_desc: { name: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      category_asc: { category: 1, name: 1 }
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      MenuItem.find(query)
        .sort(sortOptions[sort] || sortOptions.category_asc)
        .skip(skip)
        .limit(limitNum)
        .select('-cloudinaryId -__v')
        .lean(),
      MenuItem.countDocuments(query)
    ]);

    res.json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      items
    });
  } catch (err) {
    console.error('getAllMenuItemsWithFilters error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET SINGLE MENU ITEM
const getSingleMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const item = await MenuItem.findById(id)
      .select('-cloudinaryId -__v')
      .lean();

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (!item.isAvailable) {
      return res.status(404).json({ success: false, message: 'This item is currently unavailable' });
    }

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