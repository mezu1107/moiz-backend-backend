// src/controllers/kitchen/kitchenController.js
// FINAL PRODUCTION VERSION — FULL KITCHEN REAL-TIME INTEGRATION (DEC 2025)

const KitchenOrder = require('../../models/kitchen/KitchenOrder');
const Order = require('../../models/order/Order');

const getKitchenOrders = async (req, res) => {
  try {
    const orders = await KitchenOrder.find()
      .populate('order', 'finalAmount paymentMethod placedAt')
      .populate('items.menuItem', 'name image')
      .sort({ placedAt: -1 })
      .lean();

    const activeOrders = orders.filter(o => !['ready', 'completed'].includes(o.status));
    const completedToday = orders.filter(o =>
      o.status === 'ready' &&
      o.readyAt &&
      new Date(o.readyAt).toDateString() === new Date().toDateString()
    );

    res.json({
      success: true,
      active: activeOrders,
      stats: {
        new: activeOrders.filter(o => o.status === 'new').length,
        preparing: activeOrders.filter(o => o.status === 'preparing').length,
        readyToday: completedToday.length
      }
    });
  } catch (err) {
    console.error('getKitchenOrders error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const startPreparingItem = async (req, res) => {
  const { kitchenOrderId, itemId } = req.body;

  try {
    const kitchenOrder = await KitchenOrder.findById(kitchenOrderId);
    if (!kitchenOrder) return res.status(404).json({ success: false, message: 'Kitchen order not found' });

    const item = kitchenOrder.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Item already started or completed' });
    }

    item.status = 'preparing';
    item.startedAt = new Date();

    if (kitchenOrder.status === 'new') {
      kitchenOrder.status = 'preparing';
      kitchenOrder.startedAt = new Date();
    }

    await kitchenOrder.save();

    // === REAL-TIME KITCHEN EVENTS ===
    const io = global.io;
    if (io) {
      global.emitKitchenOrderUpdate?.(kitchenOrder);
      global.emitKitchenStats?.();

      io.to('kitchen').emit('itemStarted', {
        kitchenOrderId: kitchenOrder._id,
        shortId: kitchenOrder.shortId,
        itemId,
        itemName: item.name,
        timestamp: new Date()
      });

      io.to('admin').emit('kitchen-update', kitchenOrder);
    }

    res.json({ success: true, message: 'Item started', kitchenOrder });
  } catch (err) {
    console.error('startPreparingItem error:', err);
    res.status(500).json({ success: false, message: 'Failed to start item' });
  }
};

const completeItem = async (req, res) => {
  const { kitchenOrderId, itemId } = req.body;

  try {
    const kitchenOrder = await KitchenOrder.findById(kitchenOrderId);
    if (!kitchenOrder) return res.status(404).json({ success: false, message: 'Kitchen order not found' });

    const item = kitchenOrder.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.status === 'ready') {
      return res.status(400).json({ success: false, message: 'Item already completed' });
    }

    item.status = 'ready';
    item.readyAt = new Date();

    const allReady = kitchenOrder.items.every(i => i.status === 'ready');

    if (allReady) {
      kitchenOrder.status = 'ready';
      kitchenOrder.readyAt = new Date();
    }

    await kitchenOrder.save();

    // === REAL-TIME KITCHEN EVENTS ===
    const io = global.io;
    if (io) {
      global.emitKitchenOrderUpdate?.(kitchenOrder);
      global.emitKitchenStats?.();

      io.to('kitchen').emit('itemCompleted', {
        kitchenOrderId: kitchenOrder._id,
        shortId: kitchenOrder.shortId,
        itemId,
        itemName: item.name,
        timestamp: new Date()
      });

      if (allReady) {
        io.to('kitchen').emit('orderReadyForDelivery', {
          kitchenOrderId: kitchenOrder._id,
          shortId: kitchenOrder.shortId,
          customerName: kitchenOrder.customerName,
          itemsCount: kitchenOrder.items.length,
          timestamp: new Date()
        });

        io.to('admin').emit('order-ready-for-delivery', {
          orderId: kitchenOrder.order,
          shortId: kitchenOrder.shortId,
          customerName: kitchenOrder.customerName,
          timestamp: new Date()
        });
      }

      io.to('admin').emit('kitchen-update', kitchenOrder);
    }

    res.json({
      success: true,
      message: allReady ? 'Order ready for delivery!' : 'Item completed',
      allReady,
      kitchenOrder
    });
  } catch (err) {
    console.error('completeItem error:', err);
    res.status(500).json({ success: false, message: 'Failed to complete item' });
  }
};

module.exports = {
  getKitchenOrders,
  startPreparingItem,
  completeItem
};