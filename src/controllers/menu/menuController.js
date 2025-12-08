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
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    const image = await uploadToCloudinary(req.file.buffer);

    let areaIds = [];
    if (req.body.availableInAreas) {
      if (Array.isArray(req.body.availableInAreas)) {
        areaIds = req.body.availableInAreas;
      } else if (typeof req.body.availableInAreas === 'string') {
        try {
          const parsed = JSON.parse(req.body.availableInAreas);
          areaIds = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          areaIds = [req.body.availableInAreas];
        }
      }
    }
    areaIds = areaIds.filter(id => mongoose.Types.ObjectId.isValid(id));

    const isVeg = req.body.isVeg === true || req.body.isVeg === 'true';
    const isSpicy = req.body.isSpicy === true || req.body.isSpicy === 'true';

    const item = await MenuItem.create({
      name: req.body.name?.trim(),
      description: req.body.description?.trim() || '',
      price: Number(req.body.price),
      category: req.body.category,
      image: image.secure_url,
      cloudinaryId: image.public_id,
      availableInAreas: areaIds,
      isVeg,
      isSpicy,
      isAvailable: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Menu item added successfully!',
      item,
    });
  } catch (err) {
    console.error('addMenuItem error:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
    }
    return res.status(500).json({ success: false, message: 'Failed to add menu item' });
  }
};

// GET MENU BY USER LOCATION (lat/lng)
// src/controllers/menu/menuController.js

