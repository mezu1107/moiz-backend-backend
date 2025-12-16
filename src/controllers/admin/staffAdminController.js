// src/controllers/admin/staffAdminController.js
// FINAL PRODUCTION VERSION — PROMOTE & DEMOTE STAFF (DEC 2025)

const User = require('../../models/user/User');
const io = global.io;
const { sendNotification } = require('../../utils/fcm');

const VALID_STAFF_ROLES = ['kitchen', 'delivery_manager', 'support', 'finance'];

// PROMOTE USER TO STAFF ROLE
const promoteUserToStaff = async (req, res) => {
  const { role } = req.body;

  if (!role || !VALID_STAFF_ROLES.includes(role)) {
    return res.status(400).json({
      success: false,
      message: `Invalid role. Must be one of: ${VALID_STAFF_ROLES.join(', ')}`
    });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Security: Prevent self-modification & admin downgrade
    if (req.user.id === user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot modify your own role' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot downgrade admin role' });
    }
    if (VALID_STAFF_ROLES.includes(user.role)) {
      return res.status(400).json({ success: false, message: `User is already ${user.role.replace('_', ' ')}` });
    }

    const previousRole = user.role;
    user.role = role;
    user.isActive = true;

    // Clean rider flags if needed
    if (previousRole === 'rider') {
      user.riderStatus = 'none';
      user.isOnline = false;
      user.isAvailable = false;
    }

    await user.save();

    const roleName = {
      kitchen: 'Kitchen Staff',
      delivery_manager: 'Delivery Manager',
      support: 'Customer Support',
      finance: 'Finance Team'
    }[role];

    // Real-time + FCM
    if (io) {
      io.to(`user:${user._id}`).emit('roleChanged', { role: user.role });
      io.to('admin').emit('staffRoleUpdated', {
        userId: user._id,
        name: user.name,
        previousRole,
        newRole: role,
        timestamp: new Date()
      });
    }

    if (user.fcmToken) {
      await sendNotification(user.fcmToken, "Welcome to the Team!", `You are now ${roleName}`);
    }

    return res.json({
      success: true,
      message: `User promoted to ${roleName}`,
      staff: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        promotedAt: new Date()
      }
    });

  } catch (err) {
    console.error('Promote Staff Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to promote user' });
  }
};

// DEMOTE STAFF TO CUSTOMER
const demoteStaff = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const currentRole = user.role;

    if (!VALID_STAFF_ROLES.includes(currentRole)) {
      return res.status(400).json({
        success: false,
        message: `Cannot demote user with role "${currentRole}". Only staff roles allowed.`
      });
    }

    if (req.user.id === user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot demote yourself' });
    }

    user.role = 'customer';
    user.isActive = true;

    if (user.riderStatus && user.riderStatus !== 'none') {
      user.riderStatus = 'none';
    }

    await user.save();

    const roleName = {
      kitchen: 'Kitchen Staff',
      delivery_manager: 'Delivery Manager',
      support: 'Customer Support',
      finance: 'Finance Team'
    }[currentRole];

    if (io) {
      io.to(`user:${user._id}`).emit('roleChanged', { role: 'customer' });
      io.to('admin').emit('staffDemoted', {
        userId: user._id,
        name: user.name,
        previousRole: currentRole,
        demotedAt: new Date()
      });
    }

    if (user.fcmToken) {
      await sendNotification(user.fcmToken, "Access Revoked", `Your ${roleName} access has been removed.`);
    }

    return res.json({
      success: true,
      message: `${roleName} demoted to customer`,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        previousRole: currentRole,
        newRole: 'customer',
        demotedAt: new Date()
      }
    });

  } catch (err) {
    console.error('Demote Staff Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to demote user' });
  }
};

module.exports = {
  promoteUserToStaff,
  demoteStaff
};