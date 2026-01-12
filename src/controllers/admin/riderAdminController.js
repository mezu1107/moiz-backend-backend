// src/controllers/admin/riderAdminController.js
// FINAL PRODUCTION — DECEMBER 15, 2025 — BULLETPROOF RIDER ADMIN CONTROLLER

const User = require('../../models/user/User');
const Order = require('../../models/order/Order');
const mongoose = require('mongoose');
const { sendNotification } = require('../../utils/fcm');
const io = global.io;

// Helper: Validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// =============================
// 1. Get All Riders (Search + Filter + Pagination)
// =============================
const getAllRiders = async (req, res) => {
  try {
    const { search, status = 'all', page = 1, limit = 20 } = req.query;
    const query = { role: 'rider' };

    if (status !== 'all') {
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status filter' });
      }
      query.riderStatus = status;
    }

    if (search?.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { 'riderDocuments.cnicNumber': searchRegex },
        { 'riderDocuments.vehicleNumber': searchRegex },
      ];
    }

    const [riders, total] = await Promise.all([
      User.find(query)
        .select('name phone email riderStatus riderDocuments isOnline isAvailable rating totalDeliveries earnings createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      riders,
      pagination: {
        total,
        page: +page,
        limit: +limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('getAllRiders Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch riders' });
  }
};

// =============================
// 2. Get Single Rider Details
// =============================
const getRiderById = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid rider ID' });
  }

  try {
    const rider = await User.findOne({ _id: req.params.id, role: 'rider' })
      .select('-password -fcmToken -otp -otpExpires -otpAttempts -__v')
      .lean();

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    res.json({ success: true, rider });
  } catch (err) {
    console.error('getRiderById Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// =============================
// 3. Update Rider Status (approved/pending/rejected)
// =============================
const updateRiderStatus = async (req, res) => {
  const { riderStatus } = req.body;

  if (!['pending', 'approved', 'rejected'].includes(riderStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid rider ID' });
  }

  try {
    const rider = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'rider' },
      {
        riderStatus,
        isOnline: riderStatus === 'approved',
        isAvailable: riderStatus === 'approved',
      },
      { new: true }
    ).select('name phone fcmToken');

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    // Real-time update
    if (io) {
      io.to(`rider:${rider._id}`).emit('statusChanged', { riderStatus });
    }

    // FCM notification
    const messages = {
      approved: { title: 'Approved!', body: 'You can now accept orders and earn!' },
      rejected: { title: 'Account Suspended', body: 'Your rider account has been suspended' },
      pending: { title: 'Status Updated', body: 'Your application is under review again' },
    };

    if (rider.fcmToken) {
      await sendNotification(rider.fcmToken, messages[riderStatus].title, messages[riderStatus].body);
    }

    res.json({
      success: true,
      message: `Rider status updated to "${riderStatus}"`,
      rider: { id: rider._id, name: rider.name, riderStatus },
    });
  } catch (err) {
    console.error('updateRiderStatus Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// =============================
// 4. Rider Dashboard Stats
// =============================
const getRiderStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      { $match: { role: 'rider' } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          online: { $sum: { $cond: ['$isOnline', 1, 0] } },
          available: { $sum: { $cond: ['$isAvailable', 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$riderStatus', 'approved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$riderStatus', 'pending'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$riderStatus', 'rejected'] }, 1, 0] } },
        },
      },
    ]);

    const result = stats[0] || {
      total: 0, online: 0, available: 0, approved: 0, pending: 0, rejected: 0,
    };

    res.json({ success: true, stats: result });
  } catch (err) {
    console.error('getRiderStats Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

// =============================
// 5. Approve Pending Rider Application
// =============================
const approveRider = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'rider') {
      return res.status(400).json({ success: false, message: 'User is already a rider' });
    }

    if (user.riderStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'No pending application found' });
    }

    user.role = 'rider';
    user.riderStatus = 'approved';
    user.isActive = true;

    await user.save();

    if (io) {
      io.to('admin').emit('riderApproved', {
        riderId: user._id,
        name: user.name,
        phone: user.phone,
      });
      io.to(`rider:${user._id}`).emit('applicationApproved');
    }

    if (user.fcmToken) {
      await sendNotification(
        user.fcmToken,
        "Congratulations! 🎉",
        "Your rider application is approved! Go online and start earning."
      );
    }

    res.json({
      success: true,
      message: 'Rider approved and promoted successfully',
      rider: { id: user._id, name: user.name, phone: user.phone },
    });
  } catch (err) {
    console.error('approveRider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to approve rider' });
  }
};

