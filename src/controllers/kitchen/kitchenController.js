// src/controllers/kitchen/kitchenController.js
// FINAL PRODUCTION VERSION — FULL KITCHEN REAL-TIME INTEGRATION (DEC 2025)

const KitchenOrder = require('../../models/kitchen/KitchenOrder');
const Order = require('../../models/order/Order');


// src/controllers/kitchen/kitchenController.js → getKitchenOrders

const getKitchenOrders = async (req, res) => {
  try {
    const orders = await KitchenOrder.find()
      .populate('order', 'finalAmount paymentMethod placedAt')
      .populate('items.menuItem', 'name image')
      .sort({ placedAt: -1 })
      .lean();

    const activeOrders = orders.filter(o => 
      ['new', 'preparing'].includes(o.status)
    );

    const readyOrders = orders.filter(o => o.status === 'ready');

    const completedToday = orders.filter(o =>
      o.status === 'completed' &&
      o.completedAt &&
      new Date(o.completedAt).toDateString() === new Date().toDateString()
    );

    res.json({
      success: true,
      active: activeOrders,
      ready: readyOrders,           // ← SEND READY ORDERS
      stats: {
        new: activeOrders.filter(o => o.status === 'new').length,
        preparing: activeOrders.filter(o => o.status === 'preparing').length,
        readyToday: readyOrders.length,
        completedToday: completedToday.length
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

// src/controllers/kitchen/kitchenController.js → completeItem

const completeItem = async (req, res) => {
  const { kitchenOrderId, itemId } = req.body;

  try {
    // ایڈریس اور فائنل اماؤنٹ کے لیے order کو بھی populate کریں
    const kitchenOrder = await KitchenOrder.findById(kitchenOrderId)
      .populate('order', 'addressDetails fullAddress finalAmount paymentMethod');

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
        const readyPayload = {
          orderId: kitchenOrder.order?._id?.toString(),
          kitchenOrderId: kitchenOrder._id.toString(),
          shortId: kitchenOrder.shortId,
          customerName: kitchenOrder.customerName,
          address: kitchenOrder.order?.addressDetails?.fullAddress || 'Pickup from kitchen',
          itemsCount: kitchenOrder.items.length,
          totalAmount: kitchenOrder.order?.finalAmount || 0,
          paymentMethod: kitchenOrder.order?.paymentMethod || 'cash',
          timestamp: new Date()
        };

        // کچن کو بھی بتائیں
        io.to('kitchen').emit('orderReadyForDelivery', readyPayload);

        // ایڈمن کو فوراً بتائیں
        io.to('admin').emit('order-ready-for-delivery', readyPayload);

        // رائڈر کو بھی بتائیں (اگر آپ رائڈر ایپ بنا رہے ہیں)
        io.to('rider').emit('orderReadyForPickup', readyPayload);
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

// NEW: Mark entire order as completed (served/delivered)
const completeOrder = async (req, res) => {
  const { kitchenOrderId } = req.body;
  try {
    const kitchenOrder = await KitchenOrder.findById(kitchenOrderId);
    if (!kitchenOrder) return res.status(404).json({ success: false, message: 'Kitchen order not found' });
    if (kitchenOrder.status !== 'ready') {
      return res.status(400).json({ success: false, message: 'Order must be ready first' });
    }
    kitchenOrder.status = 'completed';
    kitchenOrder.completedAt = new Date();
    await kitchenOrder.save();

    // === REAL-TIME EVENTS ===
    const io = global.io;
    if (io) {
      global.emitKitchenOrderUpdate?.(kitchenOrder);
      global.emitKitchenStats?.();
      io.to('kitchen').emit('orderCompleted', {
        kitchenOrderId: kitchenOrder._id,
        shortId: kitchenOrder.shortId,
        timestamp: new Date()
      });
      io.to('admin').emit('kitchen-update', kitchenOrder);
      io.to('rider').emit('order-delivered', { orderId: kitchenOrder.order }); // Notify rider if needed
    }

    res.json({ 
      success: true, 
      message: 'Order marked as completed and archived!', 
      kitchenOrder 
    });
  } catch (err) {
    console.error('completeOrder error:', err);
    res.status(500).json({ success: false, message: 'Failed to complete order' });
  }
};

module.exports = {
  getKitchenOrders,
  startPreparingItem,
  completeItem,
  completeOrder // ✅ REQUIRED
};
