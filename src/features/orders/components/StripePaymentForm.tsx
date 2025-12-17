// src/features/orders/components/StripePaymentForm.tsx
// FINAL PRODUCTION — DECEMBER 16, 2025
// Fully synced with backend orderController.js and Stripe best practices

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, ArrowLeft, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface StripePaymentFormProps {
  clientSecret: string;
  orderId: string;
  amount: number; // in PKR (whole number)
}

function PaymentForm({ orderId, amount }: { orderId: string; amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error('Payment system not ready. Please try again.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // Trigger form validation and wallet collection
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMessage(submitError.message ?? 'Invalid payment details');
      setIsProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/track/${orderId}`, // Full redirect fallback for 3DS
      },
      redirect: 'if_required', // Stay on page if no redirect needed
    });

    if (error) {
      setErrorMessage(error.message ?? 'Payment failed');
      toast.error(error.message ?? 'Payment failed');
    } else if (paymentIntent) {
      switch (paymentIntent.status) {
        case 'succeeded':
        case 'processing':
          setIsComplete(true);
          toast.success('Payment successful! 🎉');
          setTimeout(() => {
            navigate(`/track/${orderId}`);
          }, 2000);
          break;
        case 'requires_payment_method':
          setErrorMessage('Payment failed. Please try another payment method.');
          toast.error('Payment failed. Please try again.');
          break;
        default:
          setErrorMessage('Payment status unknown. Please check your order.');
          toast.warning('Payment in progress. We’ll update your order soon.');
      }
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
          fields: {
            billingDetails: {
              name: 'auto',
              email: 'auto',
              phone: 'auto',
            },
          },
        }}
      />

      {errorMessage && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {errorMessage}
        </div>
      )}

      {isComplete && (
        <div className="p-4 rounded-lg bg-green-50 text-green-700 border border-green-200 flex items-center gap-3">
          <CheckCircle className="h-5 w-5" />
          <span>Payment successful! Redirecting to your order...</span>
        </div>
      )}

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(-1)}
          disabled={isProcessing || isComplete}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Button
          type="submit"
          disabled={!stripe || isProcessing || isComplete}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : isComplete ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Paid
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Pay Rs. {amount.toLocaleString()}
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
        <Lock className="h-3 w-3" />
        <span>Secured by Stripe • End-to-end encrypted • No card details stored</span>
      </div>
    </form>
  );
}

export default function StripePaymentForm({
  clientSecret,
  orderId,
  amount,
}: StripePaymentFormProps) {
  const shortId = orderId.slice(-6).toUpperCase();

  const appearance = {
    theme: 'flat' as const,
    variables: {
      colorPrimary: '#e11d48', // rose-600 (your brand color)
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#dc2626',
      fontFamily: 'Inter, system-ui, sans-serif',
      borderRadius: '12px',
      spacingUnit: '4px',
    },
    rules: {
      '.Label': {
        fontWeight: '600',
        fontSize: '14px',
        marginBottom: '8px',
      },
      '.Input': {
        padding: '12px 16px',
        border: '1px solid #e2e8f0',
        boxShadow: 'none',
      },
      '.Input:focus': {
        borderColor: '#e11d48',
        boxShadow: '0 0 0 1px #e11d48',
      },
    },
  };

  const options = {
    clientSecret,
    appearance,
    loader: 'always' as const,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-8">
          <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-6">
            <CreditCard className="h-10 w-10 text-rose-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Complete Payment</CardTitle>
          <CardDescription className="mt-2">
            Order <span className="font-mono font-bold text-rose-600">#{shortId}</span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-8 p-6 bg-rose-50 rounded-2xl text-center border border-rose-200">
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Amount Due</p>
            <p className="text-4xl font-bold text-rose-600 mt-2">
              Rs. {amount.toLocaleString()}
            </p>
          </div>

          <Elements stripe={stripePromise} options={options}>
            <PaymentForm orderId={orderId} amount={amount} />
          </Elements>

          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              Powered by{' '}
              <a
                href="https://stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                Stripe
              </a>
              {' • '}PCI DSS Compliant
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}