const getMenuByLocation = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    // Validate coordinates
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates format',
      });
    }

    // Optional: Reject outside Pakistan
    if (latNum < 23.5 || latNum > 37.5 || lngNum < 60.0 || lngNum > 78.0) {
      return res.json({
        success: true,
        inService: false,
        hasDeliveryZone: false,
        message: 'Location outside Pakistan',
        area: null,
        delivery: null,
        menu: []
      });
    }

    // GeoJSON Point: MongoDB expects [longitude, latitude]
    const point = {
      type: 'Point',
      coordinates: [lngNum, latNum],
    };

    // Find active area that contains this point
    const area = await Area.findOne({
      isActive: true,
      polygon: { $geoIntersects: { $geometry: point } },
    })
      .select('name city _id center')
      .lean();

    // Not in any active delivery zone
    if (!area) {
      return res.json({
        success: true,
        inService: false,
        hasDeliveryZone: false,
        area: null,
        delivery: null,
        menu: [],
        message: "Sorry, we don't deliver to this location yet",
      });
    }

    // Find menu items available in this area
    const menu = await MenuItem.find({
      isAvailable: true,
      $or: [
        { availableInAreas: { $size: 0 } },           // Global items (everywhere)
        { availableInAreas: area._id },               // Specific to this area
      ],
    })
      .sort({ category: 1, name: 1 })
      .select('-cloudinaryId -__v')
      .lean();

    // Final response
    return res.json({
      success: true,
      inService: true,
      hasDeliveryZone: true,
      area: {
        _id: area._id,
        name: area.name,
        city: area.city,
        center: area.centerLatLng || {
          lat: Number(area.center.coordinates[1].toFixed(6)),
          lng: Number(area.center.coordinates[0].toFixed(6)),
        },
      },
      delivery: {
        fee: 149,
        estimatedTime: '35-50 mins',
      },
      menu,
      message: `Welcome to ${area.name}! ${menu.length} items available`,
    });
  } catch (err) {
    console.error('getMenuByLocation error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// UPDATE MENU ITEM
const updateMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    if (req.file) {
      if (item.cloudinaryId) await cloudinary.uploader.destroy(item.cloudinaryId).catch(() => {});
      const result = await uploadToCloudinary(req.file.buffer);
      item.image = result.secure_url;
      item.cloudinaryId = result.public_id;
    }

    if (req.body.name !== undefined) item.name = req.body.name.trim();
    if (req.body.description !== undefined) item.description = req.body.description?.trim();
    if (req.body.price !== undefined) item.price = Number(req.body.price);
    if (req.body.category !== undefined) item.category = req.body.category;
    if (req.body.isVeg !== undefined) item.isVeg = req.body.isVeg === true || req.body.isVeg === 'true';
    if (req.body.isSpicy !== undefined) item.isSpicy = req.body.isSpicy === true || req.body.isSpicy === 'true';
    if (req.body.isAvailable !== undefined) item.isAvailable = req.body.isAvailable === true || req.body.isAvailable === 'true';

    if (req.body.availableInAreas !== undefined) {
      const areas = Array.isArray(req.body.availableInAreas) ? req.body.availableInAreas : [];
      item.availableInAreas = areas.filter(id => mongoose.Types.ObjectId.isValid(id));
    }

    await item.save();

    res.json({ success: true, message: 'Menu item updated successfully!', item });
  } catch (err) {
    console.error('updateMenuItem error:', err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

// DELETE MENU ITEM
const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    if (item.cloudinaryId) {
      await cloudinary.uploader.destroy(item.cloudinaryId).catch(() => {});
    }

    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (err) {
    console.error('deleteMenuItem error:', err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

// ADMIN: GET ALL MENU ITEMS (including unavailable)
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
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

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

// PUBLIC: FILTERED + PAGINATED MENU
const getAllMenuItemsWithFilters = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      category,
      isVeg: isVegStr,
      isSpicy: isSpicyStr,
      minPrice,
      maxPrice,
      search,
      sort = 'category_asc',
      availableOnly = 'true'
    } = req.query;

    const query = {};

    if (availableOnly === 'true' || availableOnly === true) {
      query.isAvailable = true;
    }

    if (category && typeof category === 'string') query.category = category;
    if (isVegStr !== undefined) query.isVeg = isVegStr === 'true';
    if (isSpicyStr !== undefined) query.isSpicy = isSpicyStr === 'true';

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search && typeof search === 'string' && search.trim()) {
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

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
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
    res.status(500).json({ success: false, message: 'Failed to fetch menu items' });
  }
};

// GET SINGLE MENU ITEM (PUBLIC)
const getSingleMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    const item = await MenuItem.findById(id)
      .select('-cloudinaryId -__v')
      .lean();

    if (!item || !item.isAvailable) {
      return res.status(404).json({ success: false, message: 'Item not found or unavailable' });
    }

    res.json({ success: true, item });
  } catch (err) {
    console.error('getSingleMenuItem error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET ALL AVAILABLE MENU (Simple catalog)
const getAllAvailableMenuItems = async (req, res) => {
  try {
    const menu = await MenuItem.find({ isAvailable: true })
      .sort({ category: 1, name: 1 })
      .select('-cloudinaryId -__v')
      .lean();

    res.json({
      success: true,
      message: "Full menu catalog",
      totalItems: menu.length,
      menu
    });
  } catch (err) {
    console.error('getAllAvailableMenuItems error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET MENU BY AREA ID (Public)
const getMenuByAreaId = async (req, res) => {
  try {
    const { areaId } = req.params;

    const area = await Area.findOne({ _id: areaId, isActive: true }).select('name city center');
    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Delivery area not found or currently unavailable'
      });
    }

    const menu = await MenuItem.find({
      isAvailable: true,
      $or: [
        { availableInAreas: { $size: 0 } },
        { availableInAreas: areaId }
      ]
    })
      .sort({ category: 1, name: 1 })
      .select('-cloudinaryId -__v')
      .lean();

    res.json({
      success: true,
      area: {
        _id: area._id,
        name: area.name,
        city: area.city,
        center: area.center ? {
          lat: area.center.coordinates[1],
          lng: area.center.coordinates[0]
        } : null
      },
      totalItems: menu.length,
      menu
    });
  } catch (err) {
    console.error('getMenuByAreaId error:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching menu for area' });
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
  getSingleMenuItem,
  getAllAvailableMenuItems,
  getMenuByAreaId
};