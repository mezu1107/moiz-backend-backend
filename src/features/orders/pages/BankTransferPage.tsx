// src/features/orders/pages/BankTransferPage.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first, fluid layout, touch-friendly, accessible
// Enhanced UX with better spacing, typography scaling, and visual hierarchy

import { useLocation, useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Order, CreateOrderResponse } from '@/types/order.types';

export default function BankTransferPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  const response = location.state as CreateOrderResponse | null;

  if (!response || !response.order || !response.bankDetails) {
    return (
      <main className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md text-center p-6 md:p-8">
          <AlertCircle className="h-14 w-14 md:h-16 md:w-16 text-muted-foreground/50 mx-auto mb-6" />
          <h2 className="text-xl font-bold md:text-2xl mb-3">Payment Details Missing</h2>
          <p className="text-muted-foreground mb-6 text-base md:text-lg">
            This page cannot be accessed directly. Please complete checkout first.
          </p>
          <Button size="lg" onClick={() => navigate('/cart')}>
            Back to Cart
          </Button>
        </Card>
      </main>
    );
  }

  const { order, bankDetails } = response;
  const walletUsed = order.walletUsed ?? 0;
  const shortId = order.shortId;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyButton = ({ text, label }: { text: string; label: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 md:h-10 md:w-10"
      onClick={() => copyToClipboard(text, label)}
      aria-label={`Copy ${label}`}
    >
      {copied === label ? (
        <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
      ) : (
        <Copy className="h-4 w-4 md:h-5 md:w-5" />
      )}
    </Button>
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-background pb-12">
      {/* Hero Header */}
      <header className="bg-gradient-to-b from-orange-500/10 to-transparent pt-8 pb-10 md:pt-12 md:pb-16 text-center">
        <div className="container mx-auto px-4">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-orange-100 mx-auto mb-6 flex items-center justify-center">
            <Building2 className="h-8 w-8 md:h-10 md:w-10 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold md:text-4xl lg:text-5xl mb-3">
            Bank Transfer Required
          </h1>
          <p className="text-base text-muted-foreground md:text-lg max-w-md mx-auto px-4">
            Please transfer the exact amount using the details below to confirm your order
          </p>
          <Badge variant="secondary" className="mt-4 px-4 py-2 text-sm md:text-base">
            <Clock className="h-3 w-3 md:h-4 md:w-4 mr-1" />
            Auto-cancels in 15 minutes
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 max-w-2xl -mt-6 space-y-6 md:space-y-8">
        {/* Amount Due Card */}
        <Card className="border-2 border-primary shadow-xl overflow-hidden">
          <CardContent className="p-6 md:p-10 text-center bg-gradient-to-br from-primary/5 to-transparent">
            <p className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
              Amount to Transfer
            </p>
            <p className="text-4xl font-bold text-primary md:text-5xl">
              Rs. {order.finalAmount.toLocaleString()}
            </p>
            {walletUsed > 0 && (
              <p className="text-sm text-muted-foreground mt-3 md:text-base">
                (Rs. {walletUsed.toLocaleString()} paid via wallet)
              </p>
            )}
            <Separator className="my-6" />
            <p className="text-lg font-medium md:text-xl">
              Order <span className="font-mono font-bold text-primary">#{shortId}</span>
            </p>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
              <Building2 className="h-5 w-5 md:h-6 md:w-6" />
              Transfer To
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              {bankDetails.bankName} • {bankDetails.branch}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Account Title', value: bankDetails.accountTitle },
              { label: 'Account Number', value: bankDetails.accountNumber },
              { label: 'IBAN', value: bankDetails.iban },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="font-medium font-mono text-base md:text-lg break-all">
                    {item.value}
                  </p>
                </div>
                <CopyButton text={item.value} label={item.label} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Reference Code – Critical */}
        <Card className="border-2 border-orange-500 bg-orange-500/5">
          <CardContent className="p-6 md:p-8 text-center">
            <p className="text-sm uppercase tracking-wider text-orange-600 mb-3 md:text-base">
              Required Reference Code
            </p>
            <div className="flex items-center justify-center gap-4">
              <p className="text-3xl font-bold font-mono tracking-widest text-orange-600 md:text-4xl">
                {bankDetails.reference}
              </p>
              <CopyButton text={bankDetails.reference} label="Reference" />
            </div>
            <div className="mt-6 p-4 bg-orange-100 rounded-lg border border-orange-300">
              <p className="text-sm text-orange-800 flex items-start gap-2 md:text-base">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Must include this reference</strong> in the transfer description/remarks. 
                  Without it, we cannot match your payment.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step-by-Step Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">How to Complete Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 md:space-y-5">
              {[
                'Open your banking app or visit your bank branch/ATM',
                `Transfer exactly <strong>Rs. ${order.finalAmount.toLocaleString()}</strong>`,
                `In the remarks/description field, write: <strong>${bankDetails.reference}</strong>`,
                'Take a screenshot of the transaction for your records',
                'Your order will be confirmed automatically within 5–15 minutes',
              ].map((step, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span
                    className="text-sm md:text-base leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: step }}
                  />
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Final Warning */}
        <div className="p-5 bg-destructive/10 border border-destructive/30 rounded-xl text-center">
          <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-3" />
          <p className="text-sm font-medium text-destructive md:text-base">
            This order will be automatically cancelled if payment is not received within 15 minutes.
          </p>
        </div>

        {/* CTA Button */}
        <Button
          size="lg"
          className="w-full h-14 text-base md:text-lg font-semibold shadow-lg"
          onClick={() => navigate(`/track/${orderId}`)}
        >
          I’ve Made the Transfer
          <ArrowRight className="ml-3 h-5 w-5 md:h-6 md:w-6" />
        </Button>

        <p className="text-center text-sm text-muted-foreground pt-4 pb-8">
          We’ll notify you as soon as your payment is confirmed. Thank you!
        </p>
      </div>
    </main>
  );
}