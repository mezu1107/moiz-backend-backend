// src/controllers/admin/riderAdminController.js
const User = require('../../models/user/User');
const Order = require('../../models/order/Order'); 
const { sendNotification } = require('../../utils/fcm');
const io = global.io;

// =============================
// 1. Get All Riders (with search, filter, pagination)
// =============================
const getAllRiders = async (req, res) => {
  try {
    const { search, status = 'all', page = 1, limit = 20 } = req.query;
    const query = { role: 'rider' };

    if (status !== 'all') query.riderStatus = status;

    if (search) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } },
        { 'riderDocuments.cnicNumber': { $regex: search.trim(), $options: 'i' } },
        { 'riderDocuments.vehicleNumber': { $regex: search.trim(), $options: 'i' } }
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
      message: riders.length ? 'Riders fetched successfully' : 'No riders found',
      riders,
      pagination: {
        total,
        page: +page,
        limit: +limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get All Riders Error:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching riders' });
  }
};

// =============================
// 2. Get Single Rider Details
// =============================
const getRiderById = async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.params.id, role: 'rider' })
      .select('-password -fcmToken -otp -__v -blockReason -banReason');

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider not found or not a rider'
      });
    }

    res.json({
      success: true,
      message: 'Rider details fetched successfully',
      rider
    });
  } catch (err) {
    console.error('Get Rider By ID Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// =============================
// 3. Update Rider Status – ONLY FOR EXISTING RIDERS
// =============================
const updateRiderStatus = async (req, res) => {
  const { riderStatus } = req.body;

  if (!['pending', 'approved', 'rejected'].includes(riderStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be pending, approved, or rejected'
    });
  }

  try {
    const rider = await User.findOne({ _id: req.params.id, role: 'rider' });
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider not found'
      });
    }

    rider.riderStatus = riderStatus;
    rider.isAvailable = riderStatus === 'approved';
    rider.isOnline = riderStatus === 'approved';

    await rider.save();

    if (io) io.to(`rider:${rider._id}`).emit('statusChanged', { riderStatus });
    if (rider.fcmToken) {
      const msg = {
        approved: { title: "Approved!", body: "You can now accept orders" },
        rejected: { title: "Suspended", body: "Your account is suspended" },
        pending: { title: "Under Review", body: "Your status changed to pending" }
      };
      await sendNotification(rider.fcmToken, msg[riderStatus].title, msg[riderStatus].body);
    }

    res.json({
      success: true,
      message: `Rider status updated to "${riderStatus}"`,
      rider: { id: rider._id, name: rider.name, riderStatus }
    });
  } catch (err) {
    console.error('Update Rider Status Error:', err);
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
          rejected: { $sum: { $cond: [{ $eq: ['$riderStatus', 'rejected'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      message: 'Rider stats fetched successfully',
      stats: stats[0] || { total: 0, online: 0, available: 0, approved: 0, pending: 0, rejected: 0 }
    });
  } catch (err) {
    console.error('Rider Stats Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch rider stats' });
  }
};

// =============================
// 5. Approve Pending Rider Application
// =============================

// =============================
// 5. Approve Pending Rider Application (CORRECTED & PERFECT)
// =============================
const approveRider = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // MUST be a customer AND have a pending application
    if (user.role !== 'customer' || user.riderStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This user does not have a pending rider application'
      });
    }

    // Promote to rider
    user.role = 'rider';
    user.riderStatus = 'approved';
    user.isActive = true;
    user.isOnline = false;
    user.isAvailable = false;

    await user.save();

    // ====== REAL-TIME NOTIFICATIONS ======
    if (io) {
      io.to('admin_room').emit('riderApproved', {
        riderId: user._id,
        name: user.name,
        phone: user.phone
      });
      io.to(`user:${user._id}`).emit('applicationApproved');
      io.to(`rider:${user._id}`).emit('statusChanged', { riderStatus: 'approved' });
    }

    if (user.fcmToken) {
      await sendNotification(
        user.fcmToken,
        "Congratulations! You're Now a Rider!",
        "Go online and start earning with us!"
      );
    }

    return res.json({
      success: true,
      message: 'Rider application approved! User promoted to rider.',
      rider: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: 'rider',
        riderStatus: 'approved'
      }
    });

  } catch (err) {
    console.error('Approve Rider Error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to approve rider'
    });
  }
};



// =============================
// 6. Reject Rider Application
// =============================
const rejectRider = async (req, res) => {
  const { reason } = req.body;

  if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Rejection reason is required and must be at least 10 characters'
    });
  }

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.riderStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending applications can be rejected'
      });
    }

    await User.findByIdAndUpdate(req.params.id, {
      riderStatus: 'rejected',
      rejectionReason: reason.trim()
    });

    if (io) io.to(`user:${user._id}`).emit('applicationRejected', { reason });
    if (user.fcmToken) {
      await sendNotification(user.fcmToken, "Application Rejected", reason.trim());
    }

    res.json({
      success: true,
      message: 'Application rejected and user notified',
      reason: reason.trim()
    });
  } catch (err) {
    console.error('Reject Rider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to reject application' });
  }
};

