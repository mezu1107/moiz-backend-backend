// src/controllers/order/orderController.js
// FINAL PRODUCTION VERSION — DECEMBER 2025 — UNIFIED GUEST + AUTH FLOW
const User = require('../../models/user/User');
const Order = require('../../models/order/Order');
const Address = require('../../models/address/Address');
const DeliveryZone = require('../../models/deliveryZone/DeliveryZone');
const MenuItem = require('../../models/menuItem/MenuItem');
const Cart = require('../../models/cart/Cart');
const Area = require('../../models/area/Area');
const stripe = require('../../config/stripe');
const { applyAndTrackDeal } = require('../deal/dealController');
const PDFDocument = require('pdfkit');
const admin = require('firebase-admin');
const mongoose = require('mongoose');
const io = global.io;

global.pendingOrderTimeouts = global.pendingOrderTimeouts || {};
const AUTO_CANCEL_DELAY = 15 * 60 * 1000; // 15 minutes

const BANK_DETAILS = {
  bankName: "Meezan Bank",
  accountTitle: "FoodExpress Pvt Ltd",
  accountNumber: "0211-0105678901",
  iban: "PK36MEZN0002110105678901",
  branch: "Gulberg Branch, Lahore"
};

const orderIdShort = (id) => id?.toString().slice(-6).toUpperCase() || 'TEMP';

// ====================== NOTIFICATION SYSTEM ======================
const sendNotification = async (order, event, extra = {}) => {
  if (!io || !order) return;

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

  // FCM only for registered users
  if (order.customer && event !== 'order_cancelled') {
    try {
      const user = await User.findById(order.customer).select('fcmToken name');
      if (user?.fcmToken) {
        await admin.messaging().send({
          token: user.fcmToken,
          notification: {
            title: event === 'new_order' ? 'Order Placed!' : 'Order Update',
            body: `Your order #${orderIdShort(order._id)} is now: ${order.status.replace(/_/g, ' ')}`
          },
          data: { type: 'order_update', orderId: order._id.toString() }
        });
      }
    } catch (err) {
      console.error('FCM Error:', err.message);
    }
  }
};

