// src/features/orders/pages/CardPaymentPage.tsx
// PRODUCTION-READY — FULLY RESPONSIVE, DEC 28, 2025

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '@/features/cart/hooks/useCartStore';
import { api } from '@/lib/api';
import type { CreateOrderResponse } from '@/types/order.types';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface CardFormProps {
  clientSecret: string;
  orderId: string;
  amount: number;
  shortId: string;
}

function CardForm({ clientSecret, orderId, amount, shortId }: CardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { clearCart } = useCartStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle redirect flow for 3DS
  useEffect(() => {
    if (!stripe || !clientSecret) return;

    const handleRedirectReturn = async () => {
      setIsProcessing(true);
      const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);

      if (error) {
        setErrorMessage(error.message ?? 'Unable to verify payment status.');
        toast.error('Payment verification failed');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        await confirmPaymentOnBackend(paymentIntent.id);
      } else if (paymentIntent?.status === 'processing') {
        toast.info('Payment is processing. We’ll update your order soon.');
        setIsProcessing(false);
      }
    };

    handleRedirectReturn();
  }, [stripe, clientSecret]);

  const confirmPaymentOnBackend = async (paymentIntentId: string) => {
    try {
      await api.post(`/orders/success/${orderId}`, { paymentIntentId });
      clearCart();
      setIsSuccess(true);
      toast.success('Payment successful! 🎉');
      setTimeout(() => navigate(`/track/${orderId}`, { replace: true }), 2000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to confirm payment';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMessage(submitError.message ?? 'Invalid card details');
      setIsProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/card/${orderId}`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message ?? 'Payment failed');
      toast.error(error.message ?? 'Payment failed');
      setIsProcessing(false);
      return;
    }

    if (paymentIntent) {
      if (paymentIntent.status === 'succeeded') {
        await confirmPaymentOnBackend(paymentIntent.id);
      } else if (paymentIntent.status === 'processing') {
        toast.success('Payment received! Processing...');
        setTimeout(() => navigate(`/track/${orderId}`), 1500);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }}
        className="w-full"
      />

      {errorMessage && (
        <Alert variant="destructive" className="text-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {isSuccess && (
        <Alert className="border-green-200 bg-green-50 text-sm">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Payment successful! Redirecting to your order...
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full py-4 text-base sm:text-lg md:text-xl"
        disabled={!stripe || isProcessing || isSuccess}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle className="mr-2 h-5 w-5" />
            Paid
          </>
        ) : (
          <>
            <Lock className="mr-2 h-5 w-5" />
            Pay Rs. {amount.toLocaleString()}
          </>
        )}
      </Button>

      <p className="text-center text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        Secured by Stripe • End-to-end encrypted
      </p>
    </form>
  );
}

export default function CardPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const response = location.state as CreateOrderResponse | null;

  if (!response?.clientSecret || !response?.order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full text-center p-8 sm:p-10">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Invalid Payment Session</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-4">
            This payment link is no longer valid. Please place your order again.
          </p>
          <Button onClick={() => navigate('/cart')} size="lg" className="w-full sm:w-auto">
            Back to Cart
          </Button>
        </Card>
      </div>
    );
  }

  const { clientSecret, order } = response;
  const walletUsed = order.walletUsed ?? 0;
  const shortId = order.shortId;

  const appearance = {
    theme: 'flat' as const,
    variables: {
      colorPrimary: '#e11d48',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#dc2626',
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 sm:space-y-3">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-100 mx-auto flex items-center justify-center">
            <CreditCard className="h-8 w-8 sm:h-10 sm:w-10 text-rose-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Complete Payment</h1>
          <CardDescription className="text-sm sm:text-base">
            Order <span className="font-mono font-bold text-rose-600">#{shortId}</span>
          </CardDescription>
        </div>

        {/* Amount Card */}
        <Card className="border-2 border-rose-200 shadow-xl">
          <CardHeader className="text-center pb-4">
            <p className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground">
              Amount Due
            </p>
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-rose-600">
              Rs. {order.finalAmount.toLocaleString()}
            </p>
            {walletUsed > 0 && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                (Rs. {walletUsed.toLocaleString()} paid via wallet)
              </p>
            )}
          </CardHeader>

          <CardContent>
            <Elements stripe={stripePromise} options={options}>
              <CardForm
                clientSecret={clientSecret}
                orderId={order._id}
                amount={order.finalAmount}
                shortId={shortId}
              />
            </Elements>
          </CardContent>
        </Card>

        <p className="text-center text-xs sm:text-sm text-muted-foreground">
          Powered by Stripe • PCI DSS Compliant
        </p>
      </div>
    </div>
  );
}
