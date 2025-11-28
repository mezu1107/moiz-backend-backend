// src/controllers/rider/riderController.js
const User = require('../../models/user/User');
const Order = require('../../models/order/Order');
const admin = require('firebase-admin');
const io = global.io;

// ====================================================================
// BROADCAST ORDER UPDATE TO EVERYONE (Customer + Rider + Admin + FCM)
// ====================================================================
const broadcastOrderUpdate = async (order, event, extra = {}) => {
  if (!order || !io) return;

  const shortId = order._id.toString().slice(-6).toUpperCase();

  const payload = {
    event,
    orderId: order._id.toString(),
    shortId,
    status: order.status,
    timestamp: new Date(),
    ...extra,
  };

  // 1. Socket.IO → Registered Customer
  if (order.customer) {
    io.to(`user:${order.customer}`).emit('orderUpdate', payload);
  }

  // 2. Socket.IO → Rider (current rider)
  if (order.rider) {
    io.to(`rider:${order.rider}`).emit('orderUpdate', payload);
  }

  // 3. Socket.IO → Admin Dashboard
  io.to('admin').emit('orderUpdate', payload);
  io.to('admin_room').emit('orderStatusChanged', {
    orderId: order._id,
    shortId,
    status: order.status,
    riderName: order.rider ? (await User.findById(order.rider)).name : null,
  });

  // 4. FCM Push → Customer (only registered users)
  if (order.customer) {
    try {
      const customer = await User.findById(order.customer).select('fcmToken name');
      if (customer?.fcmToken) {
        await admin.messaging().send({
          token: customer.fcmToken,
          notification: {
            title: event === 'delivered' ? 'Order Delivered!' : 'Order Update',
            body: `Order #${shortId} is now ${order.status.replace(/_/g, ' ')}`,
          },
          data: {
            type: 'order_update',
            orderId: order._id.toString(),
            status: order.status,
          },
        });
      }
    } catch (err) {
      console.error('FCM Error in broadcastOrderUpdate:', err.message);
    }
  }
};

// 1. Update Rider Location (Background Tracking)
const updateLocation = async (req, res) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
  }

  try {
    const rider = await User.findByIdAndUpdate(
      req.user._id,
      {
        currentLocation: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        locationUpdatedAt: new Date(),
        isOnline: true,
        isAvailable: true,
      },
      { new: true }
    ).select('name');

    if (io) {
      io.to('admin_room').emit('riderLocationUpdate', {
        riderId: req.user._id,
        name: rider.name,
        location: { lat, lng },
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      isOnline: true,
      isAvailable: true,
    });
  } catch (err) {
    console.error('updateLocation Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update location' });
  }
};

// 2. Toggle Online / Available Status
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
        isOnline: rider.isOnline,
      });
    }

    res.json({
      success: true,
      message: rider.isAvailable ? 'You are now online and available' : 'You are now offline',
      isAvailable: rider.isAvailable,
      isOnline: rider.isOnline,
    });
  } catch (err) {
    console.error('toggleAvailability Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update availability' });
  }
};

// 3. Update Live Location During Active Delivery
const updateOrderLocation = async (req, res) => {
  const { lat, lng } = req.body;
  const { id: orderId } = req.params;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'lat and lng required' });
  }

  try {
    await User.findByIdAndUpdate(req.user._id, {
      currentLocation: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      locationUpdatedAt: new Date(),
    });

    if (io) {
      io.to(`order:${orderId}`).emit('riderLiveLocation', { lat, lng });
    }

    res.json({ success: true, message: 'Live tracking updated successfully' });
  } catch (err) {
    console.error('updateOrderLocation Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update live location' });
  }
};

// 4. Get All Orders Assigned to Rider (History)
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ rider: req.user._id })
      .populate('customer', 'name phone')
      .populate('address', 'label fullAddress floor instructions')
      .populate('area', 'name')
      .populate('items.menuItem', 'name image price')
      .sort({ placedAt: -1 })
      .lean();

    res.json({
      success: true,
      message: orders.length > 0 ? 'Orders fetched successfully' : 'No orders yet',
      count: orders.length,
      orders,
    });
  } catch (err) {
    console.error('getMyOrders Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch your orders' });
  }
};

