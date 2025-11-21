// src/controllers/rider/riderController.js
const User = require('../../models/user/User');
const Order = require('../../models/order/Order');
const { sendNotification } = require('../../utils/fcm');
const io = global.io;

// ====================== RIDER ENDPOINTS ======================

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
    ).select('name currentLocation isOnline isAvailable');

    if (io) {
      io.to('admin_room').emit('riderLocationUpdate', {
        riderId: req.user.id,
        name: rider.name,
        location: rider.currentLocation,
        isAvailable: rider.isAvailable,
        timestamp: new Date()
      });
    }

    res.json({ success: true, message: 'Location updated', location: rider.currentLocation });
  } catch (err) {
    console.error('updateLocation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const toggleAvailability = async (req, res) => {
  try {
    const rider = await User.findById(req.user.id);
    if (!rider || rider.role !== 'rider' || rider.riderStatus !== 'approved') {
      return res.status(403).json({ success: false, message: 'Not an approved rider' });
    }

    rider.isAvailable = !rider.isAvailable;
    await rider.save();

    if (io) {
      io.to('admin_room').emit('riderStatusUpdate', {
        riderId: rider._id.toString(),
        name: rider.name,
        isAvailable: rider.isAvailable,
        isOnline: rider.isOnline
      });
    }

    res.json({ success: true, isAvailable: rider.isAvailable });
  } catch (err) {
    console.error('toggleAvailability error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateOrderLocation = async (req, res) => {
  const { lat, lng } = req.body;
  const { id: orderId } = req.params;

  try {
    await User.findByIdAndUpdate(req.user.id, {
      currentLocation: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      locationUpdatedAt: new Date()
    });

    if (io) {
      io.to(`order:${orderId}`).emit('riderLocation', {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        timestamp: new Date()
      });
    }

    res.json({ success: true, message: 'Live tracking updated' });
  } catch (err) {
    console.error('updateOrderLocation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ rider: req.user.id })
      .populate('customer', 'name phone')
      .populate('address', 'label fullAddress location')
      .populate('area', 'name')
      .sort({ placedAt: -1 });

    res.json({ success: true, total: orders.length, orders });
  } catch (err) {
    console.error('getMyOrders error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getRiderProfile = async (req, res) => {
  try {
    const rider = await User.findById(req.user.id)
      .select('name phone email riderStatus riderDocuments currentLocation isOnline isAvailable rating totalDeliveries earnings');

    res.json({ success: true, rider });
  } catch (err) {
    console.error('getRiderProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====================== ADMIN ENDPOINTS ======================

const getAllRiders = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = { role: 'rider' };

    if (status && ['none', 'pending', 'approved', 'rejected'].includes(status)) {
      query.riderStatus = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const riders = await User.find(query)
      .select('name phone email riderStatus isOnline isAvailable currentLocation rating totalDeliveries createdAt')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({ success: true, total, page: parseInt(page), riders });
  } catch (err) {
    console.error('getAllRiders error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getRiderById = async (req, res) => {
  try {
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid rider ID' });
    }

    const rider = await User.findById(req.params.id)
      .select('name phone email riderStatus riderDocuments currentLocation isOnline isAvailable rating totalDeliveries earnings');

    if (!rider || rider.role !== 'rider') {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    res.json({ success: true, rider });
  } catch (err) {
    console.error('getRiderById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateRiderStatus = async (req, res) => {
  const { riderStatus } = req.body;

  if (!riderStatus || !['pending', 'approved', 'rejected'].includes(riderStatus)) {
    return res.status(400).json({
      success: false,
      message: 'riderStatus is required and must be: pending, approved, or rejected'
    });
  }

  if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ success: false, message: 'Invalid rider ID' });
  }

  try {
    const rider = await User.findByIdAndUpdate(
      req.params.id,
      {
        riderStatus,
        isAvailable: riderStatus === 'approved',
        isOnline: riderStatus === 'approved'
      },
      { new: true, runValidators: true }
    ).select('name phone riderStatus isAvailable isOnline fcmToken');

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    // Socket.IO real-time
    if (io) {
      io.to(`rider:${req.params.id}`).emit('riderStatusChanged', { riderStatus });
    }

    // FCM Push Notification
    if (rider.fcmToken) {
      const messages = {
        approved: { title: "Approved as Rider!", body: `Congratulations ${rider.name}! You're now active.` },
        rejected: { title: "Application Rejected", body: "Your rider application was not approved." },
        pending: { title: "Under Review", body: "We're reviewing your application." }
      };

      const msg = messages[riderStatus];
      await sendNotification(rider.fcmToken, msg.title, msg.body, {
        type: 'rider_status',
        riderStatus
      });
    }

    res.json({ success: true, message: 'Rider status updated', rider });
  } catch (err) {
    console.error('updateRiderStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getRiderStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      { $match: { role: 'rider' } },
      {
        $group: {
          _id: null,
          totalRiders: { $sum: 1 },
          onlineNow: { $sum: { $cond: ['$isOnline', 1, 0] } },
          availableNow: { $sum: { $cond: ['$isAvailable', 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$riderStatus', 'approved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$riderStatus', 'pending'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || { totalRiders: 0, onlineNow: 0, availableNow: 0, approved: 0, pending: 0 }
    });
  } catch (err) {
    console.error('getRiderStats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  updateLocation,
  toggleAvailability,
  updateOrderLocation,
  getMyOrders,
  getRiderProfile,
  getAllRiders,
  getRiderById,
  updateRiderStatus,
  getRiderStats
};