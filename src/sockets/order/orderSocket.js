// src/sockets/order/orderSocket.js
const Order = require('../../models/order/Order');
const Rider = require('../../models/rider/Rider');
const logger = require('../../utils/logger').socket;
const { authenticateSocket } = require('../../middleware/auth/auth');
const { roleSocket } = require('../../middleware/role/role');

const setupOrderSocket = (io) => {
  io.use(authenticateSocket);
  io.use(roleSocket(['customer', 'rider', 'admin']));

  global.emitOrderUpdate = async (orderId) => {
    try {
      const order = await Order.findById(orderId)
        .populate('customer', 'name phone')
        .populate('rider', 'user name phone')
        .populate('address', 'label fullAddress')
        .populate('area', 'name city')
        .populate({ path: 'items.menuItem', select: 'name image price' });

      if (order) {
        io.to(`order:${orderId}`).emit('orderUpdate', order);
        io.to('admin').emit('orderUpdate', order); // ← Unified room name
      }
    } catch (err) {
      logger.error('emitOrderUpdate failed:', err);
    }
  };

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;
    logger.info(`${role.toUpperCase()} connected → ${userId}`);

    // Unified room naming
    socket.join(role === 'customer' ? `user:${userId}` : role === 'rider' ? `rider:${userId}` : 'admin');

    if (role === 'rider') {
      io.to('admin').emit('riderOnline', { riderId: userId });
    }

    socket.on('trackOrder', async ({ orderId }) => {
      if (role !== 'customer') return;
      const order = await Order.findOne({ _id: orderId, customer: userId });
      if (!order) return socket.emit('error', { message: 'Order not found' });
      socket.join(`order:${orderId}`);
      socket.emit('orderInit', { orderId, status: order.status });
    });

    socket.on('riderUpdate', async ({ orderId, lat, lng, status }) => {
      if (role !== 'rider') return;
      const order = await Order.findOne({ _id: orderId, rider: socket.user.id });
      if (!order) return;

      await Rider.findOneAndUpdate(
        { user: userId },
        { currentLocation: { type: 'Point', coordinates: [lng, lat] } }
      );

      const payload = { riderLocation: { lat, lng } };

      if (status && ['picked_up', 'on_the_way'].includes(status)) {
        order.status = status;
        await order.save();
        payload.status = status;
        await global.emitOrderUpdate(orderId);
      }

      io.to(`order:${orderId}`).emit('riderLocation', payload);
      io.to('admin').emit('riderLiveUpdate', { riderId: userId, orderId, ...payload });
    });

    socket.on('disconnect', () => {
      logger.info(`${role.toUpperCase()} disconnected → ${userId}`);
      if (role === 'rider') {
        io.to('admin').emit('riderOffline', { riderId: userId });
      }
    });
  });
};

module.exports = setupOrderSocket;