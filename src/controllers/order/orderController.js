// src/controllers/order/orderController.js
const Order = require('../../models/order/Order');
const Address = require('../../models/address/Address');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');
const MenuItem = require('../../models/menuItem/MenuItem');

const emitOrderUpdate = global.emitOrderUpdate || (() => {});
const io = global.io;

const createOrder = async (req, res) => {
  const { items, addressId, paymentMethod = 'cash' } = req.body;
  const customerId = req.user.id;

  try {
    // Validate address
    const address = await Address.findOne({ _id: addressId, user: customerId }).populate('area');
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    // Validate delivery zone
    const deliveryZone = await DeliveryZone.findOne({ area: address.area._id, isActive: true });
    if (!deliveryZone) return res.status(400).json({ success: false, message: 'Delivery not available in this area' });

    // Validate and build items
    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem || !menuItem.isAvailable) continue;

      const qty = Math.max(1, Number(item.quantity) || 1);
      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        priceAtOrder: menuItem.price,
        quantity: qty
      });
      total += menuItem.price * qty;
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid items in order' });
    }

    if (total < deliveryZone.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is PKR ${deliveryZone.minOrderAmount}`
      });
    }

    const finalAmount = total + deliveryZone.deliveryFee;

    const order = await Order.create({
      customer: customerId,
      items: orderItems,
      totalAmount: total,
      deliveryFee: deliveryZone.deliveryFee,
      finalAmount,
      address: addressId,
      area: address.area._id,
      deliveryZone: deliveryZone._id,
      paymentMethod,
      estimatedDelivery: deliveryZone.estimatedTime,
      status: paymentMethod === 'card' ? 'pending_payment' : 'pending'
    });

    await order.populate([
      { path: 'address', select: 'label fullAddress location' },
      { path: 'area', select: 'name city' },
      { path: 'items.menuItem', select: 'name image price' },
      { path: 'customer', select: 'name phone' }
    ]);

    await emitOrderUpdate(order._id);

    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const getCustomerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('items.menuItem', 'name image')
      .populate('address', 'label fullAddress')
      .populate('area', 'name')
      .populate('rider', 'name phone')
      .sort({ placedAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error('getCustomerOrders error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user.id })
      .populate('items.menuItem')
      .populate('address')
      .populate('area')
      .populate('deliveryZone')
      .populate('rider', 'name phone currentLocation');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    res.json({ success: true, order });
  } catch (err) {
    console.error('getOrderById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!['pending', 'confirmed', 'pending_payment'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel order at this stage' });
    }

    order.status = 'cancelled';
    await order.save();
    await emitOrderUpdate(order._id);

    res.json({ success: true, message: 'Order cancelled successfully', order });
  } catch (err) {
    console.error('cancelOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

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
    await emitOrderUpdate(order._id);

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
    order.rejectionReason = reason || 'Admin rejected';
    order.rejectionNote = note;

    await order.save();
    await emitOrderUpdate(order._id);

    res.json({ success: true, message: 'Order rejected by admin', order });
  } catch (err) {
    console.error('adminRejectOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'rejected'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await emitOrderUpdate(order._id);
    res.json({ success: true, order });
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const assignRider = async (req, res) => {
  const { riderId } = req.body;

  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { rider: riderId, status: 'confirmed' },
      { new: true }
    ).populate('rider', 'name phone');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await emitOrderUpdate(order._id);

    if (io) {
      io.to(`rider:${riderId}`).emit('newAssignment', { orderId: order._id, order });
    }

    res.json({ success: true, message: 'Rider assigned', order });
  } catch (err) {
    console.error('assignRider error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createOrder,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
  customerRejectOrder,
  adminRejectOrder,
  updateOrderStatus,
  assignRider
};