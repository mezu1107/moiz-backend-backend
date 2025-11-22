// src/controllers/order/orderController.js
const Order = require('../../models/order/Order');
const Address = require('../../models/address/Address');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');
const MenuItem = require('../../models/menuItem/MenuItem');
const Cart = require('../../models/cart/Cart');
const User = require('../../models/user/User');
const Area = require('../../models/area/Area');
const stripe = require('../../config/stripe');
const { applyAndTrackDeal } = require('../deal/dealController');
const PDFDocument = require('pdfkit');

// Global Socket & Timeouts
const io = global.io;
global.pendingOrderTimeouts = global.pendingOrderTimeouts || {};
const AUTO_CANCEL_DELAY = 15 * 60 * 1000; // 15 minutes

// ====================== CONFIG ======================
const BANK_DETAILS = {
  bankName: "Meezan Bank",
  accountTitle: "FoodExpress Pvt Ltd",
  accountNumber: "0211-0105678901",
  iban: "PK36MEZN0002110105678901",
  branch: "Gulberg Branch, Lahore"
};

// ====================== HELPER ======================
const orderIdShort = (id) => id?.toString().slice(-6).toUpperCase() || 'TEMP';

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

  if (order.customer) io.to(`user:${order.customer}`).emit('orderUpdate', payload);
  if (order.rider) io.to(`rider:${order.rider}`).emit('orderUpdate', payload);
  io.to('admin').emit('orderUpdate', payload);

  // FCM Push Notification (only for registered users)
  try {
    if (order.customer) {
      const customer = await User.findById(order.customer).select('fcmToken name');
      if (customer?.fcmToken) {
        const titleMap = { new_order: 'Order Placed!', status_updated: 'Order Update', rider_assigned: 'Rider Assigned' };
        const bodyMap = { pending: 'Received', confirmed: 'Confirmed!', preparing: 'Being prepared', out_for_delivery: 'On the way!' };

        await require('firebase-admin').messaging().send({
          token: customer.fcmToken,
          notification: {
            title: titleMap[event] || 'Order Update',
            body: bodyMap[order.status] || `Your order is now: ${order.status.replace('_', ' ')}`
          },
          data: { type: 'order_update', orderId: order._id.toString() }
        });
      }
    }
  } catch (err) {
    console.error('FCM Error:', err.message);
  }
};

// ====================== CREATE REGISTERED USER ORDER ======================
const createOrder = async (req, res) => {
  const { items, addressId, paymentMethod = 'cod', promoCode } = req.body;
  const customerId = req.user.id;

  const paymentMap = { cod: 'cash', easypaisa: 'easypaisa', jazzcash: 'jazzcash', bank: 'bank', card: 'card' };
  const method = paymentMap[paymentMethod] || 'cash';

  if (!['cash', 'card', 'easypaisa', 'jazzcash', 'bank'].includes(method)) {
    return res.status(400).json({ success: false, message: 'Invalid payment method' });
  }

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
      const qty = Math.max(1, Number(item.quantity) || 1);
      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        priceAtOrder: menuItem.price,
        quantity: qty
      });
      subtotal += menuItem.price * qty;
    }

    if (orderItems.length === 0) return res.status(400).json({ success: false, message: 'No items available' });
    if (subtotal < deliveryZone.minOrderAmount) {
      return res.status(400).json({ success: false, message: `Minimum order amount is PKR ${deliveryZone.minOrderAmount}` });
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

    const baseData = {
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

    // Cash, Easypaisa, Jazzcash → Instant pending order
    if (['cash', 'easypaisa', 'jazzcash'].includes(method)) {
      order = await Order.create({
        ...baseData,
        paymentMethod: method,
        status: 'pending',
        paymentStatus: method === 'cash' ? 'pending' : 'paid',
        paidAt: method !== 'cash' ? new Date() : null
      });
    }
    // Card via Stripe
    else if (method === 'card') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalAmount * 100),
        currency: 'pkr',
        metadata: { customerId: customerId.toString(), type: 'food_order' },
        automatic_payment_methods: { enabled: true }
      });

      order = await Order.create({
        ...baseData,
        paymentMethod: 'card',
        paymentIntentId: paymentIntent.id,
        status: 'pending_payment',
        paymentStatus: 'pending'
      });

      await stripe.paymentIntents.update(paymentIntent.id, {
        metadata: { orderId: order._id.toString() }
      });

      // Auto-cancel after 15 mins if not paid
      global.pendingOrderTimeouts[order._id.toString()] = setTimeout(async () => {
        const o = await Order.findById(order._id);
        if (o?.status === 'pending_payment') {
          await Order.findByIdAndUpdate(o._id, { status: 'cancelled', paymentStatus: 'canceled' });
          await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
          await sendNotification(o, 'order_cancelled');
        }
      }, AUTO_CANCEL_DELAY);

      await Cart.deleteOne({ user: customerId });
      await order.populate('address area items.menuItem customer');
      await sendNotification(order, 'new_order');

      return res.status(201).json({
        success: true,
        message: 'Complete payment with card',
        order,
        clientSecret: paymentIntent.client_secret
      });
    }
    // Bank Transfer
    else if (method === 'bank') {
      order = await Order.create({
        ...baseData,
        paymentMethod: 'bank',
        status: 'pending_payment',
        paymentStatus: 'pending'
      });
      const ref = `FOOD-${orderIdShort(order._id)}`;
      await Order.findById

      order.bankTransferReference = ref;
    }

    // Common cleanup & notifications
    await Cart.deleteOne({ user: customerId });
    await order.populate('address area items.menuItem customer');
    await sendNotification(order, 'new_order');
    if (io) io.to('admin').emit('orderUpdate', { event: 'new_order', order });

    if (method === 'bank') {
      return res.json({
        success: true,
        message: 'Please transfer money to confirm order',
        order,
        bankDetails: { ...BANK_DETAILS, amount: finalAmount, reference: order.bankTransferReference }
      });
    }

    return res.json({
      success: true,
      message: 'Order placed successfully!',
      order
    });

  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====================== CREATE GUEST ORDER ======================
