// src/sockets/order/orderSocket.js
// FINAL PRODUCTION VERSION — FULL KITCHEN DASHBOARD EXPERIENCE (DEC 2025)

const Order = require('../../models/order/Order');
const User = require('../../models/user/User');
const KitchenOrder = require('../../models/kitchen/KitchenOrder');
const logger = require('../../utils/logger').socket;
const { authenticateSocket } = require('../../middleware/auth/auth');
const { roleSocket } = require('../../middleware/role/role');

const setupOrderSocket = (io) => {
  io.use(authenticateSocket);
  io.use(roleSocket(['customer', 'rider', 'admin', 'kitchen']));

  // === GLOBAL: Full order update (customer + admin + kitchen) ===
  global.emitOrderUpdate = async (orderId) => {
    try {
      const order = await Order.findById(orderId)
        .populate('customer', 'name phone')
        .populate('rider', 'name phone currentLocation')
        .populate('address', 'label fullAddress floor instructions')
        .populate('area', 'name city')
        .populate({ path: 'items.menuItem', select: 'name image price' });

      if (!order) return;

      const payload = {
        ...order.toObject(),
        shortId: order._id.toString().slice(-6).toUpperCase(),
        instructions: order.instructions || null
      };

      io.to(`order:${orderId}`).emit('orderUpdate', payload);
      io.to('admin').emit('orderUpdate', payload);
      io.to('kitchen').emit('orderUpdate', payload);
    } catch (err) {
      logger.error('emitOrderUpdate failed:', err);
    }
  };

  // === GLOBAL: Kitchen Order Update ===
  global.emitKitchenOrderUpdate = async (kitchenOrder) => {
    if (!kitchenOrder) return;
    const populated = await KitchenOrder.findById(kitchenOrder._id)
      .populate('items.menuItem', 'name image')
      .lean();

    const payload = { ...populated, shortId: kitchenOrder.shortId };

    io.to('kitchen').emit('kitchenOrderUpdate', payload);
    io.to('admin').emit('kitchenOrderUpdate', payload);
  };

  // === GLOBAL: Kitchen Stats Update ===
  global.emitKitchenStats = async () => {
    try {
      const orders = await KitchenOrder.find().lean();
      const active = orders.filter(o => !['ready', 'completed'].includes(o.status));
      const readyToday = orders.filter(o =>
        o.status === 'ready' && o.readyAt &&
        new Date(o.readyAt).toDateString() === new Date().toDateString()
      );

      const stats = {
        new: active.filter(o => o.status === 'new').length,
        preparing: active.filter(o => o.status === 'preparing').length,
        readyToday: readyToday.length,
        totalActive: active.length,
        timestamp: new Date()
      };

      io.to('kitchen').emit('kitchenStatsUpdate', stats);
      io.to('admin').emit('kitchenStatsUpdate', stats);
    } catch (err) {
      logger.error('emitKitchenStats failed:', err);
    }
  };

  io.on('connection', (socket) => {
    const { id: userId, role, name = 'Staff' } = socket.user;
    logger.info(`${role.toUpperCase()} connected → ${userId} (${name})`);

    // === ROOM JOINING ===
    if (role === 'customer') {
      socket.join(`user:${userId}`);
    } else if (role === 'rider') {
      socket.join(`rider:${userId}`);
      io.to('admin').emit('riderOnline', { riderId: userId, name, phone: socket.user.phone });
      io.to('kitchen').emit('riderOnline', { riderId: userId, name });
    } else if (role === 'kitchen' || role === 'admin') {
      socket.join('admin');
      socket.join('kitchen');

      if (role === 'kitchen') {
        socket.emit('kitchenConnected', {
          message: 'Kitchen display connected',
          timestamp: new Date(),
          version: '2.0'
        });
        global.emitKitchenStats();
      }
    }

    // === CUSTOMER: Track Order ===
    socket.on('trackOrder', async ({ orderId }) => {
      if (role !== 'customer') return;
      const order = await Order.findOne({ _id: orderId, customer: userId });
      if (!order) return socket.emit('error', { message: 'Access denied' });
      socket.join(`order:${orderId}`);
      socket.emit('orderInit', { orderId, status: order.status, instructions: order.instructions || null });
    });

    // === RIDER: Live Location & Status ===
    socket.on('riderUpdate', async ({ orderId, lat, lng, status }) => {
      if (role !== 'rider') return;
      const order = await Order.findOne({ _id: orderId, rider: userId });
      if (!order) return;

      await User.findByIdAndUpdate(userId, {
        currentLocation: { type: 'Point', coordinates: [lng, lat] },
        locationUpdatedAt: new Date(),
        isOnline: true,
        isAvailable: status !== 'out_for_delivery'
      });

      const payload = { riderLocation: { lat, lng }, riderId: userId };

      if (status && ['preparing', 'out_for_delivery', 'delivered'].includes(status)) {
        order.status = status;
        await order.save();
        payload.status = status;
        await global.emitOrderUpdate(orderId);
      }

      io.to(`order:${orderId}`).emit('riderLocation', payload);
      io.to('admin').emit('riderLiveUpdate', { orderId, riderId: userId, location: { lat, lng }, status: order.status });
      io.to('kitchen').emit('riderLiveUpdate', { orderId, riderId: userId, location: { lat, lng } });
    });

    // === KITCHEN: Manual Refresh ===
    socket.on('refreshKitchen', () => {
      if (!['kitchen', 'admin'].includes(role)) return;
      global.emitKitchenStats();
    });

    // === DISCONNECT ===
    socket.on('disconnect', () => {
      logger.info(`${role.toUpperCase()} disconnected → ${userId} (${name})`);
      if (role === 'rider') {
        io.to('admin').emit('riderOffline', { riderId: userId });
        io.to('kitchen').emit('riderOffline', { riderId: userId });
      }
    });
  });
};

module.exports = setupOrderSocket;