// =============================
// 7. Force Promote Any User to Rider (VIP / Internal Use)
// =============================
const promoteUserToRider = async (req, res) => {
  const { vehicleType = 'bike', vehicleNumber } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'rider') {
      return res.status(400).json({ success: false, message: 'User is already a rider' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot convert admin to rider' });
    }

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
      io.to(`user:${user._id}`).emit('roleChanged', { role: 'rider' });
      io.to(`rider:${user._id}`).emit('applicationApproved');
      io.to('admin_room').emit('newRiderAdded', { riderId: user._id, name: user.name });
    }

    if (user.fcmToken) {
      await sendNotification(user.fcmToken, "Welcome aboard!", "You have been promoted to rider!");
    }

    res.json({
      success: true,
      message: 'User successfully promoted to rider',
      rider: { id: user._id, name: user.name, phone: user.phone }
    });
  } catch (err) {
    console.error('Promote Rider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to promote user to rider' });
  }
};

// =============================
// 8. Block Rider (Temporary)
// =============================
// =============================
// 8. Block Rider (FIXED VERSION)
// =============================
const { ObjectId } = require('mongoose').Types;

const blockRider = async (req, res) => {
  const { reason } = req.body;

  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Block reason is required (min 5 characters)'
    });
  }

  const riderId = req.params.id;

  // Critical Fix: Validate ObjectId format
  if (!ObjectId.isValid(riderId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Rider ID format'
    });
  }

  try {
    const rider = await User.findOneAndUpdate(
      { _id: riderId, role: 'rider' }, // _id is now guaranteed valid
      {
        $set: {
          isBlocked: true,
          isActive: false,
          isOnline: false,
          isAvailable: false,
          blockReason: reason.trim(),
          blockedAt: new Date()
        }
      },
      { new: true }
    );

    if (!rider) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rider not found or not a rider' 
      });
    }

    // Force logout via socket
    if (io) {
      io.to(`rider:${rider._id}`).emit('forceLogout', {
        message: 'Your account has been suspended',
        reason: reason.trim()
      });
    }

    return res.json({
      success: true,
      message: 'Rider blocked successfully',
      rider: { 
        id: rider._id, 
        name: rider.name,
        phone: rider.phone 
      }
    });

  } catch (err) {
    console.error('Block Rider Error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to block rider' 
    });
  }
};

// =============================
// 9. Unblock Rider
// =============================
const unblockRider = async (req, res) => {
  try {
    const rider = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'rider', isBlocked: true },
      {
        $set: { isBlocked: false, isActive: true },
        $unset: { blockReason: "", blockedAt: "" }
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

    res.json({
      success: true,
      message: 'Rider unblocked successfully',
      rider: { id: rider._id, name: rider.name }
    });
  } catch (err) {
    console.error('Unblock Rider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to unblock rider' });
  }
};

// =============================
// 10–14. Other Admin Actions (Improved Messages)
// =============================