const createOrder = async (req, res) => {
  try {
    const {
      items,
      addressId,           // For logged-in users
      guestAddress,        // For guests: { fullAddress, label, floor, instructions, areaId }
      name,                // Guest only
      phone,               // Guest only
      paymentMethod = 'cod',
      promoCode
    } = req.body;

    const isGuest = !req.user;
    const customerId = req.user?.id || null;

    // === Basic validation ===
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const methodMap = { cod: 'cash', card: 'card', easypaisa: 'easypaisa', jazzcash: 'jazzcash', bank: 'bank' };
    const payment = methodMap[paymentMethod];
    if (!payment) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    let area, areaId, deliveryAddress;

    // === ADDRESS HANDLING ===
    if (isGuest) {
      if (!guestAddress?.fullAddress?.trim() || !guestAddress.areaId || !name?.trim() || !phone?.trim()) {
        return res.status(400).json({ success: false, message: 'Guest address, name, and phone required' });
      }
      if (!mongoose.Types.ObjectId.isValid(guestAddress.areaId)) {
        return res.status(400).json({ success: false, message: 'Invalid area ID' });
      }

      area = await Area.findById(guestAddress.areaId);
      if (!area) return res.status(400).json({ success: false, message: 'Area not found' });

      areaId = area._id;
      deliveryAddress = {
        fullAddress: guestAddress.fullAddress.trim(),
        label: guestAddress.label || 'Home',
        floor: guestAddress.floor || '',
        instructions: guestAddress.instructions || ''
      };
    } else {
      if (!addressId) {
        return res.status(400).json({ success: false, message: 'Please select a delivery address' });
      }
      const savedAddr = await Address.findOne({ _id: addressId, user: customerId }).populate('area');
      if (!savedAddr) return res.status(404).json({ success: false, message: 'Address not found' });

      area = savedAddr.area;
      areaId = area._id;
      deliveryAddress = {
        fullAddress: savedAddr.fullAddress,
        label: savedAddr.label,
        floor: savedAddr.floor || '',
        instructions: savedAddr.instructions || ''
      };
    }

    // === Delivery zone check ===
    const deliveryZone = await DeliveryZone.findOne({ area: areaId, isActive: true });
    if (!deliveryZone) {
      return res.status(400).json({ success: false, message: 'Delivery not available in your area' });
    }

    // === Process items ===
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem || !menuItem.isAvailable) continue;

      const qty = Math.max(1, Number(item.quantity) || 1);
      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        image: menuItem.image,
        priceAtOrder: menuItem.price,
        quantity: qty
      });
      subtotal += menuItem.price * qty;
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No items available' });
    }

    if (subtotal < deliveryZone.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is PKR ${deliveryZone.minOrderAmount}`
      });
    }

    // === Promo code ===
    let discount = 0;
    let appliedDeal = null;
    if (promoCode) {
      const result = await applyAndTrackDeal(promoCode.trim().toUpperCase(), subtotal, customerId);
      if (result?.discount > 0) {
        discount = result.discount;
        appliedDeal = {
          dealId: result.dealId,
          code: result.code,
          title: result.title,
          discountType: result.discountType,
          discountValue: result.discountValue,
          maxDiscountAmount: result.maxDiscountAmount,
          appliedDiscount: discount
        };
      }
    }

    const finalAmount = Math.max(0, subtotal + deliveryZone.deliveryFee - discount);

    // === Base order data ===
    const baseData = {
      items: orderItems,
      totalAmount: subtotal,
      deliveryFee: deliveryZone.deliveryFee,
      discountApplied: discount,
      finalAmount,
      area: areaId,
      deliveryZone: deliveryZone._id,
      estimatedDelivery: deliveryZone.estimatedTime || '40-55 min',
      appliedDeal,
      paymentMethod: payment,
      addressDetails: deliveryAddress
    };

    if (isGuest) {
      baseData.guestInfo = { name: name.trim(), phone: phone.trim(), isGuest: true };
    } else {
      baseData.customer = customerId;
      baseData.address = addressId;
    }

    let order;
    let clientSecret = null;

    // === Payment handling ===
    if (['cash', 'easypaisa', 'jazzcash'].includes(payment)) {
      order = await Order.create({
        ...baseData,
        status: 'pending',
        paymentStatus: payment === 'cash' ? 'pending' : 'paid',
        paidAt: payment !== 'cash' ? new Date() : null
      });
    }

    else if (payment === 'card') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalAmount * 100),
        currency: 'pkr',
        metadata: {
          orderId: 'pending',
          customerId: customerId || 'guest',
          guestPhone: isGuest ? phone?.trim() : undefined
        },
        automatic_payment_methods: { enabled: true }
      });

      order = await Order.create({
        ...baseData,
        paymentIntentId: paymentIntent.id,
        status: 'pending_payment',
        paymentStatus: 'pending'
      });

      await stripe.paymentIntents.update(paymentIntent.id, {
        metadata: { orderId: order._id.toString() }
      });

      clientSecret = paymentIntent.client_secret;

      global.pendingOrderTimeouts[order._id.toString()] = setTimeout(async () => {
        const o = await Order.findById(order._id);
        if (o?.status === 'pending_payment') {
          await Order.findByIdAndUpdate(o._id, { status: 'cancelled', paymentStatus: 'cancelled' });
          await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
          await sendNotification(o, 'order_cancelled');
          delete global.pendingOrderTimeouts[o._id.toString()];
        }
      }, AUTO_CANCEL_DELAY);
    }

    else if (payment === 'bank') {
      order = await Order.create({
        ...baseData,
        status: 'pending_payment',
        paymentStatus: 'pending'
      });
      order.bankTransferReference = `${isGuest ? 'GUEST' : 'USER'}-${orderIdShort(order._id)}`;
      await order.save();

      global.pendingOrderTimeouts[order._id.toString()] = setTimeout(async () => {
        const o = await Order.findById(order._id);
        if (o?.status === 'pending_payment') {
          await o.updateOne({ status: 'cancelled', paymentStatus: 'cancelled' });
          await sendNotification(o, 'order_cancelled');
          delete global.pendingOrderTimeouts[o._id.toString()];
        }
      }, AUTO_CANCEL_DELAY);
    }

    // === Finalize ===
    if (!isGuest) await Cart.deleteOne({ user: customerId });
    await order.populate('area items.menuItem customer rider');
    await sendNotification(order, 'new_order');

    // === Response ===
    if (payment === 'card') {
      return res.status(201).json({
        success: true,
        message: 'Complete payment to confirm order',
        order,
        clientSecret
      });
    }

    if (payment === 'bank') {
      return res.json({
        success: true,
        message: 'Transfer money to confirm your order',
        order,
        bankDetails: { ...BANK_DETAILS, amount: finalAmount, reference: order.bankTransferReference }
      });
    }

    res.json({ success: true, message: 'Order placed successfully!', order });

  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// ====================== CUSTOMER ROUTES ======================
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
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user.id })
      .populate('items.menuItem address area deliveryZone rider');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
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
    if (order.paymentIntentId && order.status === 'pending_payment') {
      await stripe.paymentIntents.cancel(order.paymentIntentId).catch(() => {});
    }
    if (global.pendingOrderTimeouts[order._id.toString()]) {
      clearTimeout(global.pendingOrderTimeouts[order._id.toString()]);
      delete global.pendingOrderTimeouts[order._id.toString()];
    }

    await order.save();
    await sendNotification(order, 'order_cancelled');

    res.json({ success: true, message: 'Order cancelled successfully', order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
};

// ====================== ADMIN & RIDER CONTROLS ======================
const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  if (!['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (status === 'delivered') order.deliveredAt = new Date();
    if (status === 'confirmed') order.confirmedAt = new Date();
    if (status === 'preparing') order.preparingAt = new Date();
    if (status === 'out_for_delivery') order.outForDeliveryAt = new Date();

    await order.save();
    await sendNotification(order, 'status_updated');
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

const assignRider = async (req, res) => {
  const { riderId } = req.body;
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { rider: riderId, status: 'confirmed', confirmedAt: new Date() },
      { new: true }
    ).populate('rider');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await sendNotification(order, 'rider_assigned');
    if (io) io.to(`rider:${riderId}`).emit('newAssignment', { order });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign rider' });
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const generateReceipt = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone')
      .populate('address', 'fullAddress')
      .populate('items.menuItem', 'name');

    if (!order || (order.customer && order.customer._id.toString() !== req.user.id && req.user.role !== 'admin')) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Receipt-${order._id}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text('FoodExpress Pakistan', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${order._id}`);
    doc.text(`Short ID: #${orderIdShort(order._id)}`);
    doc.text(`Date: ${new Date(order.placedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`);
    doc.text(`Customer: ${order.guestInfo?.name || order.customer?.name || 'Guest'}`);
    doc.text(`Phone: ${order.guestInfo?.phone || order.customer?.phone || 'N/A'}`);
    doc.moveDown();
    doc.text('Items:', { underline: true });
    order.items.forEach(i => {
      doc.text(`${i.quantity}x ${i.menuItem?.name || 'Item'} - PKR ${i.priceAtOrder * i.quantity}`);
    });
    doc.moveDown();
    doc.text(`Subtotal: PKR ${order.totalAmount}`);
    doc.text(`Delivery Fee: PKR ${order.deliveryFee}`);
    if (order.discountApplied > 0) doc.text(`Discount: -PKR ${order.discountApplied}`);
    doc.fontSize(16).text(`Total Paid: PKR ${order.finalAmount}`, { bold: true });
    doc.moveDown(2);
    doc.fontSize(10).text('Thank you for your order!', { align: 'center' });
    doc.end();
  } catch (err) {
    console.error('Receipt error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate receipt' });
  }
};

