// src/controllers/admin/riderAdminController.js
const User = require('../../models/user/User');
const { sendNotification } = require('../../utils/fcm');
const io = global.io;

// 1. Get all riders (search + filter + pagination)
const getAllRiders = async (req, res) => {
  try {
    const { search, status = 'all', page = 1, limit = 20 } = req.query;
    const query = { role: 'rider' };

    if (status !== 'all') query.riderStatus = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'riderDocuments.cnicNumber': { $regex: search, $options: 'i' } }
      ];
    }

    const [riders, total] = await Promise.all([
      User.find(query)
        .select('name phone email riderStatus riderDocuments isOnline isAvailable currentLocation rating totalDeliveries createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      riders,
      pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('Get All Riders Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 2. Get single rider details
const getRiderById = async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.params.id, role: 'rider' })
      .select('-password -fcmToken -otp -__v');

    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });

    res.json({ success: true, rider });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 3. Update rider status
const updateRiderStatus = async (req, res) => {
  const { riderStatus } = req.body;

  if (!['pending', 'approved', 'rejected'].includes(riderStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const rider = await User.findByIdAndUpdate(
      req.params.id,
      {
        riderStatus,
        isAvailable: riderStatus === 'approved',
        isOnline: riderStatus === 'approved'
      },
      { new: true }
    ).select('name phone riderStatus fcmToken');

    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });

    if (io) io.to(`rider:${rider._id}`).emit('statusChanged', { riderStatus });
    if (rider.fcmToken) {
      const messages = {
        approved: { title: "Approved!", body: "You can now accept orders" },
        rejected: { title: "Application Rejected", body: "Please contact support" },
        pending: { title: "Under Review", body: "Your application is being reviewed" }
      };
      await sendNotification(rider.fcmToken, messages[riderStatus].title, messages[riderStatus].body);
    }

    res.json({ success: true, message: 'Status updated successfully', rider });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// 4. Rider stats
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
          rejected: { $sum: { $cond: [{ $eq: ['$riderStatus', 'rejected'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || { total: 0, online: 0, available: 0, approved: 0, pending: 0, rejected: 0 }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 5. Approve pending application
const approveRider = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'customer') return res.status(404).json({ success: false, message: 'Application not found' });
    if (user.riderStatus !== 'pending') return res.status(400).json({ success: false, message: 'Not a pending application' });

    user.role = 'rider';
    user.riderStatus = 'approved';
    user.isActive = true;
    await user.save();

    if (io) io.to(`rider:${user._id}`).emit('applicationApproved');
    if (user.fcmToken) await sendNotification(user.fcmToken, "Approved!", "Welcome to the rider team!");

    res.json({ success: true, message: 'Rider approved successfully', rider: { id: user._id, name: user.name, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Approval failed' });
  }
};

// 6. Reject application
const rejectRider = async (req, res) => {
  const { reason } = req.body;
  try {
    const user = await User.findByIdAndUpdate(req.params.id, {
      riderStatus: 'rejected',
      rejectionReason: reason || 'Documents invalid or incomplete'
    }, { new: true });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (io) io.to(`rider:${user._id}`).emit('applicationRejected');
    if (user.fcmToken) await sendNotification(user.fcmToken, "Application Rejected", reason || "Please reapply with correct documents");

    res.json({ success: true, message: 'Application rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Rejection failed' });
  }
};

// 7. Force promote any user to rider (VIP / internal)
const promoteUserToRider = async (req, res) => {
  const { vehicleType = 'bike', vehicleNumber } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'rider') return res.status(400).json({ success: false, message: 'Already a rider' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot demote admin' });

    user.role = 'rider';
    user.riderStatus = 'approved';
    user.isActive = true;
    user.isOnline = false;
    user.isAvailable = false;

    if (vehicleType || vehicleNumber) {
      user.riderDocuments = user.riderDocuments || {};
      if (vehicleType) user.riderDocuments.vehicleType = vehicleType;
      if (vehicleNumber) user.riderDocuments.vehicleNumber = vehicleNumber.toUpperCase().trim();
    }

    await user.save();

    if (io) {
      io.to(`rider:${user._id}`).emit('applicationApproved');
      io.to(`user:${user._id}`).emit('roleChanged', { role: 'rider' });
      io.to('admin_room').emit('newRiderAdded', { riderId: user._id, name: user.name });
    }

    if (user.fcmToken) await sendNotification(user.fcmToken, "You're now a Rider!", "Start accepting orders!");

    res.json({ success: true, message: 'User promoted to rider successfully', rider: { id: user._id, name: user.name, phone: user.phone } });
  } catch (err) {
    console.error('Promote Error:', err);
    res.status(500).json({ success: false, message: 'Promotion failed' });
  }
};

// 8. Block rider (temporary)
const blockRider = async (req, res) => {
  try {
    const { reason } = req.body;
    const rider = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'rider' },
      {
        isBlocked: true,
        isActive: false,
        isOnline: false,
        isAvailable: false,
        blockReason: reason || 'Violated platform rules',
        blockedAt: new Date()
      },
      { new: true }
    ).select('name phone');

    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });

    if (io) io.to(`rider:${rider._id}`).emit('forceLogout', { message: 'Your account has been suspended', reason: reason || 'Policy violation' });

    res.json({ success: true, message: 'Rider blocked successfully' });
  } catch (err) {
    console.error('Block Rider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to block rider' });
  }
};

// 9. Unblock rider
const unblockRider = async (req, res) => {
  try {
    const rider = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'rider' },
      { $set: { isBlocked: false, isActive: true }, $unset: { blockReason: "", blockedAt: "" } },
      { new: true }
    ).select('name phone fcmToken');

    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });

    if (io) io.to(`rider:${rider._id}`).emit('accountRestored');
    if (rider.fcmToken) await sendNotification(rider.fcmToken, "Account Restored", "You can now log in and accept orders again.");

    res.json({ success: true, message: 'Rider unblocked successfully' });
  } catch (err) {
    console.error('Unblock Rider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to unblock rider' });
  }
};

