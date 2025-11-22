// src/controllers/order/orderController.js
const Order = require('../../models/order/Order');
const Address = require('../../models/address/Address');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');
const MenuItem = require('../../models/menuItem/MenuItem');
const Cart = require('../../models/cart/Cart');
const User = require('../../models/user/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { applyAndTrackDeal } = require('../deal/dealController');
const PDFDocument = require('pdfkit');
const otpGenerator = require('otp-generator');

// Global io & timeouts
const io = global.io;
global.pendingOrderTimeouts = global.pendingOrderTimeouts || {};
global.mobilePaymentOtps = global.mobilePaymentOtps || {};
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

  io.to(`user:${order.customer}`).emit('orderUpdate', payload);
  if (order.rider) io.to(`rider:${order.rider}`).emit('orderUpdate', payload);
  io.to('admin').emit('orderUpdate', payload);

  try {
    const customer = await User.findById(order.customer).select('fcmToken name');
    if (customer?.fcmToken) {
      const titleMap = {
        new_order: 'Order Placed!',
        status_updated: 'Order Update',
        rider_assigned: 'Rider Assigned',
        order_cancelled: 'Order Cancelled',
        order_rejected: 'Order Rejected',
        payment_pending: 'Payment Required',
        otp_sent: 'OTP Sent for Payment'
      };
      const bodyMap = {
        pending: 'Your order has been received',
        pending_payment: 'Complete payment to confirm your order',
        pending_otp: 'Enter OTP to complete payment',
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

// ====================== CREATE ORDER (FULLY UPGRADED) ======================
const createOrder = async (req, res) => {
  let { items, addressId, paymentMethod = 'cod', promoCode } = req.body;
  const customerId = req.user.id;

  const paymentMap = { cod: 'cash', easypaisa: 'easypaisa', jazzcash: 'jazzcash', bank: 'bank', card: 'card' };
  const normalizedMethod = paymentMap[paymentMethod] || 'cash';

  if (!['cash', 'card', 'easypaisa', 'jazzcash', 'bank'].includes(normalizedMethod)) {
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
      const quantity = Math.max(1, Number(item.quantity) || 1);
      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        priceAtOrder: menuItem.price,
        quantity
      });
      subtotal += menuItem.price * quantity;
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No available items in cart' });
    }

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

    // === CASH ON DELIVERY ===
    if (normalizedMethod === 'cash') {
      order = await Order.create({ ...baseOrderData, paymentMethod: 'cash', status: 'pending', paymentStatus: 'pending' });
    }

    // === CARD PAYMENT (Stripe) ===
    else if (normalizedMethod === 'card') {
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

      const timeoutId = setTimeout(async () => {
        const current = await Order.findById(order._id);
        if (current?.status === 'pending_payment' && current?.paymentStatus === 'pending') {
          await Order.findByIdAndUpdate(order._id, { status: 'cancelled', paymentStatus: 'canceled' });
          await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
          await sendNotification(current, 'order_cancelled');
          delete global.pendingOrderTimeouts[order._id.toString()];
        }
      }, AUTO_CANCEL_DELAY);

      global.pendingOrderTimeouts[order._id.toString()] = timeoutId;

      await Cart.deleteOne({ user: customerId });
      await order.populate('address area items.menuItem customer');
      await sendNotification(order, 'new_order');

      return res.status(201).json({
        success: true,
        message: 'Payment required',
        order,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    }

    // === BANK TRANSFER ===
    else if (normalizedMethod === 'bank') {
      const tempRef = `FOOD-${Date.now().toString().slice(-6)}`;
      order = await Order.create({
        ...baseOrderData,
        paymentMethod: 'bank',
        status: 'pending_payment',
        paymentStatus: 'pending',
        bankTransferReference: tempRef
      });

      const finalRef = `FOOD-${orderIdShort(order._id)}-${Date.now().toString().slice(-4)}`;
      await Order.findByIdAndUpdate(order._id, { bankTransferReference: finalRef });
      order.bankTransferReference = finalRef;
    }

    // === EASYPaisa / JAZZCASH (OTP Flow) ===
    else if (['easypaisa', 'jazzcash'].includes(normalizedMethod)) {
      const otp = otpGenerator.generate(6, { digits: true, upperCase: false, specialChars: false });
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

      order = await Order.create({
        ...baseOrderData,
        paymentMethod: normalizedMethod,
        status: 'pending_otp',
        paymentStatus: 'pending'
      });

      global.mobilePaymentOtps[order._id.toString()] = { otp, expiresAt, method: normalizedMethod };
    }

    // Common post-creation
    await Cart.deleteOne({ user: customerId });
    await order.populate('address area items.menuItem customer');

    await sendNotification(order, 'new_order');
    if (io) io.to('admin').emit('orderUpdate', { event: 'new_order', order });

    // === RETURN RESPONSES ===
    if (normalizedMethod === 'bank') {
      return res.status(201).json({
        success: true,
        message: 'Transfer money to complete order',
        order,
        bankDetails: {
          ...BANK_DETAILS,
          amount: finalAmount,
          reference: order.bankTransferReference,
          instructions: `Please transfer PKR ${finalAmount} with reference: ${order.bankTransferReference}`
        }
      });
    }

    if (['easypaisa', 'jazzcash'].includes(normalizedMethod)) {
      return res.status(201).json({
        success: true,
        message: 'Enter OTP to complete payment',
        order,
        verifyOtpEndpoint: `/api/orders/${order._id}/verify-mobile-payment`,
        expiresIn: 600
      });
    }

    return res.status(201).json({ success: true, message: 'Order placed successfully!', order });

  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, message: 'Failed to place order' });
  }
};

// ====================== OTHER CONTROLLERS ======================
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
    if (!['pending', 'confirmed', 'pending_payment', 'pending_otp'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel order at this stage' });
    }
    order.status = 'cancelled';
    await order.save();
    await sendNotification(order, 'order_cancelled');
    if (io) io.to('admin').emit('orderUpdate', { event: 'order_cancelled', order });
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
    order.rejectionReason = reason || 'Admin rejected';
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

const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'rejected'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('rider', 'name phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    await sendNotification(order, 'status_updated');
    if (io) io.to('admin').emit('orderUpdate', { event: 'status_updated', order });
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
    await sendNotification(order, 'rider_assigned');
    if (io) {
      io.to(`rider:${riderId}`).emit('newAssignment', { orderId: order._id, order });
      io.to('admin').emit('orderUpdate', { event: 'rider_assigned', order });
    }
    res.json({ success: true, message: 'Rider assigned', order });
  } catch (err) {
    console.error('assignRider error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
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
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Order.countDocuments(query);
    res.json({ success: true, orders, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    console.error('getAllOrders error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====================== VERIFY MOBILE PAYMENT OTP ======================
const verifyMobilePaymentOtp = async (req, res) => {
  const { otp } = req.body;
  const orderId = req.params.id;
  const stored = global.mobilePaymentOtps[orderId];

  if (!stored || Date.now() > stored.expiresAt) {
    return res.status(400).json({ success: false, message: 'OTP expired or invalid' });
  }
  if (stored.otp !== otp.trim()) {
    return res.status(400).json({ success: false, message: 'Incorrect OTP' });
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    { status: 'pending', paymentStatus: 'paid', paidAt: new Date() },
    { new: true }
  ).populate('address area items.menuItem customer');

  delete global.mobilePaymentOtps[orderId];
  await sendNotification(order, 'new_order');
  if (io) io.to('admin').emit('orderUpdate', { event: 'new_order', order });

  res.json({ success: true, message: 'Payment confirmed! Order placed.', order });
};

// ====================== GENERATE PDF RECEIPT ======================
const generateReceipt = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name phone')
    .populate('address', 'label fullAddress')
    .populate('items.menuItem', 'name');

  if (!order || order.customer._id.toString() !== req.user.id) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Receipt-${order._id}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).text('FoodExpress - Order Receipt', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Order ID: ${order._id}`);
  doc.text(`Date: ${new Date(order.placedAt).toLocaleString('en-PK')}`);
  doc.text(`Status: ${order.status.toUpperCase()}`);
  doc.text(`Payment: ${order.paymentMethod.toUpperCase()} - ${order.paymentStatus.toUpperCase()}`);
  doc.moveDown();
  doc.text('Items:', { underline: true });
  order.items.forEach(item => {
    doc.text(`${item.quantity}x ${item.menuItem.name}  } - PKR ${item.priceAtOrder * item.quantity}`);
  });
  doc.moveDown();
  doc.text(`Subtotal: PKR ${order.totalAmount}`);
  doc.text(`Delivery Fee: PKR ${order.deliveryFee}`);
  if (order.discountApplied > 0) doc.text(`Discount: -PKR ${order.discountApplied}`);
  doc.fontSize(14).text(`Total Paid: PKR ${order.finalAmount}`, { bold: true });
  doc.moveDown(2);
  doc.fontSize(10).text('Thank you for your order!', { align: 'center' });
  doc.end();
};

// ====================== EXPORTS ======================
module.exports = {
  createOrder,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
  customerRejectOrder,
  adminRejectOrder,
  updateOrderStatus,
  assignRider,
  getAllOrders,
  verifyMobilePaymentOtp,
  generateReceipt
};