const createGuestOrder = async (req, res) => {
  const { name, phone, items, address, paymentMethod = 'cash', promoCode } = req.body;

  if (!name || !phone || !items?.length || !address?.fullAddress || !address?.area) {
    return res.status(400).json({ success: false, message: 'All guest fields required' });
  }

  const method = paymentMethod === 'cod' ? 'cash' : paymentMethod;
  if (!['cash', 'easypaisa', 'jazzcash', 'bank'].includes(method)) {
    return res.status(400).json({ success: false, message: 'Invalid payment method' });
  }

  try {
    const area = await Area.findOne({ name: { $regex: new RegExp(address.area, 'i') } });
    if (!area) return res.status(400).json({ success: false, message: 'Area not supported' });

    const deliveryZone = await DeliveryZone.findOne({ area: area._id, isActive: true });
    if (!deliveryZone) return res.status(400).json({ success: false, message: 'Delivery not available' });

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem?.isAvailable) continue;
      const qty = Math.max(1, item.quantity || 1);
      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        priceAtOrder: menuItem.price,
        quantity: qty
      });
      subtotal += menuItem.price * qty;
    }

    if (orderItems.length === 0) return res.status(400).json({ success: false, message: 'No items available' });
    if (subtotal < deliveryZone.minOrderAmount) {
      return res.status(400).json({ success: false, message: `Minimum order: PKR ${deliveryZone.minOrderAmount}` });
    }

    let discount = 0;
    let appliedDeal = null;
    if (promoCode) {
      const result = await applyAndTrackDeal(promoCode.trim().toUpperCase(), subtotal, null);
      if (result?.discount > 0) {
        discount = result.discount;
        appliedDeal = { dealId: result.dealId, code: result.code };
      }
    }

    const finalAmount = Math.max(0, subtotal + deliveryZone.deliveryFee - discount);

    const baseData = {
      guestInfo: { name: name.trim(), phone, isGuest: true },
      items: orderItems,
      totalAmount: subtotal,
      deliveryFee: deliveryZone.deliveryFee,
      discountApplied: discount,
      finalAmount,
      area: area._id,
      deliveryZone: deliveryZone._id,
      estimatedDelivery: deliveryZone.estimatedTime || '40-55 min',
      appliedDeal,
      addressDetails: {
        fullAddress: address.fullAddress,
        label: address.label || "Home",
        floor: address.floor || "",
        instructions: address.instructions || ""
      }
    };

    let order;

    if (['cash', 'easypaisa', 'jazzcash'].includes(method)) {
      order = await Order.create({
        ...baseData,
        paymentMethod: method,
        status: 'pending',
        paymentStatus: method === 'cash' ? 'pending' : 'paid',
        paidAt: method !== 'cash' ? new Date() : null
      });
    } else if (method === 'bank') {
      order = await Order.create({
        ...baseData,
        paymentMethod: 'bank',
        status: 'pending_payment',
        paymentStatus: 'pending'
      });
      const ref = `GUEST-${orderIdShort(order._id)}`;
      await Order.findByIdAndUpdate(order._id, { bankTransferReference: ref });
      order.bankTransferReference = ref;

      // Auto-cancel bank transfer after 15 mins
      global.pendingOrderTimeouts[order._id.toString()] = setTimeout(async () => {
        const o = await Order.findById(order._id);
        if (o?.status === 'pending_payment') {
          await Order.findByIdAndUpdate(o._id, { status: 'cancelled', paymentStatus: 'canceled' });
          if (io) io.to('admin').emit('orderUpdate', { event: 'order_cancelled', order: o });
        }
      }, AUTO_CANCEL_DELAY);
    }

    await order.populate('area items.menuItem');
    if (io) io.to('admin').emit('orderUpdate', { event: 'new_order', order, guest: true });

    if (method === 'bank') {
      return res.json({
        success: true,
        message: 'Please transfer money to confirm',
        order,
        bankDetails: { ...BANK_DETAILS, amount: finalAmount, reference: order.bankTransferReference }
      });
    }

    return res.json({
      success: true,
      message: 'Order placed successfully!',
      order
    });

  } catch (err) {
    console.error('createGuestOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====================== CUSTOMER ORDERS ======================
const getCustomerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('items.menuItem', 'name image price')
      .populate('address', 'label fullAddress')
      .populate('area', 'name')
      .populate('rider', 'name phone')
      .sort({ placedAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user.id })
      .populate('items.menuItem address area deliveryZone rider');
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error' });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });

    if (!['pending', 'confirmed', 'pending_payment'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel order at this stage' });
    }

    order.status = 'cancelled';
    await order.save();
    await sendNotification(order, 'order_cancelled');
    res.json({ success: true, message: 'Order cancelled', order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error' });
  }
};

// ====================== ADMIN CONTROLS ======================
const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  if (!['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    await sendNotification(order, 'status_updated');
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error' });
  }
};

const assignRider = async (req, res) => {
  const { riderId } = req.body;
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { rider: riderId, status: 'confirmed' }, { new: true });
    await sendNotification(order, 'rider_assigned');
    if (io) io.to(`rider:${riderId}`).emit('newAssignment', { order });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error' });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .populate('rider', 'name phone')
      .populate('area', 'name')
      .sort({ placedAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit);
    const total = await Order.countDocuments(query);
    res.json({ success: true, orders, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error' });
  }
};

const generateReceipt = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name phone')
    .populate('address', 'fullAddress')
    .populate('items.menuItem', 'name');

  if (!order || (order.customer && order.customer._id.toString() !== req.user.id)) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Receipt-${order._id}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).text('FoodExpress Receipt', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Order ID: ${order._id}`);
  doc.text(`Date: ${new Date(order.placedAt).toLocaleString()}`);
  doc.text(`Name: ${order.guestInfo?.name || order.customer?.name || 'Guest'}`);
  doc.text(`Phone: ${order.guestInfo?.phone || order.customer?.phone || ''}`);
  doc.moveDown();
  doc.text('Items:', { underline: true });
  order.items.forEach(i => doc.text(`${i.quantity}x ${i.menuItem.name} - PKR ${i.priceAtOrder * i.quantity}`));
  doc.moveDown();
  doc.text(`Subtotal: PKR ${order.totalAmount}`);
  doc.text(`Delivery: PKR ${order.deliveryFee}`);
  if (order.discountApplied) doc.text(`Discount: -PKR ${order.discountApplied}`);
  doc.fontSize(14).text(`Total: PKR ${order.finalAmount}`, { bold: true });
  doc.moveDown(2);
  doc.fontSize(10).text('Thank you!', { align: 'center' });
  doc.end();
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
    order.rejectionNote = note || '';
    await order.save();

    await sendNotification(order, 'order_rejected');
    if (io) io.to('admin').emit('orderUpdate', { event: 'order_rejected', order });

    res.json({ success: true, message: 'Order rejected', order });
  } catch (err) {
    console.error('adminRejectOrder error:', err);
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
    order.rejectionNote = note || '';
    await order.save();

    await sendNotification(order, 'order_rejected');
    if (io) io.to('admin').emit('orderUpdate', { event: 'order_rejected', order });

    res.json({ success: true, message: 'Order rejected', order });
  } catch (err) {
    console.error('customerRejectOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====================== PUBLIC TRACKING ======================
const trackOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .select('_id status placedAt finalAmount estimatedDelivery paymentMethod paymentStatus guestInfo addressDetails items totalAmount deliveryFee discountApplied rider bankTransferReference')
      .populate('items.menuItem', 'name image')
      .populate('rider', 'name phone');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const isGuestOrder = order.guestInfo?.isGuest === true;
    const isOwner = req.user && order.customer && order.customer.toString() === req.user.id;

    if (!isGuestOrder && !isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const shortId = order._id.toString().slice(-6).toUpperCase();

    res.json({
      success: true,
      order: {
        ...order.toObject(),
        shortId,
        trackUrl: `${process.env.APP_URL || 'https://yourapp.com'}/track/${order._id}`
      }
    });
  } catch (err) {
    console.error('trackOrderById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const trackOrdersByPhone = async (req, res) => {
  const { phone } = req.body;
  try {
    const orders = await Order.find({
      'guestInfo.phone': phone.trim(),
      'guestInfo.isGuest': true
    })
      .select('_id status placedAt finalAmount estimatedDelivery paymentMethod paymentStatus')
      .sort({ placedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      orders: orders.map(o => ({
        ...o.toObject(),
        shortId: o._id.toString().slice(-6).toUpperCase(),
        trackUrl: `${process.env.APP_URL || 'https://yourapp.com'}/track/${o._id}`
      }))
    });
  } catch (err) {
    console.error('trackOrdersByPhone error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====================== EXPORTS ======================
module.exports = {
  createOrder,
  createGuestOrder,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  assignRider,
  getAllOrders,
  generateReceipt,
  adminRejectOrder,
  customerRejectOrder,
  trackOrderById,
  trackOrdersByPhone
};