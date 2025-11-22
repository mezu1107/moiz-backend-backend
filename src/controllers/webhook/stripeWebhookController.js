// src/controllers/webhook/stripeWebhookController.js
const Order = require('../../models/order/Order');

const handleWebhook = async (req, res) => {
  const event = req.stripeEvent;
  const { type, data: { object } } = event;

  try {
    switch (type) {

      case 'payment_intent.succeeded': {
        const orderId = object.metadata?.orderId;
        if (!orderId) return res.json({ received: true });

        const order = await Order.findByIdAndUpdate(
          orderId,
          {
            paymentStatus: 'paid',
            status: 'confirmed',
            paidAt: new Date(),
            paymentIntentId: object.id,
            receiptUrl: object.charges?.data[0]?.receipt_url || null
          },
          { new: true }
        );

        if (order) {
          console.log(`ORDER ${orderId} → PAID & AUTO-CONFIRMED`);
          global.emitOrderUpdate?.(orderId);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const orderId = object.metadata?.orderId;
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'failed',
            status: 'cancelled'
          });
          console.log(`ORDER ${orderId} → PAYMENT FAILED`);
          global.emitOrderUpdate?.(orderId);
        }
        break;
      }

      case 'payment_intent.canceled': {
        const orderId = object.metadata?.orderId;
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'canceled',
            status: 'cancelled'
          });
          console.log(`ORDER ${orderId} → CANCELED (15 min timeout)`);
          global.emitOrderUpdate?.(orderId);
        }
        break;
      }

      case 'charge.refunded': {
        const orderId = object.metadata?.orderId || object.payment_intent?.metadata?.orderId;
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'refunded',
            status: 'cancelled',
            refundedAt: new Date()
          });
          console.log(`ORDER ${orderId} → REFUNDED`);
          global.emitOrderUpdate?.(orderId);
        }
        break;
      }

      default:
        console.log(`Ignored Stripe event: ${type}`);
    }

    // ALWAYS respond 200 OK — Stripe requires this
    res.json({ received: true });

  } catch (err) {
    console.error('STRIPE WEBHOOK CRASHED:', err.message);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

module.exports = { handleWebhook };