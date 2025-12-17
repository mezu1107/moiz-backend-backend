// src/features/orders/pages/OrderTrackingPage.tsx
// FINAL PRODUCTION — DECEMBER 16, 2025
// Live order tracking page (success + real-time updates)

import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

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

import {
  CheckCircle,
  Clock,
  ChefHat,
  Truck,
  Package,
  XCircle,
  MapPin,
  Phone,
} from 'lucide-react';

import confetti from 'canvas-confetti';

import { useTrackOrder } from '@/features/orders/hooks/useOrders';
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

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
        <Card className="max-w-md w-full text-center p-10">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Invalid Link</h2>
          <p className="text-muted-foreground mb-8">
            No order ID found. Please check your link or go to your orders.
          </p>
          <Button asChild>
            <Link to="/orders">My Orders</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const { data: order, isLoading, error } = useTrackOrder(orderId);

  // Real-time updates
  useOrderSocket(orderId);

  // Confetti on delivery
  useEffect(() => {
    if (order?.status === 'delivered') {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#e11d48', '#f97316', '#22c55e', '#3b82f6'],
      });
    }
  }, [order?.status]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Skeleton className="h-96 rounded-2xl mb-6" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
        <Card className="max-w-md w-full text-center p-10">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
          <p className="text-muted-foreground mb-8">
            This order doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/orders">My Orders</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.status === order.status);
  const isTerminal = ['delivered', 'cancelled', 'rejected'].includes(order.status);
  const isCancelled = ['cancelled', 'rejected'].includes(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-8">
      <div className="container mx-auto px-4 max-w-3xl space-y-8">

        {/* Header */}
        <div className="text-center py-8">
          <div
            className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 shadow-lg ${
              isCancelled
                ? 'bg-red-100'
                : order.status === 'delivered'
                ? 'bg-green-100'
                : 'bg-rose-100'
            }`}
          >
            {isCancelled ? (
              <XCircle className="h-14 w-14 text-red-600" />
            ) : order.status === 'delivered' ? (
              <CheckCircle className="h-14 w-14 text-green-600" />
            ) : (
              <CheckCircle className="h-14 w-14 text-rose-600" />
            )}
          </div>

          <h1 className="text-4xl font-bold mb-3">
            {isCancelled
              ? 'Order Cancelled'
              : order.status === 'delivered'
              ? 'Order Delivered!'
              : 'Order Confirmed!'}
          </h1>

          <p className="text-xl text-muted-foreground mb-4">
            Order <span className="font-mono font-bold text-rose-600">#{order.shortId}</span>
          </p>

          <Badge
            className={`text-lg px-6 py-2 ${ORDER_STATUS_COLORS[order.status]} text-white`}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>

        {/* Progress Timeline */}
        {!isTerminal && (
          <Card className="overflow-hidden shadow-xl">
            <CardHeader>
              <CardTitle>Order Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="relative">
                <div className="flex justify-between items-center">
                  {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const isActive = i <= currentStepIndex;
                    const isCompleted = i < currentStepIndex;

                    return (
                      <div key={step.status} className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                            isCompleted
                              ? 'bg-green-500 text-white'
                              : isActive
                              ? 'bg-rose-600 text-white scale-110 shadow-lg'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-8 w-8" />
                        </div>
                        <p
                          className={`text-sm mt-3 font-medium transition-colors ${
                            isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Bar */}
                <div className="absolute top-8 left-0 right-0 h-2 bg-muted -z-10">
                  <div
                    className="h-full bg-rose-600 transition-all duration-700 ease-out rounded-full"
                    style={{
                      width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {order.estimatedDelivery && currentStepIndex < 4 && (
                <p className="text-center mt-8 text-lg">
                  Estimated delivery: <strong>{order.estimatedDelivery}</strong>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {item.quantity}
                  </div>
                  <div>
                    <p className="font-medium">{item.menuItem.name}</p>
                  </div>
                </div>
                <p className="font-medium">
                  Rs. {(item.priceAtOrder * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}

            <Separator className="my-6" />

            <div className="space-y-3 text-lg">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rs. {order.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>Rs. {order.deliveryFee.toLocaleString()}</span>
              </div>
              {order.discountApplied > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Discount</span>
                  <span>-Rs. {order.discountApplied.toLocaleString()}</span>
                </div>
              )}
              {order.walletUsed > 0 && (
                <div className="flex justify-between text-blue-600 font-medium">
                  <span>Wallet Used</span>
                  <span>-Rs. {order.walletUsed.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-2xl font-bold pt-4">
                <span>Total Paid</span>
                <span className="text-rose-600">Rs. {order.finalAmount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="font-medium mb-1">Address</p>
              <p className="text-muted-foreground">
                {order.addressDetails.fullAddress}
                {order.addressDetails.floor && `, ${order.addressDetails.floor}`}
              </p>
              {order.instructions && (
                <p className="text-sm text-muted-foreground mt-2 italic">
                  "{order.instructions}"
                </p>
              )}
            </div>

            {order.rider && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">{order.rider.name}</p>
                      <p className="text-sm text-muted-foreground">Your Rider</p>
                    </div>
                  </div>
                  <Button size="lg" asChild>
                    <a href={`tel:${order.rider.phone}`}>
                      <Phone className="h-5 w-5 mr-2" />
                      Call Rider
                    </a>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4 pb-8">
          <Button variant="outline" size="lg" asChild>
            <Link to="/orders">View All Orders</Link>
          </Button>
          <Button size="lg" asChild>
            <Link to="/menu">Order Again</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}