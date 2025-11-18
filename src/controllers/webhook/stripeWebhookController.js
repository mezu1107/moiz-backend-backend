// src/controllers/webhook/stripeWebhookController.js

const handleWebhook = async (req, res) => {
  const event = req.stripeEvent; // Already verified in middleware!

  // No need to constructEvent again
  const data = event.data.object;

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = data;
        const order = await Order.findOneAndUpdate(
          { paymentIntentId: paymentIntent.id },
          { 
            paymentStatus: 'paid', 
            status: 'confirmed',
            paidAt: new Date()
          },
          { new: true }
        );

        if (order) {
          await Payment.create({
            order: order._id,
            stripePaymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
            status: 'succeeded',
            metadata: paymentIntent.metadata,
            receiptUrl: paymentIntent.charges?.data[0]?.receipt_url || null,
            periodStart: new Date(), // fix these if needed
            periodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          });

          global.emitOrderUpdate?.(order._id.toString());
        }
        break;
      }

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
        await Order.findOneAndUpdate(
          { paymentIntentId: data.id },
          { paymentStatus: event.type.includes('failed') ? 'failed' : 'canceled' }
        );
        break;

      case 'charge.refunded':
        const charge = data;
        await Order.findOneAndUpdate(
          { paymentIntentId: charge.payment_intent },
          { paymentStatus: 'refunded', status: 'refunded' }
        );
        break;
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
};

module.exports = { handleWebhook };