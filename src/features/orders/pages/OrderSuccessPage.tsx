// src/features/orders/pages/OrderSuccessPage.tsx
// PRODUCTION-READY — DECEMBER 28, 2025
// Reorder now works for BOTH authenticated and guest users
// Fully consistent with OrderTrackingPage
// Real-time socket, confetti, proper toasts

import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

import {
  CheckCircle,
  Clock,
  ChefHat,
  Truck,
  Package,
  XCircle,
  MapPin,
  Phone,
  RotateCcw,
  Loader2,
} from 'lucide-react';

import confetti from 'canvas-confetti';

import { useTrackOrder, useReorder } from '@/features/orders/hooks/useOrders';
import { useOrderSocket } from '@/features/orders/hooks/useOrderSocket';

import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from '@/types/order.types';

const STEPS = [
  { status: 'pending', icon: Clock, label: 'Order Received' },
  { status: 'confirmed', icon: CheckCircle, label: 'Confirmed' },
  { status: 'preparing', icon: ChefHat, label: 'Preparing' },
  { status: 'out_for_delivery', icon: Truck, label: 'On the Way' },
  { status: 'delivered', icon: Package, label: 'Delivered' },
] as const;

const formatPrice = (amount: number | undefined): string => {
  if (typeof amount !== 'number' || isNaN(amount)) return '0';
  return amount.toLocaleString('en-PK');
};

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading, error } = useTrackOrder(orderId);
  const reorderMutation = useReorder();

  useOrderSocket(orderId);

  // Confetti on delivery
  useEffect(() => {
    if (order?.status === 'delivered') {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
      });
    }
  }, [order?.status]);

  const handleReorder = async () => {
    if (!orderId) return;

    try {
      await reorderMutation.mutateAsync(orderId);
      toast.success('Items added to your cart!');
      setTimeout(() => navigate('/cart'), 800);
    } catch {
      // Error toast already handled in useReorder hook
    }
  };

  if (!orderId) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-muted/20">
        <Card className="w-full max-w-md text-center p-8 md:p-10">
          <XCircle className="h-14 w-14 md:h-16 md:w-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-bold md:text-3xl mb-4">Invalid Order</h2>
          <Button size="lg" asChild>
            <Link to="/orders">View Orders</Link>
          </Button>
        </Card>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="space-y-8">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-muted/20">
        <Card className="w-full max-w-md text-center p-8 md:p-10">
          <XCircle className="h-14 w-14 md:h-16 md:w-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-bold md:text-3xl mb-4">Order Not Found</h2>
          <Button size="lg" asChild>
            <Link to="/orders">View Orders</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.status === order.status);
  const isTerminal = ['delivered', 'cancelled', 'rejected'].includes(order.status);
  const isDelivered = order.status === 'delivered';
  const isCancelled = ['cancelled', 'rejected'].includes(order.status);
  const shortId = order.shortId || order._id.slice(-6).toUpperCase();

  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-4xl space-y-8 md:space-y-10">
        {/* Header Status */}
        <header className="text-center">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full mb-6 shadow-xl ${
              isCancelled
                ? 'bg-red-100'
                : isDelivered
                ? 'bg-green-100'
                : 'bg-rose-100'
            }`}
          >
            {isCancelled ? (
              <XCircle className="h-12 w-12 md:h-14 md:w-14 text-red-600" />
            ) : isDelivered ? (
              <CheckCircle className="h-12 w-12 md:h-14 md:w-14 text-green-600" />
            ) : (
              <CheckCircle className="h-12 w-12 md:h-14 md:w-14 text-rose-600" />
            )}
          </div>

          <h1 className="text-3xl font-bold mb-3 md:text-4xl lg:text-5xl">
            {isCancelled
              ? 'Order Cancelled'
              : isDelivered
              ? 'Order Delivered!'
              : 'Order Confirmed!'}
          </h1>

          <p className="text-lg text-muted-foreground mb-4 md:text-xl">
            Order <span className="font-mono font-bold text-rose-600">#{shortId}</span>
          </p>

          <Badge
            className={`text-base md:text-lg px-6 py-2 ${ORDER_STATUS_COLORS[order.status]} text-white`}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </header>

        {/* Progress Timeline */}
        {!isTerminal && (
          <Card className="overflow-hidden shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl md:text-2xl">Order Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              <div className="relative">
                <div className="grid grid-cols-5 gap-4">
                  {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const isActive = i <= currentStepIndex;
                    const isCompleted = i < currentStepIndex;

                    return (
                      <div key={step.status} className="flex flex-col items-center">
                        <div
                          className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-md ${
                            isCompleted
                              ? 'bg-green-500 text-white'
                              : isActive
                              ? 'bg-rose-600 text-white scale-110'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-7 w-7 md:h-8 md:w-8" />
                        </div>
                        <p
                          className={`mt-3 text-xs md:text-sm font-medium text-center ${
                            isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="absolute top-7 md:top-8 left-0 right-0 h-2 bg-muted -z-10">
                  <div
                    className="h-full bg-rose-600 transition-all duration-700 ease-out rounded-full"
                    style={{
                      width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {order.estimatedDelivery && currentStepIndex < STEPS.length - 1 && (
                <p className="text-center mt-6 text-base md:text-lg">
                  Estimated Delivery:{' '}
                  <strong className="text-rose-600">{order.estimatedDelivery}</strong>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Items & Summary */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-5">
              {order.items.map((item, index) => (
                <div
                  key={item._id || index}
                  className="flex items-center justify-between py-4 border-b last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm md:text-base">
                      {item.quantity}
                    </div>
                    <p className="font-medium text-base md:text-lg">
                      {item.menuItem?.name || item.name || 'Item Unavailable'}
                    </p>
                  </div>
                  <p className="font-medium text-base md:text-lg">
                    Rs. {formatPrice((item.priceAtOrder ?? 0) * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-4 text-base md:text-lg">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rs. {formatPrice(order.totals?.totalAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>Rs. {formatPrice(order.totals?.deliveryFee ?? 0)}</span>
              </div>
              {order.totals?.discountApplied > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Discount</span>
                  <span>-Rs. {formatPrice(order.totals.discountApplied)}</span>
                </div>
              )}
              {order.totals?.walletUsed > 0 && (
                <div className="flex justify-between text-blue-600 font-medium">
                  <span>Wallet Used</span>
                  <span>-Rs. {formatPrice(order.totals.walletUsed)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-2xl font-bold md:text-3xl">
                <span>Total Paid</span>
                <span className="text-rose-600">
                  Rs. {formatPrice(order.totals?.finalAmount ?? 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
              <MapPin className="h-6 w-6" />
              Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-base md:text-lg leading-relaxed">
              {order.addressDetails?.fullAddress ||
                order.address?.fullAddress ||
                'Address not available'}
            </p>

            {order.addressDetails?.floor && (
              <p className="text-muted-foreground">
                Floor: {order.addressDetails.floor}
              </p>
            )}

            {(order.instructions ||
              order.addressDetails?.instructions ||
              order.address?.instructions) && (
              <p className="italic text-muted-foreground text-sm md:text-base">
                Note: "
                {order.instructions ||
                  order.addressDetails?.instructions ||
                  order.address?.instructions}
                "
              </p>
            )}

            {order.rider && (
              <>
                <Separator className="my-6" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
                      <Truck className="h-8 w-8 md:h-10 md:w-10 text-rose-600" />
                    </div>
                    <div>
                      <p className="font-bold text-lg md:text-xl">{order.rider.name}</p>
                      <p className="text-sm text-muted-foreground md:text-base">
                        Your Delivery Partner
                      </p>
                    </div>
                  </div>

                  <Button size="lg" variant="secondary" asChild className="h-12">
                    <a href={`tel:${order.rider.phone}`}>
                      <Phone className="mr-2 h-5 w-5" />
                      Call Rider
                    </a>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons — Reorder available to ALL users */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
          <Button variant="outline" size="lg" asChild className="h-12">
            <Link to="/orders">View All Orders</Link>
          </Button>

          <Button
            size="lg"
            onClick={handleReorder}
            disabled={reorderMutation.isPending || isCancelled}
            className="h-12 bg-rose-600 hover:bg-rose-700 text-base md:text-lg"
          >
            {reorderMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Adding to Cart...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-5 w-5" />
                Order Again
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}