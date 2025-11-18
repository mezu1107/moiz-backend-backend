// src/controllers/webhook/stripeWebhookController.js
const Order = require('../../models/order/Order');

const handleWebhook = async (req, res) => {
  const eventIOD = req.stripeEvent; // Already verified + parsed by middleware
  const { type, data: { object } } = event;

  try {
    switch (type) {
      // Payment Succeeded → Mark order as paid
      case 'payment_intent.succeeded': {
        const pi = object;
        const orderId = pi.metadata?.orderId;

        if (!orderId) {
          console.warn(`Webhook: payment_intent.succeeded → No orderId in metadata`, { paymentIntentId: pi.id });
          return res.json({ received: true });
        }

        console.log(`Payment succeeded → ${pi.amount / 100} ${pi.currency.toUpperCase()} | Order: ${orderId}`);

        const updatedOrder = await Order.findByIdAndUpdate(
          orderId,
          {
            $set: {
              paymentStatus: 'paid',
              status: 'confirmed',
              paidAt: new Date(),
              paymentIntentId: pi.id,
              receiptUrl: pi.charges?.data[0]?.receipt_url || null
            }
          },
          { new: true, runValidators: true }
        );

        if (!updatedOrder) {
          console.error(`Order not found for payment success: ${orderId}`, { paymentIntentId: pi.id });
        } else {
          global.emitOrderUpdate?.(orderId.toString());
        }
        break;
      }

      // Payment Failed or Canceled
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const orderId = object.metadata?.orderId;
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: type.includes('failed') ? 'failed' : 'canceled'
          });
          console.log(`Payment ${type.split('.')[1]} → Order: ${orderId}`);
        }
        break;
      }

      // Full Refund
      case 'charge.refunded': {
        const charge = object;
        const orderId = charge.metadata?.orderId || charge.payment_intent_metadata?.orderId;

        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'refunded',
            status: 'refunded',
            refundedAt: new Date()
          });
          console.log(`Order refunded → ${orderId}`);
          global.emitOrderUpdate?.(orderId.toString());
        }
        break;
      }

      // Optional: Handle partial refunds later if needed
      // case 'charge.refund.updated': ...

      default:
        console.log(`Unhandled webhook event: ${type}`);
    }

    // Always respond quickly
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler crashed:', {
      eventType: type,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};

module.exports = { handleWebhook };