// src/features/orders/pages/OrderRefundRequestPage.tsx
// FINAL PRODUCTION — DECEMBER 17, 2025
// Customer refund request for delivered card-paid orders

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Receipt, Shield, AlertCircle } from 'lucide-react';

import { toast } from 'sonner';
import { format } from 'date-fns';

import { useOrder, useTrackOrder } from '@/features/orders/hooks/useOrders';
import { useAuthStore } from '@/features/auth/store/authStore';
import { api } from '@/lib/api';

/* ------------------------------------------------------------------ */
/* ZOD SCHEMA                                                         */
/* ------------------------------------------------------------------ */
const refundSchema = z.object({
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be greater than 0')
    .max(999999, 'Amount is too large'),

  reason: z
    .string()
    .min(10, 'Please provide a detailed reason (at least 10 characters)')
    .max(500, 'Reason cannot exceed 500 characters'),
});

type RefundForm = z.infer<typeof refundSchema>;

export default function OrderRefundRequestPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // Use private authenticated endpoint when logged in (avoids 403)
  const privateQuery = useOrder(orderId);
  // Public tracking as fallback (for shared links / logged-out)
  const publicQuery = useTrackOrder(orderId);

  // Prefer authenticated data if available
  const order = isAuthenticated ? privateQuery.data : publicQuery.data;
  const isLoading = isAuthenticated ? privateQuery.isLoading : publicQuery.isLoading;
  const isError = isAuthenticated ? privateQuery.isError : publicQuery.isError;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RefundForm>({
    resolver: zodResolver(refundSchema),
    defaultValues: {
      amount: 0,
      reason: '',
    },
  });

  const requestedAmount = watch('amount') || 0;

  /* ------------------------------------------------------------------ */
  /* Auto-fill maximum refundable amount                                 */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (order?.finalAmount > 0) {
      setValue('amount', order.finalAmount);
    }
  }, [order?.finalAmount, setValue]);

  /* ------------------------------------------------------------------ */
  /* Format currency helper                                             */
  /* ------------------------------------------------------------------ */
  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  /* ------------------------------------------------------------------ */
  /* Submit Refund Request                                              */
  /* ------------------------------------------------------------------ */
  const onSubmit = async (data: RefundForm) => {
    if (!order) return;

    if (data.amount > order.finalAmount) {
      toast.error('Requested amount cannot exceed total paid');
      return;
    }

    try {
      setIsSubmitting(true);

      await api.post(`/orders/${order._id}/request-refund`, {
        amount: data.amount,
        reason: data.reason.trim(),
      });

      toast.success(
        'Refund request submitted! We’ll review it and get back to you within 24 hours.'
      );

      navigate(`/track/${order._id}`);
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        'Failed to submit refund request. Please try again later.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Loading State                                                      */
  /* ------------------------------------------------------------------ */
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          <Skeleton className="h-12 w-96 mx-auto" />
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Error / Order Not Found                                            */
  /* ------------------------------------------------------------------ */
  if (isError || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
        <Card className="max-w-md w-full text-center p-10">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
          <p className="text-muted-foreground mb-8">
            This order doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/orders">Go to My Orders</Link>
          </Button>
        </Card>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Eligibility Check                                                  */
  /* ------------------------------------------------------------------ */
  const isEligible =
    order.status === 'delivered' &&
    order.paymentMethod === 'card' &&
    order.paymentStatus === 'paid';

  if (!isEligible) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
        <Card className="max-w-lg w-full p-10 text-center shadow-xl">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Refund Not Available</h2>
          <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
            Refunds are only available for orders that are:
            <br />
            <strong>• Paid by card</strong> and <strong>• Marked as delivered</strong>
          </p>
          <Button asChild size="lg">
            <Link to={`/track/${order._id}`}>Back to Order Details</Link>
          </Button>
        </Card>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Main Refund Request Form                                           */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Button variant="ghost" asChild className="mb-8">
          <Link to={`/track/${order._id}`}>
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Order
          </Link>
        </Button>

        <div className="text-center mb-12">
          <Receipt className="h-16 w-16 mx-auto text-amber-600 mb-4" />
          <h1 className="text-4xl font-bold mb-2">Request a Refund</h1>
          <p className="text-muted-foreground text-lg">
            Order #{order.shortId || order._id.slice(-6).toUpperCase()} •{' '}
            {format(new Date(order.placedAt), 'dd MMM yyyy')}
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Submit Refund Request</CardTitle>
            <CardDescription>
              You can request a partial or full refund. Requests are reviewed within 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="amount">Refund Amount (PKR)</Label>
                  <span className="text-sm text-muted-foreground">
                    Max: {formatPKR(order.finalAmount)}
                  </span>
                </div>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  max={order.finalAmount}
                  step={1}
                  placeholder="Enter amount"
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && (
                  <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="reason">Reason for Refund</Label>
                <Textarea
                  id="reason"
                  rows={5}
                  placeholder="Please explain why you are requesting a refund (e.g., item was damaged, wrong item received, etc.)"
                  {...register('reason')}
                />
                {errors.reason && (
                  <p className="text-sm text-destructive mt-1">{errors.reason.message}</p>
                )}
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={
                    isSubmitting ||
                    requestedAmount <= 0 ||
                    requestedAmount > order.finalAmount
                  }
                >
                  {isSubmitting ? 'Submitting Request...' : 'Submit Refund Request'}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                By submitting, you agree to our refund policy. Refunds are processed back to the original payment method.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}