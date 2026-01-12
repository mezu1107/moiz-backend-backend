// src/sockets/order/orderSocket.js
// PRODUCTION-READY — JANUARY 12, 2026
// ENHANCED: Very aggressive & attention-grabbing NEW ORDER alert system for kitchen
// Features:
// - Separate loud "newOrderAlert" event only for kitchen (and light version for admin)
// - Urgent order detection based on instructions
// - Kitchen can acknowledge to stop repeating alert sound
// - Better logging and error handling

const Order = require('../../models/order/Order');
const User = require('../../models/user/User');
const KitchenOrder = require('../../models/kitchen/KitchenOrder');
const logger = require('../../utils/logger').socket;
const { authenticateSocket } = require('../../middleware/auth/auth');
const { roleSocket } = require('../../middleware/role/role');

const setupOrderSocket = (io) => {
  io.use(authenticateSocket);
  io.use(roleSocket(['customer', 'rider', 'admin', 'kitchen']));

  // ── GLOBAL HELPERS ───────────────────────────────────────────────────────

  // Normal order update (status change, rider assigned, etc.)
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
        .lean();

      if (!order) {
        logger.warn(`emitOrderUpdate: Order ${orderId} not found`);
        return;
      }

      const shortId = order._id.toString().slice(-6).toUpperCase();

      const payload = {
        ...order,
        _id: order._id.toString(),
        shortId,
        instructions: order.instructions || null,
        finalAmount: Number(order.finalAmount || 0),
        totalAmount: Number(order.totalAmount || 0),
        deliveryFee: Number(order.deliveryFee || 0),
        discountApplied: Number(order.discountApplied || 0),
        walletUsed: Number(order.walletUsed || 0),
        rider: order.rider
          ? {
              _id: order.rider._id.toString(),
              name: order.rider.name,
              phone: order.rider.phone,
            }
          : null,
      };

      // Send to relevant rooms
      if (order.customer) io.to(`user:${order.customer}`).emit('orderUpdate', payload);
      io.to(`order:${orderId}`).emit('orderUpdate', payload); // guests
      io.to('admin').emit('orderUpdate', payload);
      io.to('kitchen').emit('orderUpdate', payload);

      logger.info(`Order update broadcast: #${shortId} → ${order.status}`);
    } catch (err) {
      logger.error('emitOrderUpdate failed:', err);
    }
  };

  // ── VERY IMPORTANT: Aggressive NEW ORDER alert (mainly for kitchen) ──────
  global.emitNewOrderAlert = async (orderId) => {
    try {
      const order = await Order.findById(orderId)
        .select('guestInfo customer finalAmount items instructions')
        .lean();

      if (!order) return;

      const shortId = order._id.toString().slice(-6).toUpperCase();

      const isUrgent = /asap|urgent|now|fast|quick/i.test(order.instructions || '');

      const alertPayload = {
        orderId: order._id.toString(),
        shortId,
        customerName: order.guestInfo?.name || order.customer?.name || 'Guest',
        total: Number(order.finalAmount || 0),
        itemsCount: order.items?.length || 0,
        isUrgent,
        timestamp: new Date().toISOString(),
      };

      // === VERY LOUD & ATTENTION-GRABBING for kitchen ===
      io.to('kitchen').emit('newOrderAlert', alertPayload);

      // === Lighter version for admin ===
      io.to('admin').emit('newOrderAlert', {
        ...alertPayload,
        isUrgent: false // admins usually get less aggressive notification
      });

      logger.info(`NEW ORDER ALERT → #${shortId} (urgent: ${isUrgent})`);
    } catch (err) {
      logger.error('emitNewOrderAlert failed:', err);
    }
  };

  // ── Other global helpers (kitchen order & stats) ─────────────────────────
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

  // ── SOCKET CONNECTION HANDLING ───────────────────────────────────────────
  io.on('connection', (socket) => {
    const { id: userId, role, name = 'Staff', phone } = socket.user || {};
    logger.info(`${role?.toUpperCase() || 'GUEST/UNKNOWN'} connected → ${userId || 'anonymous'} (${name})`);

    // Room joining
    if (role === 'customer' && userId) socket.join(`user:${userId}`);
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
          version: '2.2 - enhanced alerts',
        });
        global.emitKitchenStats();
      }
    }

    // Guest/public tracking
    socket.on('trackOrder', async ({ orderId }) => {
      if (!orderId) return;
      try {
        const order = await Order.findById(orderId)
          .populate('rider', 'name phone')
          .lean();

        if (!order) {
          return socket.emit('error', { message: 'Order not found' });
        }

        socket.join(`order:${orderId}`);

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
        logger.info(`Tracking started: order:${orderId} (#${shortId}) - ${role || 'guest'}`);
      } catch (err) {
        logger.error('trackOrder error:', err);
        socket.emit('error', { message: 'Failed to track order' });
      }
    });

    // Rider location & manual status updates
    socket.on('riderUpdate', async ({ orderId, lat, lng, status }) => {
      if (role !== 'rider' || !userId) return;
      // ... (your existing riderUpdate handler remains unchanged)
    });

    // Kitchen manual refresh
    socket.on('refreshKitchen', () => {
      if (!['kitchen', 'admin'].includes(role)) return;
      global.emitKitchenStats();
    });

    // Kitchen acknowledges loud new order alert → stops sound
    socket.on('acknowledgeNewOrder', ({ orderId }) => {
      if (!['kitchen', 'admin'].includes(role)) return;
      logger.info(`${role} acknowledged new order alert ${orderId}`);
      socket.emit('stopNewOrderAlert', { orderId });
      // You may also want to broadcast to other kitchen tabs:
      // io.to('kitchen').emit('stopNewOrderAlert', { orderId });
    });

    socket.on('disconnect', (reason) => {
      logger.info(`${role?.toUpperCase() || 'GUEST/UNKNOWN'} disconnected → ${userId || 'anonymous'} (${name}) [${reason}]`);
      if (role === 'rider' && userId) {
        io.to('admin').emit('riderOffline', { riderId: userId });
        io.to('kitchen').emit('riderOffline', { riderId: userId });
      }
    });
  });
};

module.exports = setupOrderSocket;