// 10. Soft Delete Rider (No Change Needed – Already Perfect)
const softDeleteRider = async (req, res) => {
  try {
    const rider = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'rider', isDeleted: false },
      { 
        isDeleted: true, 
        isActive: false, 
        isOnline: false, 
        isAvailable: false, 
        deletedAt: new Date() 
      },
      { new: true }
    );

    if (!rider) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rider not found or already deleted' 
      });
    }

    if (io) io.to(`rider:${rider._id}`).emit('forceLogout', { message: 'Account deleted' });

    res.json({ success: true, message: 'Rider account soft deleted successfully' });
  } catch (err) {
    console.error('Soft Delete Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete rider' });
  }
};
// BEST WAY: Use MongoDB native driver style – fully bypass Mongoose hooks
const restoreRider = async (req, res) => {
  try {
    const result = await User.updateOne(
      { _id: req.params.id, role: 'rider', isDeleted: true },
      {
        $set: { isDeleted: false, isActive: true },
        $unset: { deletedAt: "" }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deleted rider not found or already restored'
      });
    }

    const rider = await User.findById(req.params.id).select('name phone fcmToken');

    if (io) io.to(`rider:${rider._id}`).emit('accountRestored');
    if (rider?.fcmToken) {
      await sendNotification(rider.fcmToken, "Account Restored", "Welcome back! You can now log in.");
    }

    res.json({
      success: true,
      message: 'Rider account restored successfully',
      rider: { id: rider._id, name: rider.name }
    });
  } catch (err) {
    console.error('Restore Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const permanentlyBanRider = async (req, res) => {
  const { reason } = req.body;

  if (!reason || reason.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Ban reason required (min 10 chars)'
    });
  }

  try {
    const rider = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: 'rider',
        isPermanentlyBanned: { $ne: true }
      },
      {
        $set: {
          isPermanentlyBanned: true,
          isBlocked: true,
          isActive: false,
          banReason: reason.trim(),
          bannedAt: new Date()
        }
      },
      { new: true }
    );

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider not found or already permanently banned'
      });
    }

    // Emit socket event
    if (io) {
      io.to(`rider:${rider._id}`).emit('permanentlyBanned');
    }

    res.json({
      success: true,
      message: 'Rider permanently banned (no recovery)'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to ban rider'
    });
  }
};


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
      User.countDocuments({ role: 'rider', isBlocked: true, isDeleted: false })
    ]);

    res.json({
      success: true,
      message: riders.length ? 'Blocked riders fetched' : 'No blocked riders',
      riders,
      pagination: { total, page: +page, limit: +limit }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

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
      User.countDocuments({ role: 'rider', isPermanentlyBanned: true })
    ]);

    res.json({
      success: true,
      message: riders.length ? 'Banned riders fetched' : 'No permanently banned riders',
      riders,
      pagination: { total, page: +page, limit: +limit }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



const assignOrderToRider = async (req, res) => {
  const { riderId } = req.body;
  const { orderId } = req.params;

  try {
    // 1. Find eligible order
    const order = await Order.findOne({
      _id: orderId,
      rider: null,
      status: { $in: ['pending', 'confirmed', 'preparing'] }
    }).populate('customer', 'name fcmToken');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found, already assigned, or not eligible'
      });
    }

    // 2. Get rider (already validated in schema, but re-fetch for fresh data)
    const rider = await User.findById(riderId)
      .select('name phone fcmToken riderDocuments isOnline isAvailable');

    if (!rider) {
      return res.status(400).json({
        success: false,
        message: 'Rider not found'
      });
    }

    // 3. Prevent double assignment
    const activeOrder = await Order.findOne({
      rider: riderId,
      status: { $in: ['confirmed', 'preparing', 'out_for_delivery'] }
    });

    if (activeOrder) {
      const shortId = activeOrder._id.toString().slice(-6).toUpperCase();
      return res.status(400).json({
        success: false,
        message: `Rider is already assigned to order #${shortId}`
      });
    }

    // 4. Force rider online (even if offline)
    const wasOffline = !rider.isOnline || !rider.isAvailable;

    if (wasOffline) {
      await User.updateOne(
        { _id: riderId },
        {
          $set: {
            isOnline: true,
            isAvailable: true,
            lastActiveAt: new Date(),
            locationUpdatedAt: new Date()
          }
        }
      );

      if (io) {
        io.to(`rider:${riderId}`).emit('forceOnline', {
          message: 'Admin assigned you a new order — you are now online!'
        });
      }
    }

    // 5. Assign order
    order.rider = riderId;
    order.status = 'confirmed';
    order.confirmedAt = new Date();
    await order.save();

    const shortOrderId = order._id.toString().slice(-6).toUpperCase();

    // 6. Real-time + Push Notifications
    if (io) {
      io.to(`rider:${riderId}`).emit('newOrderAssigned', {
        orderId: order._id,
        shortId: shortOrderId,
        customerName: order.customer?.name || 'Guest',
        totalAmount: order.finalAmount,
        deliveryAddress: order.addressDetails?.fullAddress || 'N/A',
        pickupAddress: order.restaurant?.address || 'Restaurant',
        assignedAt: new Date()
      });

      io.to('admin_room').emit('orderAssigned', {
        orderId: order._id,
        shortId: shortOrderId,
        riderName: rider.name,
        riderPhone: rider.phone
      });
    }

    // FCM Push
    if (rider.fcmToken) {
      await sendNotification(
        rider.fcmToken,
        'New Order Assigned!',
        `Order #${shortOrderId} • PKR ${order.finalAmount} • Pick up now!`
      );
    }

    if (order.customer?.fcmToken) {
      await sendNotification(
        order.customer.fcmToken,
        'Rider Assigned!',
        `${rider.name} is on the way to pick up your order`
      );
    }

    // 7. Success
    return res.json({
      success: true,
      message: 'Order assigned successfully',
      data: {
        orderId: order._id,
        shortId: shortOrderId,
        status: 'confirmed',
        rider: {
          id: rider._id,
          name: rider.name,
          phone: rider.phone,
          vehicleNumber: rider.riderDocuments?.vehicleNumber || 'N/A'
        },
        forcedOnline: wasOffline
      }
    });

  } catch (err) {
    console.error('Assign Order Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign order'
    });
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
  assignOrderToRider
};