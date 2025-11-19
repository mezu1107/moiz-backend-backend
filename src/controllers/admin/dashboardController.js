// src/controllers/admin/dashboardController.js
const Order = require('../../models/order/Order');
const Rider = require('../../models/rider/Rider');
const User = require('../../models/user/User');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Karachi');

const getDashboardStats = async (req, res) => {
  try {
    const today = moment().startOf('day');

    const [
      revenueResult,
      ordersToday,
      pendingOrders,
      activeRidersCount,
      liveRiders
    ] = await Promise.all([
      Order.aggregate([
        { $match: { placedAt: { $gte: today.toDate() }, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } }
      ]),
      Order.countDocuments({ placedAt: { $gte: today.toDate() } }),
      Order.countDocuments({
        status: { $in: ['pending', 'confirmed', 'preparing', 'out_for_delivery'] }
      }),
      Rider.countDocuments({ isOnline: true, isAvailable: true }),
      Rider.find({ isOnline: true, isAvailable: true })
        .populate('user', 'name phone')
        .select('currentLocation rating totalDeliveries vehicleNumber vehicleType')
    ]);

    const riders = liveRiders.map(r => ({
      id: r._id,
      name: r.user?.name || 'Rider',
      phone: r.user?.phone || 'N/A',
      rating: Number(r.rating?.toFixed(1)) || 5.0,
      deliveries: r.totalDeliveries || 0,
      vehicle: `${r.vehicleType || 'bike'} - ${r.vehicleNumber || 'N/A'}`,
      location: {
        lat: r.currentLocation?.coordinates[1] || 31.5204,
        lng: r.currentLocation?.coordinates[0] || 74.3587
      }
    }));

    res.json({
      success: true,
      data: {
        revenueToday: revenueResult[0]?.total || 0,
        ordersToday,
        pendingOrders,
        activeRiders: activeRidersCount,
        liveRiders: riders,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Dashboard Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const approveRider = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.riderStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'Rider not in pending state' });
    }

    user.role = 'rider';
    user.riderStatus = 'approved';
    await user.save();

    await Rider.create({
      user: userId,
      vehicleNumber: user.riderDocuments?.vehicleNumber,
      vehicleType: user.riderDocuments?.vehicleType || 'bike',
      currentLocation: { type: 'Point', coordinates: [74.3587, 31.5204] }
    });

    res.json({ success: true, message: 'Rider approved successfully!' });
  } catch (err) {
    console.error('Approve Rider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to approve rider' });
  }
};

const rejectRider = async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  try {
    await User.findByIdAndUpdate(userId, {
      riderStatus: 'rejected',
      rejectionReason: reason || 'Documents incomplete or invalid'
    });

    res.json({ success: true, message: 'Rider application rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reject rider' });
  }
};

module.exports = { getDashboardStats, approveRider, rejectRider };