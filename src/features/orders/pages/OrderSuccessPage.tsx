// src/features/orders/pages/OrderSuccessPage.tsx
// PRODUCTION-READY — JANUARY 01, 2026
// Polished success page with confetti, real-time updates, rich add-ons, units, dark mode

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
  UNIT_LABELS,
} from '@/types/order.types';

const STEPS = [
  { status: 'pending', icon: Clock, label: 'Order Received' },
  { status: 'confirmed', icon: CheckCircle, label: 'Confirmed' },
  { status: 'preparing', icon: ChefHat, label: 'Preparing' },
  { status: 'out_for_delivery', icon: Truck, label: 'On the Way' },
  { status: 'delivered', icon: Package, label: 'Delivered' },
] as const;

const formatPrice = (amount?: number): string => {
  if (amount == null || isNaN(amount)) return '0';
  return amount.toLocaleString('en-PK');
};

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data: response, isLoading, error } = useTrackOrder(orderId);
  const reorderMutation = useReorder();

  const order = response?.order;

  useOrderSocket(orderId);

  // Confetti on delivery
  useEffect(() => {
    if (order?.status === 'delivered') {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ff73b3', '#ff8c00', '#ffd700', '#00ff7f', '#00bfff', '#ff1493'],
        ticks: 200,
        gravity: 0.8,
        decay: 0.94,
        startVelocity: 30,
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
      // Handled in hook
    }
  };

  if (!orderId || !/^[0-9a-fA-F]{24}$/.test(orderId)) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-muted/20">
        <Card className="w-full max-w-md text-center p-8 md:p-10">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Invalid Order Link</h2>
          <p className="text-muted-foreground mb-6">The order ID is not valid.</p>
          <Button size="lg" asChild>
            <Link to="/">Go Home</Link>
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
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Order Not Found</h2>
          <p className="text-muted-foreground mb-6">
            We couldn't find an order with that ID.
          </p>
          <Button size="lg" asChild>
            <Link to="/orders">View My Orders</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.status === order.status);
  const isTerminal = ['delivered', 'cancelled', 'rejected'].includes(order.status);
  const isDelivered = order.status === 'delivered';
  const isCancelled = ['cancelled', 'rejected'].includes(order.status);
  const shortId = order.shortId ? `#${order.shortId}` : `#${order._id.slice(-6).toUpperCase()}`;

  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-4xl space-y-8 md:space-y-10">
        {/* Header */}
        <header className="text-center">
          <div
            className={`inline-flex items-center justify-center w-24 h-24 md:w-28 md:h-28 rounded-full mb-6 shadow-2xl ${
              isCancelled
                ? 'bg-red-100 dark:bg-red-950'
                : isDelivered
                ? 'bg-green-100 dark:bg-green-950'
                : 'bg-rose-100 dark:bg-rose-950'
            }`}
          >
            {isCancelled ? (
              <XCircle className="h-14 w-14 text-red-600 dark:text-red-400" />
            ) : isDelivered ? (
              <CheckCircle className="h-14 w-14 text-green-600 dark:text-green-400" />
            ) : (
              <CheckCircle className="h-14 w-14 text-rose-600 dark:text-rose-400" />
            )}
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            {isCancelled ? 'Order Cancelled' : isDelivered ? 'Order Delivered!' : 'Order Confirmed! 🎉'}
          </h1>

          <p className="text-xl text-muted-foreground mb-4">
            Order <span className="font-mono font-bold text-primary">{shortId}</span>
          </p>

          <Badge className={`text-lg px-8 py-3 ${ORDER_STATUS_COLORS[order.status]} text-white`}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>

          {order.estimatedDelivery && !isTerminal && (
            <p className="mt-6 text-lg text-muted-foreground">
              Estimated delivery:{' '}
              <span className="font-semibold text-primary">{order.estimatedDelivery}</span>
            </p>
          )}
        </header>

        {/* Progress Timeline */}
        {!isTerminal && (
          <Card className="overflow-hidden shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">Order Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="relative">
                <div className="grid grid-cols-5 gap-6">
                  {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const isCompleted = i < currentStepIndex;
                    const isActive = i === currentStepIndex;

                    return (
                      <div key={step.status} className="flex flex-col items-center text-center">
                        <div
                          className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${
                            isCompleted
                              ? 'bg-green-500 text-white'
                              : isActive
                              ? 'bg-primary text-white scale-110 ring-8 ring-primary/20'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-8 w-8 md:h-10 md:w-10" />
                        </div>
                        <p
                          className={`mt-4 text-sm md:text-base font-medium ${
                            isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="absolute top-8 md:top-10 left-0 right-0 h-3 bg-muted rounded-full -z-10">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${((currentStepIndex + 1) / STEPS.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Order Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {order.items.map((item, index) => (
              <div key={item._id || index} className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {item.quantity}x
                    </div>
                    <div>
                      <p className="font-semibold text-lg flex items-center gap-3 flex-wrap">
                        {item.name || item.menuItem?.name}
                        {item.unit && (
                          <Badge variant="secondary" className="text-xs">
                            {UNIT_LABELS[item.unit] || item.unit}
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-lg">
                    Rs. {formatPrice(item.priceAtOrder * item.quantity)}
                  </p>
                </div>

                {/* Add-ons */}
                {item.addOns?.length > 0 && (
                  <div className="ml-18 space-y-2 text-sm text-muted-foreground">
                    {item.addOns.map((addon, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          • {addon.name}
                          {addon.unit && (
                            <Badge variant="outline" className="text-xs py-0">
                              {UNIT_LABELS[addon.unit] || addon.unit}
                            </Badge>
                          )}
                        </span>
                        {addon.price > 0 && (
                          <span className="text-primary font-medium">
                            +Rs. {formatPrice(addon.price)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Separator className="my-8" />

            <div className="space-y-5 text-lg">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rs. {formatPrice(order.totals?.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>Rs. {formatPrice(order.totals?.deliveryFee)}</span>
              </div>
              {order.totals?.discountApplied > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                  <span>Discount</span>
                  <span>-Rs. {formatPrice(order.totals.discountApplied)}</span>
                </div>
              )}
              {order.totals?.walletUsed > 0 && (
                <div className="flex justify-between text-blue-600 dark:text-blue-400 font-semibold">
                  <span>Wallet Used</span>
                  <span>-Rs. {formatPrice(order.totals.walletUsed)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-3xl font-bold">
                <span>Total Paid</span>
                <span className="text-primary">
                  Rs. {formatPrice(order.totals?.finalAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address & Rider */}
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <MapPin className="h-7 w-7" />
              Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg leading-relaxed">
              {order.addressDetails?.fullAddress || order.address?.fullAddress || 'Address not available'}
            </p>

            {order.addressDetails?.floor && (
              <p className="text-muted-foreground">
                Floor/Apartment: {order.addressDetails.floor}
              </p>
            )}

            {(order.addressDetails?.instructions || order.instructions) && (
              <p className="italic text-muted-foreground border-l-4 border-primary/40 pl-4 py-2 bg-primary/5 rounded-r">
                "{order.addressDetails?.instructions || order.instructions}"
              </p>
            )}

            {order.rider && (
              <>
                <Separator className="my-8" />
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="h-12 w-12 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{order.rider.name}</p>
                      <p className="text-muted-foreground">Your delivery partner</p>
                    </div>
                  </div>
                  <Button size="lg" variant="secondary" asChild>
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

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-12">
          <Button variant="outline" size="lg" asChild className="h-14 text-lg">
            <Link to="/orders">View All Orders</Link>
          </Button>

          <Button
            size="lg"
            onClick={handleReorder}
            disabled={reorderMutation.isPending || isCancelled}
            className="h-14 text-lg bg-primary hover:bg-primary/90"
          >
            {reorderMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Adding to Cart...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-6 w-6" />
                Order Again
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}