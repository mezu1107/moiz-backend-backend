// src/controllers/rider/riderController.js
const User = require('../../models/user/User');
const Order = require('../../models/order/Order');
const io = global.io;

const updateLocation = async (req, res) => {
  const { lat, lng } = req.body;

  try {
    const rider = await User.findByIdAndUpdate(
      req.user.id,
      {
        currentLocation: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        locationUpdatedAt: new Date(),
        isOnline: true,
        isAvailable: true
      },
      { new: true }
    ).select('name currentLocation');

    if (io) {
      io.to('admin_room').emit('riderLocationUpdate', {
        riderId: req.user.id,
        name: rider.name,
        location: rider.currentLocation,
        timestamp: new Date()
      });
    }

    res.json({ success: true, message: 'Location updated' });
  } catch (err) {
    console.error('Rider: updateLocation error:', err);
    res.status(500).json({ success: false, message: 'Failed to update location' });
  }
};

const toggleAvailability = async (req, res) => {
  try {
    const rider = await User.findById(req.user.id);
    if (rider.riderStatus !== 'approved') {
      return res.status(403).json({ success: false, message: 'Not approved yet' });
    }

    rider.isAvailable = !rider.isAvailable;
    await rider.save();

    if (io) {
      io.to('admin_room').emit('riderStatusUpdate', {
        riderId: rider._id,
        name: rider.name,
        isAvailable: rider.isAvailable
      });
    }

    res.json({ success: true, isAvailable: rider.isAvailable });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

const updateOrderLocation = async (req, res) => {
  const { lat, lng } = req.body;
  const orderId = req.params.id;

  try {
    await User.findByIdAndUpdate(req.user.id, {
      currentLocation: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      locationUpdatedAt: new Date()
    });

    if (io) {
      io.to(`order:${orderId}`).emit('riderLocation', { lat, lng });
    }

    res.json({ success: true, message: 'Tracking updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

const getMyOrders = async (req, res) => {
  const orders = await Order.find({ rider: req.user.id })
    .populate('customer', 'name phone')
    .populate('address', 'label fullAddress')
    .populate('area', 'name')
    .sort({ placedAt: -1 });

  res.json({ success: true, orders });
};

const getRiderProfile = async (req, res) => {
  const rider = await User.findById(req.user.id)
    .select('name phone email riderStatus riderDocuments rating totalDeliveries earnings isOnline isAvailable');

  res.json({ success: true, rider });
};

const applyAsRider = async (req, res) => {
  const {
    cnicNumber,
    vehicleType,
    vehicleNumber,
    cnicFront,
    cnicBack,
    drivingLicense,
    riderPhoto
  } = req.body;

  try {
    const rider = await User.findById(req.user.id);

    if (rider.role === 'rider' || rider.riderStatus !== 'none') {
      return res.status(400).json({
        success: false,
        message: 'You have already applied or are a rider'
      });
    }

    // Validate required docs
    if (!cnicNumber || !vehicleNumber || !cnicFront || !cnicBack || !drivingLicense || !riderPhoto) {
      return res.status(400).json({
        success: false,
        message: 'All documents and vehicle info are required'
      });
    }

    rider.riderStatus = 'pending';
    rider.riderDocuments = {
      cnicNumber: cnicNumber.trim(),
      vehicleType: vehicleType || 'bike',
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      cnicFront,
      cnicBack,
      drivingLicense,
      riderPhoto
    };

    await rider.save();

    // Notify admin via socket (optional)
    if (global.io) {
      global.io.to('admin_room').emit('newRiderApplication', {
        riderId: rider._id,
        name: rider.name,
        phone: rider.phone,
        appliedAt: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Application submitted! Admin will review within 24 hours.',
      status: 'pending'
    });
  } catch (err) {
    console.error('Apply Rider Error:', err);
    res.status(500).json({ success: false, message: 'Application failed' });
  }
};


module.exports = {
  updateLocation,
  toggleAvailability,
  updateOrderLocation,
  getMyOrders,
  getRiderProfile,
  applyAsRider
};