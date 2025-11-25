// src/sockets/order/orderSocket.js
const Order = require('../../models/order/Order');
const User = require('../../models/user/User'); // ← Now we use User instead of Rider
const logger = require('../../utils/logger').socket;
const { authenticateSocket } = require('../../middleware/auth/auth');
const { roleSocket } = require('../../middleware/role/role');

const setupOrderSocket = (io) => {
  io.use(authenticateSocket);
  io.use(roleSocket(['customer', 'rider', 'admin']));

  // Global helper to emit order updates
  global.emitOrderUpdate = async (orderId) => {
    try {
      const order = await Order.findById(orderId)
        .populate('customer', 'name phone')
        .populate('rider', 'name phone currentLocation') // ← rider is a User reference
        .populate('address', 'label fullAddress floor instructions')
        .populate('area', 'name city')
        .populate({
          path: 'items.menuItem',
          select: 'name image price'
        });

      if (order) {
        io.to(`order:${orderId}`).emit('orderUpdate', order);
        io.to('admin').emit('orderUpdate', order);
      }
    } catch (err) {
      logger.error('emitOrderUpdate failed:', err);
    }
  };

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;
    logger.info(`${role.toUpperCase()} connected → ${userId}`);

    // Join role-based room
    const room = role === 'customer' ? `user:${userId}` : 
                 role === 'rider' ? `rider:${userId}` : 
                 'admin';
    socket.join(room);

    // Notify admins when rider comes online
    if (role === 'rider') {
      io.to('admin').emit('riderOnline', { 
        riderId: userId,
        name: socket.user.name,
        phone: socket.user.phone
      });
    }

    // Customer joins their order room to track live
    socket.on('trackOrder', async ({ orderId }) => {
      if (role !== 'customer') return;

      const order = await Order.findOne({ 
        _id: orderId, 
        customer: userId 
      });

      if (!order) {
        return socket.emit('error', { message: 'Order not found or access denied' });
      }

      socket.join(`order:${orderId}`);
      socket.emit('orderInit', { 
        orderId, 
        status: order.status,
        riderLocation: order.rider ? socket.user.currentLocation : null
      });
    });

    // Rider sends live location + status updates
    socket.on('riderUpdate', async ({ orderId, lat, lng, status }) => {
      if (role !== 'rider') return;

      const order = await Order.findOne({ 
        _id: orderId, 
        rider: userId 
      });

      if (!order) return;

      // Update rider's live location in User model
      await User.findByIdAndUpdate(userId, {
        currentLocation: {
          type: 'Point',
          coordinates: [lng, lat]  // MongoDB expects [longitude, latitude]
        },
        locationUpdatedAt: new Date(),
        isOnline: true,
        isAvailable: status !== 'out_for_delivery' // optional logic
      });

      const payload = { 
        riderLocation: { lat, lng },
        riderId: userId
      };

      // Update order status if provided
      if (status && ['preparing', 'out_for_delivery', 'delivered'].includes(status)) {
        order.status = status;
        await order.save();
        payload.status = status;
        await global.emitOrderUpdate(orderId);
      }

      // Send live location to customer & admin
      io.to(`order:${orderId}`).emit('riderLocation', payload);
      io.to('admin').emit('riderLiveUpdate', { 
        orderId, 
        riderId: userId, 
        location: { lat, lng },
        status: order.status
      });
    });

    // Optional: Rider manually goes offline
    socket.on('riderGoOffline', async () => {
      if (role === 'rider') {
        await User.findByIdAndUpdate(userId, { 
          isOnline: false, 
          isAvailable: false 
        });
        io.to('admin').emit('riderOffline', { riderId: userId });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`${role.toUpperCase()} disconnected → ${userId}`);
      if (role === 'rider') {
        // Optional: mark as offline on disconnect (uncomment if needed)
        // User.findByIdAndUpdate(userId, { isOnline: false, isAvailable: false });
        io.to('admin').emit('riderOffline', { riderId: userId });
      }
    });
  });
};

module.exports = setupOrderSocket;