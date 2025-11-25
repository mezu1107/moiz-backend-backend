// src/controllers/webhook/stripeWebhookController.js
const Order = require('../../models/order/Order');
let sendNotification;
try {
  const ctrl = require('../order/orderController');
  sendNotification = ctrl.sendNotification;
} catch (err) {
  console.log("sendNotification not available yet");
}

// IDEMPOTENCY: Track processed events (use Redis in big scale, here simple Map)
const processedEvents = new Map();

const handleWebhook = async (req, res) => {
  const event = req.stripeEvent;
  const eventId = event.id;

  // IDEMPOTENCY CHECK — Stripe can retry
  if (processedEvents.has(eventId)) {
    console.log(`Duplicate event ${eventId}, skipping`);
    return res.json({ received: true });
  }

  // Mark as processing
  processedEvents.set(eventId, true);
  // Auto cleanup old events (optional, prevent memory leak)
  setTimeout(() => processedEvents.delete(eventId), 24 * 60 * 60 * 1000); // 24h

  const { type, data: { object } } = event;

  // Immediate 200 — Stripe happy
  res.json({ received: true });

  try {
    console.log(`Stripe Webhook → ${type}`);

    switch (type) {
      case 'payment_intent.succeeded': {
        const pi = object;
        const orderId = pi.metadata?.orderId;

        if (!orderId || orderId === 'pending') {
          console.log('Ignored: No valid orderId');
          break;
        }

        const order = await Order.findById(orderId);
        if (!order) {
          console.log(`Order ${orderId} not found`);
          break;
        }

        // Already paid? Skip
        if (order.paymentStatus === 'paid') {
          console.log(`Order ${orderId} already paid`);
          break;
        }

        if (order.status !== 'pending_payment') {
          console.log(`Order ${orderId} not pending_payment`);
          break;
        }

        // MARK PAID
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: 'paid',
          status: 'pending',
          paidAt: new Date(),
          paymentIntentId: pi.id,
          receiptUrl: pi.charges?.data[0]?.receipt_url || null
        });

        // Clear auto-cancel timeout
        if (global.pendingOrderTimeouts?.[orderId]) {
          clearTimeout(global.pendingOrderTimeouts[orderId]);
          delete global.pendingOrderTimeouts[orderId];
        }

        const freshOrder = await Order.findById(orderId)
          .populate('customer', 'name phone fcmToken')
          .populate('area', 'name')
          .populate('items.menuItem', 'name image price');

        console.log(`Order ${orderId} → PAID & CONFIRMED!`);

        // Notifications
        if (global.io) {
          global.io.to('admin').emit('orderUpdate', {
            event: 'payment_success',
            order: freshOrder,
            message: 'New card payment received!'
          });
          if (freshOrder.customer?._id) {
            global.io.to(`user:${freshOrder.customer._id}`).emit('orderUpdate', {
              event: 'payment_success',
              order: freshOrder,
              message: 'Payment successful! Your order is confirmed.'
            });
          }
        }

        if (typeof sendNotification === 'function') {
          await sendNotification(freshOrder, 'payment_success').catch(console.error);
        }
        break;
      }

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const orderId = object.metadata?.orderId;
        if (!orderId || orderId === 'pending') break;

        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: type.includes('failed') ? 'failed' : 'canceled',
          status: 'cancelled'
        });

        if (global.pendingOrderTimeouts?.[orderId]) {
          clearTimeout(global.pendingOrderTimeouts[orderId]);
          delete global.pendingOrderTimeouts[orderId];
        }

        const order = await Order.findById(orderId);
        if (order && typeof sendNotification === 'function') {
          await sendNotification(order, 'order_cancelled');
        }
        break;
      }

      case 'charge.refunded': {
        const orderId = object.metadata?.orderId || object.payment_intent?.metadata?.orderId;
        if (!orderId) break;

        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: 'refunded',
          status: 'cancelled',
          refundedAt: new Date()
        });

        const order = await Order.findById(orderId);
        if (order && typeof sendNotification === 'function') {
          await sendNotification(order, 'order_refunded');
        }
        break;
      }

      default:
        console.log(`Unhandled event: ${type}`);
    }
  } catch (err) {
    console.error('Webhook Handler Crash:', err);
    // Do NOT send response again — already sent 200
  }
};

module.exports = { handleWebhook };