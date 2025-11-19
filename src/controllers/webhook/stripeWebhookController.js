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

        const updated = await Order.findByIdAndUpdate(orderId, {
          paymentStatus: 'paid',
          status: 'confirmed',
          paidAt: new Date(),
          paymentIntentId: object.id,
          receiptUrl: object.charges?.data[0]?.receipt_url || null
        }, { new: true });

        if (updated) {
          global.emitOrderUpdate?.(orderId);
          console.log(`Order ${orderId} paid & confirmed`);
        }
        break;
      }

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const orderId = object.metadata?.orderId;
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: type.includes('failed') ? 'failed' : 'canceled',
            status: type.includes('canceled') ? 'cancelled' : undefined
          });
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
          global.emitOrderUpdate?.(orderId);
        }
        break;
      }

      default:
        console.log(`Unhandled webhook: ${type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook failed' });
  }
};

module.exports = { handleWebhook };