// ====================== REJECTION HANDLERS ======================
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
    order.rejectionReason = reason || 'Not feasible';
    order.rejectionNote = note || '';
    await order.save();

    await sendNotification(order, 'order_rejected');
    res.json({ success: true, message: 'Order rejected', order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const customerRejectOrder = async (req, res) => {
  const { reason, note } = req.body;
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot reject at this stage' });
    }

    order.status = 'rejected';
    order.rejectedBy = req.user.id;
    order.rejectionReason = reason || 'Changed mind';
    order.rejectionNote = note || '';
    await order.save();

    await sendNotification(order, 'order_rejected');
    res.json({ success: true, message: 'Order rejected', order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====================== PUBLIC TRACKING (SECURE) ======================
const trackOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .select('_id status placedAt finalAmount estimatedDelivery paymentMethod paymentStatus guestInfo addressDetails items totalAmount deliveryFee discountApplied rider bankTransferReference')
      .populate('items.menuItem', 'name image')
      .populate('rider', 'name phone');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const isGuest = order.guestInfo?.isGuest === true;
    const isOwner = req.user && order.customer && order.customer.toString() === req.user.id;
    const isAdmin = req.user?.role === 'admin';

    if (!isGuest && !isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({
      success: true,
      order: {
        ...order.toObject(),
        shortId: orderIdShort(order._id),
        trackUrl: `${process.env.APP_URL || 'https://foodapp.pk'}/track/${order._id}`
      }
    });
  } catch (err) {
    console.error('trackOrderById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const trackOrdersByPhone = async (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length < 10) {
    return res.status(400).json({ success: false, message: 'Valid phone required' });
  }

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
        shortId: orderIdShort(o._id),
        trackUrl: `${process.env.APP_URL || 'https://foodapp.pk'}/track/${o._id}`
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const paymentSuccess = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    if (!orderId) return res.status(400).json({ success: false, message: "Order ID missing" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Determine paymentIntentId from body (webhook) or query (client redirect)
    const paymentIntentId = req.body?.paymentIntentId || req.query?.payment_intent || null;

    // Already paid
    if (order.paymentStatus === "paid") {
      return res.json({ success: true, message: "Payment already confirmed", order });
    }

    // No paymentIntentId (GET redirect) — frontend can show "awaiting confirmation"
    if (!paymentIntentId) {
      return res.json({ success: true, message: "Awaiting Stripe confirmation", order });
    }

    // Confirm payment
    if (!order.paymentIntentId) order.paymentIntentId = paymentIntentId;
    order.paymentStatus = "paid";
    order.paidAt = new Date();
    if (order.status === "pending_payment") order.status = "pending";
    await order.save();

    global.io?.emit("orderStatusChanged", { orderId: order._id.toString(), status: order.status });
    await sendNotification(order, "payment_success");

    return res.json({ success: true, message: "Payment confirmed successfully", order });

  } catch (err) {
    console.error("Payment success error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createOrder,                  
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
  trackOrdersByPhone,
  paymentSuccess                  
};