// =============================
// 6. Reject Rider Application
// =============================
const rejectRider = async (req, res) => {
  const { reason } = req.body;

  if (!reason || reason.trim().length < 10) {
    return res.status(400).json({ success: false, message: 'Reason must be at least 10 characters' });
  }

  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }

  try {
    const user = await User.findById(req.params.id);

    if (!user || user.riderStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'Pending application not found' });
    }

    user.riderStatus = 'rejected';
    user.rejectionReason = reason.trim();
    await user.save();

    if (io) io.to(`user:${user._id}`).emit('applicationRejected', { reason: reason.trim() });
    if (user.fcmToken) {
      await sendNotification(user.fcmToken, "Application Rejected", reason.trim());
    }

    res.json({ success: true, message: 'Application rejected successfully' });
  } catch (err) {
    console.error('rejectRider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to reject application' });
  }
};

// =============================
// 7. Force Promote Any User to Rider (Admin Only)
// =============================
const promoteUserToRider = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }

  try {
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'rider') return res.status(400).json({ success: false, message: 'Already a rider' });
    if (['admin', 'kitchen'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Cannot promote staff/admin' });
    }

    user.role = 'rider';
    user.riderStatus = 'approved';
    user.isActive = true;

    // Ensure riderDocuments exists
    user.riderDocuments = user.riderDocuments || {};
    const defaults = { vehicleType: 'bike', vehicleNumber: '' };
    Object.assign(user.riderDocuments, defaults, req.body.riderDocuments || {});

    await user.save();

    if (io) {
      io.to('admin').emit('newRiderAdded', { riderId: user._id, name: user.name });
      io.to(`rider:${user._id}`).emit('applicationApproved');
    }

    if (user.fcmToken) {
      await sendNotification(user.fcmToken, "Welcome to the Team!", "You are now a rider!");
    }

    res.json({
      success: true,
      message: 'User promoted to rider',
      rider: { id: user._id, name: user.name, phone: user.phone },
    });
  } catch (err) {
    console.error('promoteUserToRider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to promote user' });
  }
};

// =============================
// 8. Block Rider
// =============================
const blockRider = async (req, res) => {
  const { reason } = req.body;

  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ success: false, message: 'Reason required (min 5 chars)' });
  }

  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid rider ID' });
  }

  try {
    const rider = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'rider' },
      {
        isBlocked: true,
        isActive: false,
        isOnline: false,
        isAvailable: false,
        blockReason: reason.trim(),
        blockedAt: new Date(),
      },
      { new: true }
    ).select('name phone');

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    if (io) {
      io.to(`rider:${rider._id}`).emit('forceLogout', {
        message: 'Your account has been blocked',
        reason: reason.trim(),
      });
    }

    res.json({ success: true, message: 'Rider blocked successfully' });
  } catch (err) {
    console.error('blockRider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to block rider' });
  }
};

// =============================
// 9. Unblock Rider
// =============================
const unblockRider = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid rider ID' });
  }

  try {
    const rider = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'rider', isBlocked: true },
      {
        $set: { isBlocked: false, isActive: true },
        $unset: { blockReason: "", blockedAt: "" },
      },
      { new: true }
    ).select('name phone fcmToken');

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Blocked rider not found' });
    }

    if (io) io.to(`rider:${rider._id}`).emit('accountRestored');
    if (rider.fcmToken) {
      await sendNotification(rider.fcmToken, "Account Restored", "Welcome back! You can now accept orders.");
    }

    res.json({ success: true, message: 'Rider unblocked successfully' });
  } catch (err) {
    console.error('unblockRider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to unblock rider' });
  }
};

