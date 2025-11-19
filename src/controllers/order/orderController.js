const Order = require('../../models/order/Order');
const Address = require('../../models/address/Address');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');
const MenuItem = require('../../models/menuItem/MenuItem');
const Cart = require('../../models/cart/Cart');
const User = require('../../models/user/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { applyAndTrackDeal } = require('../deal/dealController');

// Global io & timeout storage
const io = global.io;
global.pendingOrderTimeouts = global.pendingOrderTimeouts || {};
const AUTO_CANCEL_DELAY = 15 * 60 * 1000; // 15 minutes

// ====================== NOTIFICATION SYSTEM ======================
const sendNotification = async (order, event, extra = {}) => {
  if (!io) return;

  const payload = {
    event,
    orderId: order._id.toString(),
    status: order.status,
    timestamp: new Date(),
    order: {
      _id: order._id,
      status: order.status,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      estimatedDelivery: order.estimatedDelivery,
      placedAt: order.placedAt
    },
    ...extra
  };

  io.to(`user:${order.customer}`).emit('orderUpdate', payload);
  if (order.rider) io.to(`rider:${order.rider}`).emit('orderUpdate', payload);
  io.to('admin').emit('orderUpdate', payload);

  // FCM Push
  try {
    const customer = await User.findById(order.customer).select('fcmToken name');
    if (customer?.fcmToken) {
      const titleMap = {
        new_order: 'Order Placed!',
        status_updated: 'Order Update',
        rider_assigned: 'Rider Assigned',
        order_cancelled: 'Order Cancelled',
        order_rejected: 'Order Rejected'
      };
      const bodyMap = {
        pending: 'Your order has been received',
        confirmed: 'Your order has been confirmed!',
        preparing: 'Your food is being prepared',
        out_for_delivery: 'Your order is out for delivery!',
        delivered: 'Order delivered successfully!',
        cancelled: 'Your order has been cancelled',
        rejected: 'Your order was rejected'
      };

      await require('firebase-admin').messaging().send({
        token: customer.fcmToken,
        notification: {
          title: titleMap[event] || 'Order Update',
          body: bodyMap[order.status] || `Your order is now: ${order.status.replace('_', ' ')}`
        },
        data: { type: 'order_update', orderId: order._id.toString(), event }
      });
    }

    if (order.rider && event === 'rider_assigned') {
      const rider = await User.findById(order.rider).select('fcmToken');
      if (rider?.fcmToken) {
        await require('firebase-admin').messaging().send({
          token: rider.fcmToken,
          notification: {
            title: 'New Delivery Assigned',
            body: `Order #${order._id} – Pickup from restaurant`
          },
          data: { type: 'new_assignment', orderId: order._id.toString() }
        });
      }
    }
  } catch (err) {
    console.error('FCM Error:', err.message);
  }
};

// ====================== MAIN CONTROLLERS ======================

const createOrder = async (req, res) => {
  const { items, addressId, paymentMethod = 'cash', promoCode } = req.body;
  const customerId = req.user.id;

  try {
    const address = await Address.findOne({ _id: addressId, user: customerId }).populate('area');
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    const deliveryZone = await DeliveryZone.findOne({ area: address.area._id, isActive: true });
    if (!deliveryZone) return res.status(400).json({ success: false, message: 'Delivery not available in your area' });

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem?.isAvailable) continue;

      const quantity = Math.max(1, Number(item.quantity) || 1);
      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        priceAtOrder: menuItem.price,
        quantity
      });
      subtotal += menuItem.price * quantity;
    }

    if (orderItems.length === 0)
      return res.status(400).json({ success: false, message: 'No available items in cart' });

    if (subtotal < deliveryZone.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is PKR ${deliveryZone.minOrderAmount}`
      });
    }

    let discount = 0;
    let appliedDeal = null;

    if (promoCode) {
      const result = await applyAndTrackDeal(promoCode.trim().toUpperCase(), subtotal, customerId);
      if (result?.discount > 0) {
        discount = result.discount;
        appliedDeal = { dealId: result.dealId, code: result.code };
      }
    }

    const finalAmount = Math.max(0, subtotal + deliveryZone.deliveryFee - discount);

    const baseOrderData = {
      customer: customerId,
      items: orderItems,
      totalAmount: subtotal,
      deliveryFee: deliveryZone.deliveryFee,
      discountApplied: discount,
      finalAmount,
      address: addressId,
      area: address.area._id,
      deliveryZone: deliveryZone._id,
      estimatedDelivery: deliveryZone.estimatedTime || '40-55 min',
      appliedDeal
    };

    let order;

    if (paymentMethod === 'cash') {
      order = await Order.create({ ...baseOrderData, paymentMethod: 'cash', status: 'pending', paymentStatus: 'pending' });
      await Cart.deleteOne({ user: customerId });
      await order.populate([
        { path: 'address', select: 'label fullAddress location' },
        { path: 'area', select: 'name city' },
        { path: 'items.menuItem', select: 'name image price' },
        { path: 'customer', select: 'name phone' }
      ]);

      await sendNotification(order, 'new_order');
      if (io) io.to('admin').emit('orderUpdate', { event: 'new_order', order });

      return res.status(201).json({ success: true, message: 'Order placed successfully!', order });
    }

    if (paymentMethod === 'card') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalAmount * 100),
        currency: 'pkr',
        metadata: { customerId: customerId.toString(), type: 'food_order' },
        automatic_payment_methods: { enabled: true }
      });

      order = await Order.create({
        ...baseOrderData,
        paymentMethod: 'card',
        paymentIntentId: paymentIntent.id,
        status: 'pending_payment',
        paymentStatus: 'pending'
      });

      await stripe.paymentIntents.update(paymentIntent.id, { metadata: { orderId: order._id.toString() } });
      await Cart.deleteOne({ user: customerId });

      const timeoutId = setTimeout(async () => {
        try {
          const current = await Order.findById(order._id);
          if (current?.status === 'pending_payment' && current?.paymentStatus === 'pending') {
            await Order.findByIdAndUpdate(order._id, { status: 'cancelled', paymentStatus: 'canceled' });
            await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
            await sendNotification(current, 'order_cancelled');
            if (io) io.to('admin').emit('orderUpdate', { event: 'order_cancelled', order: current });
          }
        } catch (err) {
          console.error('Auto-cancel error:', err);
        } finally {
          delete global.pendingOrderTimeouts[order._id.toString()];
        }
      }, AUTO_CANCEL_DELAY);

      global.pendingOrderTimeouts[order._id.toString()] = timeoutId;

      await sendNotification(order, 'new_order');
      if (io) io.to('admin').emit('orderUpdate', { event: 'new_order', order });

      return res.status(201).json({
        success: true,
        message: 'Payment required',
        order,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    }
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, message: 'Failed to place order' });
  }
};

const getCustomerOrders = async (req, res) => { /* ... same as before ... */ };

const getOrderById = async (req, res) => { /* ... same as before ... */ };

const cancelOrder = async (req, res) => { /* ... same as before ... */ };

const updateOrderStatus = async (req, res) => { /* ... same as before ... */ };

const assignRider = async (req, res) => { /* ... same as before ... */ };

const getAllOrders = async (req, res) => { /* ... same as before ... */ };

// ====================== MISSING FUNCTIONS – NOW ADDED ======================

const customerRejectOrder = async (req, res) => {
  const { reason, note } = req.body;

  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot reject order at this stage' });
    }

    order.status = 'rejected';
    order.rejectedBy = req.user.id;
    order.rejectionReason = reason || 'Customer rejected';
    order.rejectionNote = note;

    await order.save();
    await sendNotification(order, 'order_rejected');
    if (io) io.to('admin').emit('orderUpdate', { event: 'order_rejected', order });

    res.json({ success: true, message: 'Order rejected', order });
  } catch (err) {
    console.error('customerRejectOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const adminRejectOrder = async (req, res) => {
  const { reason, note } = req.body;

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Cannot reject delivered order' });
    }

    order.status = 'rejected';
    order.rejectedBy = req.user.id;
    order.rejectionReason = reason || 'Rejected by admin';
    order.rejectionNote = note;

    await order.save();
    await sendNotification(order, 'order_rejected');
    if (io) io.to('admin').emit('orderUpdate', { event: 'order_rejected', order });

    res.json({ success: true, message: 'Order rejected by admin', order });
  } catch (err) {
    console.error('adminRejectOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====================== EXPORT ALL ======================
module.exports = {
  createOrder,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
  customerRejectOrder,      // ← WAS MISSING
  updateOrderStatus,
  assignRider,
  adminRejectOrder,         // ← WAS MISSING
  getAllOrders
};