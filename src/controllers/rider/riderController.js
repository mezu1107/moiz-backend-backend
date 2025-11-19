// src/controllers/rider/riderController.js
const Rider = require('../../models/rider/Rider');
const Order = require('../../models/order/Order');
const User = require('../../models/user/User');
const io = global.io;

const updateLocation = async (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });

  try {
    const rider = await Rider.findOneAndUpdate(
      { user: req.user.id },
      {
        currentLocation: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        isAvailable: true,
        isOnline: true
      },
      { new: true }
    );

    if (io) io.to('admin_room').emit('riderLocationUpdate', { riderId: rider.user, location: rider.currentLocation });
    res.json({ success: true, message: 'Location updated', location: rider.currentLocation });
  } catch (err) {
    console.error('updateLocation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const toggleAvailability = async (req, res) => {
  try {
    const rider = await Rider.findOne({ user: req.user.id });
    if (!rider) return res.status(404).json({ success: false, message: 'Rider profile not found' });

    rider.isAvailable = !rider.isAvailable;
    await rider.save();

    if (io) io.to('admin_room').emit('riderStatusUpdate', {
      riderId: rider.user.toString(),
      isAvailable: rider.isAvailable,
      isOnline: rider.isOnline
    });

    res.json({ success: true, isAvailable: rider.isAvailable });
  } catch (err) {
    console.error('toggleAvailability error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateOrderLocation = async (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;
  if (!lat || !lng || !id) return res.status(400).json({ success: false, message: 'Missing data' });

  try {
    const rider = await Rider.findOneAndUpdate(
      { user: req.user.id },
      { currentLocation: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] } },
      { new: true }
    );

    if (io) {
      io.to(`order:${id}`).emit('riderLocation', {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        timestamp: new Date()
      });
    }

    res.json({ success: true, message: 'Live location updated' });
  } catch (err) {
    console.error('updateOrderLocation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAllRiders = async (req, res) => {
  try {
    const riders = await Rider.find()
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, total: riders.length, riders });
  } catch (err) {
    console.error('getAllRiders error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getRiderById = async (req, res) => {
  try {
    let rider;
    if (req.params.id === 'me' || !req.params.id) {
      rider = await Rider.findOne({ user: req.user.id }).populate('user', 'name email phone');
    } else {
      rider = await Rider.findById(req.params.id).populate('user', 'name email phone');
    }

    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    res.json({ success: true, rider });
  } catch (err) {
    console.error('getRiderById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createRider = async (req, res) => {
  const { userId, licenseNumber, vehicleType = 'bike' } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const existing = await Rider.findOne({ user: userId });
    if (existing) return res.status(400).json({ success: false, message: 'Rider already exists' });

    const rider = await Rider.create({
      user: userId,
      licenseNumber,
      vehicleType
    });

    await rider.populate('user', 'name email phone');
    res.status(201).json({ success: true, message: 'Rider created', rider });
  } catch (err) {
    console.error('createRider error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateRider = async (req, res) => {
  const { licenseNumber, vehicleType } = req.body;
  try {
    const rider = await Rider.findByIdAndUpdate(
      req.params.id,
      { licenseNumber, vehicleType },
      { new: true, runValidators: true }
    ).populate('user', 'name email phone');

    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    res.json({ success: true, message: 'Rider updated', rider });
  } catch (err) {
    console.error('updateRider error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateRiderStatus = async (req, res) => {
  const { isOnline, isAvailable } = req.body;
  try {
    const update = {};
    if (isOnline !== undefined) update.isOnline = isOnline;
    if (isAvailable !== undefined) update.isAvailable = isAvailable;

    const rider = await Rider.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).populate('user', 'name email phone');

    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });

    if (io) {
      io.to('admin_room').emit('riderStatusUpdate', {
        riderId: rider.user._id,
        isOnline: rider.isOnline,
        isAvailable: rider.isAvailable
      });
    }

    res.json({ success: true, message: 'Status updated', rider });
  } catch (err) {
    console.error('updateRiderStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const rider = await Rider.findOne({ user: req.user.id });
    if (!rider) return res.status(404).json({ success: false, message: 'Rider profile not found' });

    const orders = await Order.find({ rider: rider._id })
      .populate('customer', 'name phone')
      .populate('address', 'label fullAddress location')
      .populate('area', 'name')
      .sort({ placedAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error('getMyOrders error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const getRiderProfile = async (req, res) => {
  try {
    const rider = await Rider.findOne({ user: req.user.id })
      .populate('user', 'name phone email')
      .select('-__v');

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider profile not found' });
    }

    res.json({ success: true, rider });
  } catch (err) {
    console.error('getRiderProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  updateLocation,
  toggleAvailability,
  updateOrderLocation,
  getAllRiders,
  getRiderById,
  createRider,
  updateRider,
  updateRiderStatus,
  getMyOrders,
  getRiderProfile
};