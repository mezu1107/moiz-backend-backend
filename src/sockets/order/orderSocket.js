// src/sockets/order/orderSocket.js
const Order = require('../../models/order/Order');
const Rider = require('../../models/rider/Rider');
const logger = require('../../utils/logger');
const { authenticateSocket } = require('../../middleware/auth/auth');
const { roleSocket } = require('../../middleware/role/role');

const orderSocket = (io) => {
  // Remove global.io = io; → already set in server.js

  io.use(authenticateSocket);
  io.use(roleSocket(['customer', 'rider', 'admin']));

  global.emitOrderUpdate = async (orderId) => {
    try {
      const order = await Order.findById(orderId)
        .populate('customer', 'name phone')
        .populate('rider', 'user name phone')
        .populate('address', 'label fullAddress')
        .populate('area', 'name city')
        .populate('items.menuItem', 'name image price');

      if (order) {
        io.to(`order:${orderId}`).emit('orderUpdate', order);
        io.to('admin').emit('orderUpdate', { orderId, order });
      }
    } catch (err) {
      logger.error('emitOrderUpdate failed:', err);
    }
  };

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;
    logger.info(`[SOCKET] ${role.toUpperCase()} connected → ${userId}`);

    socket.join(role === 'customer' ? `customer:${userId}` : role === 'rider' ? `rider:${userId}` : 'admin');

    if (role === 'rider') io.to('admin').emit('riderOnline', { riderId: userId });

    // Customer tracking
    socket.on('trackOrder', async ({ orderId }) => {
      if (role !== 'customer') return;
      const order = await Order.findOne({ _id: orderId, customer: userId });
      if (!order) return socket.emit('error', { message: 'Order not found' });
      socket.join(`order:${orderId}`);
      socket.emit('orderInit', { orderId, status: order.status });
    });

    // Rider location update + LIMITED status change
    socket.on('riderUpdate', async ({ orderId, lat, lng, status }) => {
      if (role !== 'rider') return;

      // Update rider location
      await Rider.findOneAndUpdate(
        { user: userId },
        { currentLocation: { type: 'Point', coordinates: [lng, lat] } }
      );

      const payload = { riderLocation: { lat, lng } };

      // Only allow specific statuses from rider
      const allowedStatuses = ['picked_up', 'on_the_way'];
      if (status && allowedStatuses.includes(status)) {
        await Order.findByIdAndUpdate(orderId, { status });
        payload.status = status;
        await global.emitOrderUpdate(orderId); // Trigger full update
      }

      io.to(`order:${orderId}`).emit('riderLocation', payload);
      io.to('admin').emit('riderLiveUpdate', { riderId: userId, orderId, ...payload });
    });

    // Admin full control
    socket.on('adminOrderUpdate', async ({ orderId, status, riderId }) => {
      if (role !== 'admin') return;

      const update = {};
      if (status) update.status = status;
      if (riderId) update.rider = riderId;

      const order = await Order.findByIdAndUpdate(orderId, update, { new: true })
        .populate('customer rider address area items.menuItem');

      if (order) {
        await global.emitOrderUpdate(orderId);
        if (riderId) {
          io.to(`rider:${riderId}`).emit('newAssignment', { orderId, order });
        }
      }
    });

    socket.on('disconnect', () => {
      logger.info(`[SOCKET] ${role.toUpperCase()} disconnected → ${userId}`);
      if (role === 'rider') {
        io.to('admin').emit('riderOffline', { riderId: userId });
      }
    });
  });

  return io;
};

module.exports = orderSocket;