// 5. Get Rider Profile
const getRiderProfile = async (req, res) => {
  try {
    const rider = await User.findById(req.user._id).select(
      'name phone email riderStatus riderDocuments rating totalDeliveries earnings isOnline isAvailable currentLocation'
    );

    res.json({
      success: true,
      message: 'Rider profile fetched successfully',
      rider,
    });
  } catch (err) {
    console.error('getRiderProfile Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

// 6. Apply to Become a Rider
const applyAsRider = async (req, res) => {
  const {
    cnicNumber,
    vehicleType = 'bike',
    vehicleNumber,
    cnicFront,
    cnicBack,
    drivingLicense,
    riderPhoto,
  } = req.body;

  try {
    const user = await User.findById(req.user._id);

    if (user.role === 'rider') {
      return res.status(400).json({ success: false, message: 'You are already a rider' });
    }

    if (user.riderStatus === 'pending') {
      return res.json({ success: true, message: 'Your application is already under review', status: 'pending' });
    }

    if (user.riderStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Your previous application was rejected',
        reason: user.rejectionReason || 'Invalid or unclear documents',
      });
    }

    user.riderStatus = 'pending';
    user.riderDocuments = {
      cnicNumber: cnicNumber?.trim(),
      vehicleType,
      vehicleNumber: vehicleNumber?.toUpperCase().trim(),
      cnicFront,
      cnicBack,
      drivingLicense,
      riderPhoto,
    };
    user.rejectionReason = null;

    await user.save();

    if (io) {
      io.to('admin_room').emit('newRiderApplication', {
        userId: user._id,
        name: user.name,
        phone: user.phone,
        appliedAt: new Date(),
      });
    }

    res.status(201).json({
      success: true,
      message: 'Rider application submitted successfully! Waiting for approval.',
      status: 'pending',
    });
  } catch (err) {
    console.error('applyAsRider Error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit application' });
  }
};

