// src/sockets/order/orderSocket.js
// PRODUCTION-READY — JANUARY 09, 2026
// FULL REAL-TIME ORDER TRACKING FOR CUSTOMERS + ADMIN + KITCHEN

const Order = require('../../models/order/Order');
const User = require('../../models/user/User');
const KitchenOrder = require('../../models/kitchen/KitchenOrder');
const logger = require('../../utils/logger').socket;
const { authenticateSocket } = require('../../middleware/auth/auth');
const { roleSocket } = require('../../middleware/role/role');

const setupOrderSocket = (io) => {
  io.use(authenticateSocket);
  io.use(roleSocket(['customer', 'rider', 'admin', 'kitchen']));

  // === GLOBAL: Emit full order update to all relevant parties ===
  global.emitOrderUpdate = async (orderId) => {
    try {
      const order = await Order.findById(orderId)
        .populate('customer', 'name phone')
        .populate('rider', 'name phone currentLocation')
        .populate('address', 'label fullAddress floor instructions')
        .populate('area', 'name city')
        .populate({
          path: 'items.menuItem',
          select: 'name image price unit isAvailable',
        })
        .lean(); // Use lean() for performance in socket emissions

      if (!order) {
        logger.warn(`emitOrderUpdate: Order ${orderId} not found`);
        return;
      }

      const shortId = order._id.toString().slice(-6).toUpperCase();

      // Enrich payload with computed fields expected by frontend
      const payload = {
        ...order,
        _id: order._id.toString(),
        shortId,
        instructions: order.instructions || null,
        // Ensure totals are numbers (frontend uses toNumber)
        finalAmount: Number(order.finalAmount || 0),
        totalAmount: Number(order.totalAmount || 0),
        deliveryFee: Number(order.deliveryFee || 0),
        discountApplied: Number(order.discountApplied || 0),
        walletUsed: Number(order.walletUsed || 0),
        // Rider fallback
        rider: order.rider
          ? {
              _id: order.rider._id.toString(),
              name: order.rider.name,
              phone: order.rider.phone,
            }
          : null,
      };

      // Emit to:
      // 1. Customers actively tracking this order (public + logged-in)
      io.to(`order:${orderId}`).emit('orderUpdate', payload);

      // 2. All admin panels
      io.to('admin').emit('orderUpdate', payload);

      // 3. Kitchen displays
      io.to('kitchen').emit('orderUpdate', payload);

      logger.info(`Order update emitted: #${shortId} → ${order.status}`);
    } catch (err) {
      logger.error('emitOrderUpdate failed:', err);
    }
  };

  // === GLOBAL: Kitchen Order Update ===
  global.emitKitchenOrderUpdate = async (kitchenOrder) => {
    if (!kitchenOrder) return;

    try {
      const populated = await KitchenOrder.findById(kitchenOrder._id)
        .populate('items.menuItem', 'name image')
        .lean();

      if (!populated) return;

      const payload = {
        ...populated,
        shortId: kitchenOrder.shortId || populated._id.toString().slice(-6).toUpperCase(),
      };

      io.to('kitchen').emit('kitchenOrderUpdate', payload);
      io.to('admin').emit('kitchenOrderUpdate', payload);
    } catch (err) {
      logger.error('emitKitchenOrderUpdate failed:', err);
    }
  };

  // === GLOBAL: Kitchen Stats Update ===
  global.emitKitchenStats = async () => {
    try {
      const orders = await KitchenOrder.find().lean();

      const active = orders.filter((o) => !['ready', 'completed'].includes(o.status));

      const today = new Date().toDateString();
      const readyToday = orders.filter(
        (o) => o.status === 'ready' && o.readyAt && new Date(o.readyAt).toDateString() === today
      );

      const stats = {
        new: active.filter((o) => o.status === 'new').length,
        preparing: active.filter((o) => o.status === 'preparing').length,
        readyToday: readyToday.length,
        totalActive: active.length,
        timestamp: new Date(),
      };

      io.to('kitchen').emit('kitchenStatsUpdate', stats);
      io.to('admin').emit('kitchenStatsUpdate', stats);
    } catch (err) {
      logger.error('emitKitchenStats failed:', err);
    }
  };

  io.on('connection', (socket) => {
    const { id: userId, role, name = 'Staff', phone } = socket.user || {};
    logger.info(`${role?.toUpperCase() || 'UNKNOWN'} connected → ${userId} (${name})`);

    // === ROOM JOINING ===
    if (role === 'customer' && userId) {
      socket.join(`user:${userId}`);
    }

    if (role === 'rider' && userId) {
      socket.join(`rider:${userId}`);
      io.to('admin').emit('riderOnline', { riderId: userId, name, phone });
      io.to('kitchen').emit('riderOnline', { riderId: userId, name });
    }

    if (role === 'admin' || role === 'kitchen') {
      socket.join('admin');
      socket.join('kitchen');

      if (role === 'kitchen') {
        socket.emit('kitchenConnected', {
          message: 'Kitchen display connected',
          timestamp: new Date(),
          version: '2.1',
        });
        global.emitKitchenStats();
      }
    }

    // === CUSTOMER: Start tracking a specific order (public or logged-in) ===
    socket.on('trackOrder', async ({ orderId }) => {
      if (!orderId) return;

      try {
        // Allow both authenticated customers and public tracking (no auth check needed for public)
        const order = await Order.findById(orderId)
          .populate('rider', 'name phone')
          .lean();

        if (!order) {
          return socket.emit('error', { message: 'Order not found' });
        }

        // Join the order-specific room
        socket.join(`order:${orderId}`);

        // Send initial full order data
        const shortId = orderId.slice(-6).toUpperCase();
        const initialPayload = {
          ...order,
          _id: order._id.toString(),
          shortId,
          instructions: order.instructions || null,
          rider: order.rider
            ? { _id: order.rider._id.toString(), name: order.rider.name, phone: order.rider.phone }
            : null,
          finalAmount: Number(order.finalAmount || 0),
        };

        socket.emit('orderInit', initialPayload);

        logger.info(`Customer joined tracking room: order:${orderId} (#${shortId})`);
      } catch (err) {
        logger.error('trackOrder error:', err);
        socket.emit('error', { message: 'Failed to track order' });
      }
    });

    // === RIDER: Live location and status updates ===
    socket.on('riderUpdate', async ({ orderId, lat, lng, status }) => {
      if (role !== 'rider' || !userId) return;

      try {
        const order = await Order.findOne({ _id: orderId, rider: userId });
        if (!order) return;

        // Update rider location
        await User.findByIdAndUpdate(userId, {
          currentLocation: { type: 'Point', coordinates: [lng, lat] },
          locationUpdatedAt: new Date(),
          isOnline: true,
          isAvailable: status !== 'out_for_delivery',
        });

        const payload = { riderLocation: { lat, lng }, riderId: userId };

        // If rider manually updates status
        if (status && ['preparing', 'out_for_delivery', 'delivered'].includes(status)) {
          order.status = status;
          if (status === 'out_for_delivery') order.outForDeliveryAt = new Date();
          if (status === 'delivered') order.deliveredAt = new Date();
          await order.save();

          payload.status = status;
          await global.emitOrderUpdate(orderId);
        }

        // Broadcast location to tracking page + admin + kitchen
        io.to(`order:${orderId}`).emit('riderLocation', payload);
        io.to('admin').emit('riderLiveUpdate', {
          orderId,
          riderId: userId,
          location: { lat, lng },
          status: order.status,
        });
        io.to('kitchen').emit('riderLiveUpdate', {
          orderId,
          riderId: userId,
          location: { lat, lng },
        });
      } catch (err) {
        logger.error('riderUpdate error:', err);
      }
    });

    // === KITCHEN: Manual refresh ===
    socket.on('refreshKitchen', () => {
      if (!['kitchen', 'admin'].includes(role)) return;
      global.emitKitchenStats();
    });

    // === DISCONNECT ===
    socket.on('disconnect', (reason) => {
      logger.info(`${role?.toUpperCase() || 'UNKNOWN'} disconnected → ${userId} (${name}) [${reason}]`);

      if (role === 'rider' && userId) {
        io.to('admin').emit('riderOffline', { riderId: userId });
        io.to('kitchen').emit('riderOffline', { riderId: userId });
      }
    });
  });
};

module.exports = setupOrderSocket;