// =============================
// 10. Soft Delete Rider
// =============================
const softDeleteRider = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid rider ID' });
  }

  try {
    const rider = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'rider', isDeleted: false },
      {
        isDeleted: true,
        isActive: false,
        isOnline: false,
        isAvailable: false,
        deletedAt: new Date(),
      },
      { new: true }
    );

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found or already deleted' });
    }

    if (io) io.to(`rider:${rider._id}`).emit('forceLogout', { message: 'Account permanently deleted' });

    res.json({ success: true, message: 'Rider account soft-deleted' });
  } catch (err) {
    console.error('softDeleteRider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete rider' });
  }
};

// =============================
// 11. Restore Deleted Rider
// =============================
const restoreRider = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid rider ID' });
  }

  try {
    const result = await User.updateOne(
      { _id: req.params.id, role: 'rider', isDeleted: true },
      {
        $set: { isDeleted: false, isActive: true },
        $unset: { deletedAt: "" },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: 'Deleted rider not found' });
    }

    const rider = await User.findById(req.params.id).select('name phone fcmToken');

    if (io) io.to(`rider:${rider._id}`).emit('accountRestored');
    if (rider?.fcmToken) {
      await sendNotification(rider.fcmToken, "Account Restored", "Your account has been reactivated.");
    }

    res.json({ success: true, message: 'Rider restored successfully' });
  } catch (err) {
    console.error('restoreRider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to restore rider' });
  }
};

// =============================
// 12. Permanently Ban Rider
// =============================
const permanentlyBanRider = async (req, res) => {
  const { reason } = req.body;

  if (!reason || reason.trim().length < 10) {
    return res.status(400).json({ success: false, message: 'Ban reason required (min 10 chars)' });
  }

  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid rider ID' });
  }

  try {
    const rider = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'rider', isPermanentlyBanned: { $ne: true } },
      {
        isPermanentlyBanned: true,
        isBlocked: true,
        isActive: false,
        banReason: reason.trim(),
        bannedAt: new Date(),
      },
      { new: true }
    );

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found or already banned' });
    }

    if (io) io.to(`rider:${rider._id}`).emit('permanentlyBanned');

    res.json({ success: true, message: 'Rider permanently banned' });
  } catch (err) {
    console.error('permanentlyBanRider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to ban rider' });
  }
};

