// src/controllers/webhook/stripeWebhookController.js
const Order = require('../../models/order/Order');

const handleWebhook = async (req, res) => {
  const event = req.stripeEvent;
  const { type, data: { object } } = event;

  try {
    switch (type) {
      case 'payment_intent.succeeded': {
        const orderId = object.metadata?.orderId;
        if (!orderId) break;

        const order = await Order.findByIdAndUpdate(
          orderId,
          {
            paymentStatus: 'paid',
            status: 'pending', // → Better: stay pending until admin confirms
            paidAt: new Date(),
            paymentIntentId: object.id,
            receiptUrl: object.charges?.data[0]?.receipt_url || null
          },
          { new: true }
        );

        if (order) {
          console.log(`Payment succeeded → Order ${orderId} marked as paid`);
          // Notify admin & customer
          if (global.io) {
            global.io.to('admin').emit('orderUpdate', { event: 'payment_received', order });
            if (order.customer) global.io.to(`user:${order.customer}`).emit('orderUpdate', { event: 'payment_success', order });
          }
        }
        break;
      }

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const orderId = object.metadata?.orderId;
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: type.includes('failed') ? 'failed' : 'canceled',
            status: 'cancelled'
          });
          console.log(`Order ${orderId} → Payment ${type.split('.')[2]}`);
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
          console.log(`Order ${orderId} → Refunded`);
        }
        break;
      }

      default:
        console.log(`Unhandled event: ${type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

module.exports = { handleWebhook };