// 7. Check Rider Application Status
const getApplicationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('role riderStatus rejectionReason');

    if (user.role === 'rider') {
      return res.json({
        success: true,
        isRider: true,
        message: 'You are an approved rider',
        riderStatus: 'approved',
      });
    }

    const status = user.riderStatus || 'none';

    res.json({
      success: true,
      isRider: false,
      riderStatus: status,
      message:
        status === 'pending'
          ? 'Your application is under review'
          : status === 'rejected'
          ? 'Application rejected'
          : 'No application submitted',
      rejectionReason: user.rejectionReason || null,
    });
  } catch (err) {
    console.error('getApplicationStatus Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 8. Rider Accepts Assigned Order
const acceptOrder = async (req, res) => {
  const orderId = req.params.id;
  const riderId = req.user._id;

  try {
    const order = await Order.findOne({
      _id: orderId,
      rider: riderId,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    if (order.status === 'out_for_delivery' || order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order already accepted or in progress',
      });
    }

    order.status = 'out_for_delivery';
    order.outForDeliveryAt = new Date();
    await order.save();

    await broadcastOrderUpdate(order, 'rider_accepted', {
      riderName: req.user.name,
      riderPhone: req.user.phone,
    });

    res.json({
      success: true,
      message: 'Order accepted successfully! You are now out for delivery.',
      order: {
        id: order._id,
        status: 'out_for_delivery',
        outForDeliveryAt: order.outForDeliveryAt,
      },
    });
  } catch (err) {
    console.error('acceptOrder Error:', err);
    res.status(500).json({ success: false, message: 'Failed to accept order' });
  }
};

// 9. Rider Rejects Assigned Order
const rejectOrder = async (req, res) => {
  const orderId = req.params.id;
  const riderId = req.user._id;
  const { reason } = req.body;

  try {
    const order = await Order.findOne({
      _id: orderId,
      rider: riderId,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    order.rider = null;
    order.rejectedBy = riderId;
    order.rejectionReason = reason || 'Not available';
    order.rejectionNote = 'Rejected by rider';
    order.status = 'pending';

    await order.save();

    await broadcastOrderUpdate(order, 'rider_rejected', { reason: order.rejectionReason });

    if (io) {
      io.to('admin').emit('orderNeedsRider', {
        orderId: order._id,
        area: order.area,
        previousRider: req.user.name,
        reason: order.rejectionReason,
      });
    }

    res.json({
      success: true,
      message: 'Order rejected. It will be reassigned to another rider.',
      reason: order.rejectionReason,
    });
  } catch (err) {
    console.error('rejectOrder Error:', err);
    res.status(500).json({ success: false, message: 'Failed to reject order' });
  }
};

// 10. Rider Picks Up Order → out_for_delivery
const pickupOrder = async (req, res) => {
  const orderId = req.params.id;
  const riderId = req.user._id;

  try {
    const order = await Order.findOne({
      _id: orderId,
      rider: riderId,
      status: { $in: ['confirmed', 'preparing'] },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you',
      });
    }

    if (order.status === 'out_for_delivery') {
      return res.status(400).json({
        success: false,
        message: 'Order already picked up',
      });
    }

    order.status = 'out_for_delivery';
    order.outForDeliveryAt = new Date();
    await order.save();

    await broadcastOrderUpdate(order, 'rider_picked_up');

    res.json({
      success: true,
      message: 'Order picked up! Heading to customer.',
      status: 'out_for_delivery',
      outForDeliveryAt: order.outForDeliveryAt,
    });
  } catch (err) {
    console.error('pickupOrder Error:', err);
    res.status(500).json({ success: false, message: 'Failed to pickup order' });
  }
};

// 11. Rider Delivers Order → delivered + Earnings
const deliverOrder = async (req, res) => {
  const orderId = req.params.id;
  const riderId = req.user._id;

  try {
    const order = await Order.findOne({
      _id: orderId,
      rider: riderId,
      status: 'out_for_delivery',
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not ready for delivery',
      });
    }

    order.status = 'delivered';
    order.deliveredAt = new Date();
    order.paymentStatus = 'paid';
    order.paidAt = new Date();

    const riderEarning = Math.round(order.finalAmount * 0.8); // 80% to rider

    await User.findByIdAndUpdate(riderId, {
      $inc: { totalDeliveries: 1, earnings: riderEarning },
    });

    await order.save();
    await broadcastOrderUpdate(order, 'delivered');

    if (io) {
      io.to('admin_room').emit('deliveryCompleted', {
        orderId: order._id,
        riderName: req.user.name,
        earningsAdded: riderEarning,
      });
    }

    res.json({
      success: true,
      message: 'Order delivered successfully!',
      earningsAdded: riderEarning,
      totalDeliveries: (req.user.totalDeliveries || 0) + 1,
      status: 'delivered',
      deliveredAt: order.deliveredAt,
    });
  } catch (err) {
    console.error('deliverOrder Error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark as delivered' });
  }
};

// 12. Rider Collects Cash (COD)
const collectCash = async (req, res) => {
  const { collectedAmount } = req.body;
  const orderId = req.params.id;
  const riderId = req.user._id;

  if (!collectedAmount || collectedAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid collectedAmount is required' });
  }

  try {
    const order = await Order.findOne({
      _id: orderId,
      rider: riderId,
      paymentMethod: 'cash',
      status: { $in: ['out_for_delivery', 'delivered'] },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Cash order not found or not assigned to you',
      });
    }

    const tolerance = order.finalAmount * 0.15;
    if (Math.abs(collectedAmount - order.finalAmount) > tolerance) {
      return res.status(400).json({
        success: false,
        message: `Amount should be close to PKR ${order.finalAmount} (±15%)`,
      });
    }

    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    order.collectedAmount = collectedAmount;
    await order.save();

    await broadcastOrderUpdate(order, 'cash_collected', { collectedAmount });

    res.json({
      success: true,
      message: `PKR ${collectedAmount} collected and recorded successfully`,
      collectedAmount,
      paymentStatus: 'paid',
    });
  } catch (err) {
    console.error('collectCash Error:', err);
    res.status(500).json({ success: false, message: 'Failed to record cash collection' });
  }
};

// 13. Get Current Active Order
const getCurrentOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      rider: req.user._id,
      status: { $in: ['confirmed', 'preparing', 'out_for_delivery'] },
    })
      .populate('customer', 'name phone')
      .populate('address', 'label fullAddress floor instructions')
      .populate('area', 'name')
      .populate('items.menuItem', 'name image price')
      .lean();

    res.json({
      success: true,
      message: order ? 'Active order found' : 'No active delivery',
      currentOrder: order || null,
    });
  } catch (err) {
    console.error('getCurrentOrder Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch current order' });
  }
};

// ====================================================================
// EXPORT ALL FUNCTIONS
// ====================================================================
module.exports = {
  updateLocation,
  toggleAvailability,
  updateOrderLocation,
  getMyOrders,
  getRiderProfile,
  applyAsRider,
  getApplicationStatus,
  acceptOrder,
  rejectOrder,
  pickupOrder,
  deliverOrder,
  collectCash,
  getCurrentOrder,
};