// 10. Soft delete rider
const softDeleteRider = async (req, res) => {
  try {
    const rider = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'rider', isDeleted: false },
      { isDeleted: true, isActive: false, isOnline: false, isAvailable: false, deletedAt: new Date() },
      { new: true }
    );

    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found or already deleted' });

    if (io) io.to(`rider:${rider._id}`).emit('forceLogout', { message: 'Account deleted' });

    res.json({ success: true, message: 'Rider soft deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete rider' });
  }
};

// 11. Restore soft-deleted rider
const restoreRider = async (req, res) => {
  try {
    const rider = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'rider', isDeleted: true },
      { $set: { isDeleted: false, isActive: true }, $unset: { deletedAt: "" } },
      { new: true }
    );

    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found or not deleted' });

    res.json({ success: true, message: 'Rider restored successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to restore' });
  }
};

// 12. Permanently ban rider (no undo)
const permanentlyBanRider = async (req, res) => {
  const { reason } = req.body;

  try {
    const rider = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'rider', isPermanentlyBanned: false },
      {
        isPermanentlyBanned: true,
        isBlocked: true,
        isActive: false,
        isOnline: false,
        isAvailable: false,
        bannedAt: new Date(),
        banReason: reason || 'Severe violation of terms'
      },
      { new: true }
    );

    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found or already banned' });

    if (io) io.to(`rider:${rider._id}`).emit('permanentlyBanned');

    res.json({ success: true, message: 'Rider permanently banned' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Ban failed' });
  }
};

// 13. Get blocked riders list
const getBlockedRiders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [riders, total] = await Promise.all([
      User.find({ role: 'rider', isBlocked: true, isDeleted: false })
        .select('name phone blockReason blockedAt createdAt')
        .sort({ blockedAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .lean(),
      User.countDocuments({ role: 'rider', isBlocked: true, isDeleted: false })
    ]);

    res.json({ success: true, riders, pagination: { total, page: +page, limit: +limit } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 14. Get permanently banned riders list
const getPermanentlyBannedRiders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [riders, total] = await Promise.all([
      User.find({ role: 'rider', isPermanentlyBanned: true })
        .select('name phone banReason bannedAt createdAt')
        .sort({ bannedAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .lean(),
      User.countDocuments({ role: 'rider', isPermanentlyBanned: true })
    ]);

    res.json({ success: true, riders, pagination: { total, page: +page, limit: +limit } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// EXPORT ALL
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
  getPermanentlyBannedRiders
};