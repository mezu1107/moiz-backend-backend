// src/controllers/rider/riderController.js
const User = require('../../models/user/User');
const Order = require('../../models/order/Order');
const { sendNotification } = require('../../utils/fcm');
const io = global.io;

// 1. Update Rider Location
const updateLocation = async (req, res) => {
  const { lat, lng } = req.body;

  try {
    const rider = await User.findByIdAndUpdate(
      req.user._id,
      {
        currentLocation: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)]
        },
        locationUpdatedAt: new Date(),
        isOnline: true,
        isAvailable: true
      },
      { new: true }
    ).select('name');

    // Notify admin dashboard
    if (io) {
      io.to('admin_room').emit('riderLocationUpdate', {
        riderId: req.user._id,
        name: rider.name,
        location: { lat, lng },
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      isOnline: true,
      isAvailable: true
    });
  } catch (err) {
    console.error('Update Location Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update location' });
  }
};

// 2. Toggle Online/Available
const toggleAvailability = async (req, res) => {
  try {
    const rider = await User.findById(req.user._id);

    rider.isAvailable = !rider.isAvailable;
    if (!rider.isAvailable) rider.isOnline = false;

    await rider.save();

    if (io) {
      io.to('admin_room').emit('riderAvailabilityChanged', {
        riderId: rider._id,
        name: rider.name,
        isAvailable: rider.isAvailable,
        isOnline: rider.isOnline
      });
    }

    res.json({
      success: true,
      message: rider.isAvailable ? 'You are now online and available' : 'You are now offline',
      isAvailable: rider.isAvailable,
      isOnline: rider.isOnline
    });
  } catch (err) {
    console.error('Toggle Availability Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update availability' });
  }
};

// 3. Update location during order delivery
const updateOrderLocation = async (req, res) => {
  const { lat, lng } = req.body;
  const orderId = req.params.id;

  try {
    await User.findByIdAndUpdate(req.user._id, {
      currentLocation: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      locationUpdatedAt: new Date()
    });

    // Send live location to customer
    if (io) {
      io.to(`order:${orderId}`).emit('riderLiveLocation', { lat, lng });
    }

    res.json({ success: true, message: 'Live tracking updated' });
  } catch (err) {
    console.error('Update Order Location Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update tracking' });
  }
};

// 4. Get Rider's Orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ rider: req.user._id })
      .populate('customer', 'name phone')
      .populate('address', 'label fullAddress floor instructions')
      .populate('area', 'name')
      .sort({ placedAt: -1 })
      .lean();

    res.json({
      success: true,
      message: orders.length ? 'Orders fetched' : 'No orders yet',
      count: orders.length,
      orders
    });
  } catch (err) {
    console.error('Get My Orders Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// 5. Get Rider Profile
const getRiderProfile = async (req, res) => {
  try {
    const rider = await User.findById(req.user._id)
      .select('name phone email riderStatus riderDocuments rating totalDeliveries earnings isOnline isAvailable currentLocation');

    res.json({
      success: true,
      message: 'Profile fetched successfully',
      rider
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 6. Apply to Become Rider (Customer → Rider)
const applyAsRider = async (req, res) => {
  const {
    cnicNumber,
    vehicleType = 'bike',
    vehicleNumber,
    cnicFront,
    cnicBack,
    drivingLicense,
    riderPhoto
  } = req.body;

  try {
    const user = await User.findById(req.user._id);

    // Already rider?
    if (user.role === 'rider') {
      return res.status(400).json({
        success: false,
        message: 'You are already a rider!'
      });
    }

    // Already applied?
    if (user.riderStatus === 'pending') {
      return res.status(200).json({
        success: true,
        message: 'Your application is already under review',
        status: 'pending'
      });
    }

    if (user.riderStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Your previous application was rejected',
        reason: user.rejectionReason || 'Invalid documents',
        tip: 'Please upload clear images and correct info'
      });
    }

    if (user.riderStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'You are already approved as rider'
      });
    }

    // Save application
    user.riderStatus = 'pending';
    user.riderDocuments = {
      cnicNumber: cnicNumber.trim(),
      vehicleType,
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      cnicFront,
      cnicBack,
      drivingLicense,
      riderPhoto
    };
    user.rejectionReason = null;

    await user.save();

    // Notify Admin Panel
    if (io) {
      io.to('admin_room').emit('newRiderApplication', {
        userId: user._id,
        name: user.name,
        phone: user.phone,
        appliedAt: new Date()
      });
    }

    // Notify User
    if (user.fcmToken) {
      await sendNotification(
        user.fcmToken,
        "Application Submitted",
        "We have received your rider application. You'll be notified once approved!"
      );
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully! Waiting for admin approval.',
      status: 'pending'
    });

  } catch (err) {
    console.error('Apply As Rider Error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application. Please try again.'
    });
  }
};

// 7. Check Application Status
const getApplicationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('role riderStatus rejectionReason');

    if (user.role === 'rider') {
      return res.json({
        success: true,
        isRider: true,
        message: 'You are an approved rider',
        riderStatus: 'approved'
      });
    }

    const status = user.riderStatus || 'none';

    const messages = {
      pending: 'Your application is under review',
      rejected: 'Application rejected',
      none: 'No application submitted'
    };

    res.json({
      success: true,
      isRider: false,
      riderStatus: status,
      message: messages[status] || 'Unknown status',
      rejectionReason: user.rejectionReason || null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  updateLocation,
  toggleAvailability,
  updateOrderLocation,
  getMyOrders,
  getRiderProfile,
  applyAsRider,
  getApplicationStatus
};