// =============================
// 13. Get Blocked Riders
// =============================
const getBlockedRiders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [riders, total] = await Promise.all([
      User.find({ role: 'rider', isBlocked: true, isDeleted: false })
        .select('name phone blockReason blockedAt')
        .sort({ blockedAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .lean(),
      User.countDocuments({ role: 'rider', isBlocked: true, isDeleted: false }),
    ]);

    res.json({
      success: true,
      riders,
      pagination: { total, page: +page, limit: +limit },
    });
  } catch (err) {
    console.error('getBlockedRiders Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// =============================
// 14. Get Permanently Banned Riders
// =============================
const getPermanentlyBannedRiders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [riders, total] = await Promise.all([
      User.find({ role: 'rider', isPermanentlyBanned: true })
        .select('name phone banReason bannedAt')
        .sort({ bannedAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .lean(),
      User.countDocuments({ role: 'rider', isPermanentlyBanned: true }),
    ]);

    res.json({
      success: true,
      riders,
      pagination: { total, page: +page, limit: +limit },
    });
  } catch (err) {
    console.error('getPermanentlyBannedRiders Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// =============================
// 15. Assign Order to Rider (Admin Force Assign)
// =============================
const assignOrderToRider = async (req, res) => {
  const { riderId } = req.body;
  const { orderId } = req.params;

  if (!isValidObjectId(orderId) || !isValidObjectId(riderId)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  try {
    const order = await Order.findOne({
      _id: orderId,
      rider: null,
      status: { $in: ['pending', 'confirmed', 'preparing'] },
    }).populate('customer', 'name fcmToken');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Eligible order not found' });
    }

    const rider = await User.findById(riderId).select('name phone fcmToken riderDocuments isOnline isAvailable');

    if (!rider || rider.role !== 'rider') {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    // Prevent assigning if rider has active delivery
    const activeOrder = await Order.findOne({
      rider: riderId,
      status: { $in: ['confirmed', 'preparing', 'out_for_delivery'] },
    });

    if (activeOrder) {
      return res.status(400).json({
        success: false,
        message: `Rider is busy with order #${activeOrder._id.toString().slice(-6).toUpperCase()}`,
      });
    }

    // Force rider online
    const wasOffline = !rider.isOnline || !rider.isAvailable;
    if (wasOffline) {
      await User.updateOne({ _id: riderId }, { isOnline: true, isAvailable: true });
    }

    // Assign
    order.rider = riderId;
    order.status = 'confirmed';
    order.confirmedAt = new Date();
    await order.save();

    const shortId = order._id.toString().slice(-6).toUpperCase();

    if (io) {
      io.to(`rider:${riderId}`).emit('newOrderAssigned', {
        orderId: order._id,
        shortId,
        totalAmount: order.finalAmount,
        customerName: order.guestInfo?.name || order.customer?.name || 'Guest',
        address: order.addressDetails.fullAddress,
      });

      io.to('admin').emit('orderAssigned', {
        orderId: order._id,
        shortId,
        riderName: rider.name,
      });
    }

    // Notifications
    if (rider.fcmToken) {
      await sendNotification(
        rider.fcmToken,
        'New Order Assigned!',
        `Order #${shortId} • PKR ${order.finalAmount} • Pick up now!`
      );
    }

    if (order.customer?.fcmToken) {
      await sendNotification(
        order.customer.fcmToken,
        'Rider Assigned',
        `${rider.name} is coming to pick up your order`
      );
    }

    res.json({
      success: true,
      message: 'Order assigned successfully',
      forcedOnline: wasOffline,
      order: { shortId, status: 'confirmed' },
      rider: { name: rider.name, phone: rider.phone },
    });
  } catch (err) {
    console.error('assignOrderToRider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to assign order' });
  }
};
// =============================
// 16. Get Available Riders (For Admin Order Assignment)
// =============================
const getAvailableRiders = async (req, res) => {
  try {
    const { area, page = 1, limit = 50 } = req.query; // area filter optional for future

    const activeStatuses = ['confirmed', 'preparing', 'out_for_delivery'];

    // Find riders WITHOUT active orders
    const busyRiderIds = await Order.distinct('rider', {
      rider: { $ne: null },
      status: { $in: activeStatuses },
    });

    const query = {
      role: 'rider',
      riderStatus: 'approved',
      isActive: true,
      isBlocked: { $ne: true },
      isDeleted: { $ne: true },
      isOnline: true,
      isAvailable: true,
      _id: { $nin: busyRiderIds }, // Exclude busy riders
    };

    // Optional: area-based filtering (future: use rider.currentArea)
    if (area) {
      // query['currentArea'] = area; // Uncomment when area field added to User model
    }

    const [riders, total] = await Promise.all([
      User.find(query)
        .select('name phone rating totalDeliveries earnings isOnline isAvailable currentLocation riderDocuments.vehicleType createdAt')
        .sort({ 
          rating: -1, 
          totalDeliveries: -1,
          isOnline: -1,
          createdAt: -1 
        })
        .skip((page - 1) * limit)
        .limit(+limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Real-time hint: emit to admin room (optional)
    if (io && total > 0) {
      io.to('admin').emit('availableRidersCount', { count: total });
    }

    res.json({
      success: true,
      riders,
      pagination: {
        total,
        page: +page,
        limit: +limit,
        pages: Math.ceil(total / limit),
        availableCount: total,
      },
      message: `${total} available riders found`,
    });
  } catch (err) {
    console.error('getAvailableRiders Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch available riders' });
  }
};
module.exports = {
  getAllRiders,
  getRiderById,
  updateRiderStatus,
  getRiderStats,
  approveRider,
  rejectRider,
  promoteUserToRider,
  blockRider,
  unblockRider,
  softDeleteRider,
  restoreRider,
  permanentlyBanRider,
  getBlockedRiders,
  getPermanentlyBannedRiders,
  assignOrderToRider,
  getAvailableRiders,
};