// src/features/orders/pages/OrderTrackingPage.tsx
// FINAL PRODUCTION — DECEMBER 16, 2025
// Live order tracking with real-time rider location, payment countdown, and full details
// + "Request Refund" button added for delivered card-paid orders

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

import {
  CheckCircle,
  Clock,
  ChefHat,
  Truck,
  Package,
  XCircle,
  Phone,
  MapPin,
  Timer,
  Copy,
  Check,
  User,
} from 'lucide-react';

import { format, differenceInMinutes } from 'date-fns';

import { useTrackOrder } from '@/features/orders/hooks/useOrders';
import { useOrderSocket } from '@/features/orders/hooks/useOrderSocket';

import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from '@/types/order.types';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STEPS = [
  { status: 'pending' as const, icon: Clock, label: 'Order Received' },
  { status: 'confirmed' as const, icon: CheckCircle, label: 'Confirmed' },
  { status: 'preparing' as const, icon: ChefHat, label: 'Preparing' },
  { status: 'out_for_delivery' as const, icon: Truck, label: 'On the Way' },
  { status: 'delivered' as const, icon: Package, label: 'Delivered' },
] as const;

const PAYMENT_TIMEOUT_MINUTES = 15;

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isLoading } = useTrackOrder(orderId);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  // Real-time socket updates
  useOrderSocket(orderId);

  // Listen for rider location updates
  useEffect(() => {
    const handler = (e: Event) => {
      const payload = (e as CustomEvent<{ riderLocation: { lat: number; lng: number } }>).detail;
      if (payload.riderLocation) {
        setRiderLocation(payload.riderLocation);
      }
    };
    window.addEventListener('riderLocationUpdate', handler);
    return () => window.removeEventListener('riderLocationUpdate', handler);
  }, []);

  // Payment countdown timer
  useEffect(() => {
    if (!order || order.status !== 'pending_payment' || !order.placedAt) {
      setMinutesLeft(null);
      return;
    }

    const deadline = new Date(order.placedAt);
    deadline.setMinutes(deadline.getMinutes() + PAYMENT_TIMEOUT_MINUTES);

    const updateTimer = () => {
      const diff = differenceInMinutes(deadline, new Date());
      setMinutesLeft(Math.max(0, diff));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [order?.placedAt, order?.status]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Skeleton className="h-96 rounded-2xl mb-6" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
        <Card className="max-w-md w-full text-center p-10">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
          <p className="text-muted-foreground mb-8">
            This order doesn't exist or the link is invalid.
          </p>
          <Button asChild>
            <Link to="/orders">My Orders</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.status === order.status);
  const isCancelled = ['cancelled', 'rejected'].includes(order.status);
  const isPendingPayment = order.status === 'pending_payment';
  const showMap = order.status === 'out_for_delivery' && riderLocation;

  // Refund eligibility
  const isDelivered = order.status === 'delivered';
  const isCardPaid = order.paymentMethod === 'card';
  const canRequestRefund = isDelivered && isCardPaid;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-8">
      <div className="container mx-auto px-4 max-w-4xl space-y-8">

        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold mb-3">Order Tracking</h1>
          <p className="text-2xl font-mono text-primary mb-4">#{order.shortId}</p>

          <Badge className={`text-lg px-6 py-2 ${ORDER_STATUS_COLORS[order.status]} text-white`}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>

          <p className="text-sm text-muted-foreground mt-4">
            Placed on {format(new Date(order.placedAt), 'dd MMM yyyy • h:mm a')}
          </p>
        </div>

        {/* Pending Payment Block */}
        {isPendingPayment && (
          <Card className="border-2 border-orange-500 bg-orange-50 shadow-xl">
            <CardContent className="p-8 text-center space-y-8">
              <Timer className="h-24 w-24 text-orange-600 mx-auto" />

              <div>
                <h2 className="text-3xl font-bold text-orange-800">Payment Required</h2>
                <p className="text-lg mt-3 text-orange-700">
                  Complete payment within <strong>{minutesLeft} minutes</strong> to confirm your order
                </p>
              </div>

              {order.paymentMethod === 'bank' && order.bankTransferReference && (
                <div className="max-w-lg mx-auto bg-white rounded-2xl p-8 shadow-inner">
                  <p className="text-xl font-bold mb-6">
                    Transfer <span className="text-orange-600">Rs. {order.finalAmount.toLocaleString()}</span>
                  </p>

                  <div className="space-y-5 text-left">
                    {[
                      { label: 'Bank', value: 'Meezan Bank' },
                      { label: 'Account Title', value: 'FoodExpress Pvt Ltd' },
                      { label: 'IBAN', value: 'PK36MEZN0002110105678901' },
                      { label: 'Branch', value: 'Gulberg Branch, Lahore' },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between items-center py-3 border-b">
                        <div>
                          <p className="text-sm text-muted-foreground">{item.label}</p>
                          <p className="font-mono font-medium">{item.value}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(item.value, item.label)}
                        >
                          {copiedField === item.label ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <Copy className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    ))}

                    <div className="mt-8 p-6 bg-green-50 border-2 border-green-400 rounded-xl">
                      <p className="text-center text-sm font-medium mb-3">Required Reference Code</p>
                      <div className="flex items-center justify-center gap-4">
                        <code className="text-3xl font-bold text-green-700 tracking-wider">
                          {order.bankTransferReference}
                        </code>
                        <Button
                          onClick={() => copyToClipboard(order.bankTransferReference!, 'Reference Code')}
                        >
                          {copiedField === 'Reference Code' ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                      <p className="text-center text-xs text-green-800 mt-4">
                        Include this in transfer remarks
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {order.paymentMethod === 'card' && (
                <Button asChild size="lg" className="text-lg h-14 px-10">
                  <Link to="/checkout/card" state={{ clientSecret: order.paymentIntentId }}>
                    Complete Card Payment
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Progress Timeline */}
        {!isCancelled && !isPendingPayment && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Order Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-10">
              <div className="relative">
                <div className="flex justify-between items-center mb-8">
                  {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const isActive = i <= currentStepIndex;
                    const isCompleted = i < currentStepIndex;

                    return (
                      <div key={step.status} className="flex flex-col items-center z-10">
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${
                            isCompleted
                              ? 'bg-green-500 text-white'
                              : isActive
                              ? 'bg-rose-600 text-white scale-110'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-8 w-8" />
                        </div>
                        <p className={`mt-4 text-sm font-medium ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="absolute top-8 left-8 right-8 h-2 bg-muted -z-10">
                  <div
                    className="h-full bg-rose-600 rounded-full transition-all duration-700"
                    style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
                  />
                </div>
              </div>

              {order.estimatedDelivery && currentStepIndex < 4 && (
                <p className="text-center mt-10 text-xl">
                  Estimated delivery: <strong className="text-rose-600">{order.estimatedDelivery}</strong>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Live Rider Map */}
        {showMap && riderLocation && (
          <Card className="overflow-hidden shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Truck className="h-7 w-7" />
                Rider is on the way!
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96">
                <MapContainer center={riderLocation} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={riderLocation}>
                    <Popup>
                      <div className="text-center p-2">
                        <Truck className="h-10 w-10 text-rose-600 mx-auto mb-2" />
                        <p className="font-bold text-lg">{order.rider?.name || 'Your Rider'}</p>
                        <p className="text-sm">Delivering your order</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rider Contact */}
        {order.rider && order.status === 'out_for_delivery' && (
          <Card className="shadow-xl">
            <CardContent className="p-8 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center">
                  <User className="h-10 w-10 text-rose-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{order.rider.name}</p>
                  <p className="text-muted-foreground">Delivery Partner</p>
                </div>
              </div>
              <Button size="lg" asChild>
                <a href={`tel:${order.rider.phone}`}>
                  <Phone className="h-6 w-6 mr-3" />
                  Call Rider
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Order Summary */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">
                      {item.quantity} × {item.menuItem.name}
                    </p>
                  </div>
                  <p className="font-medium">
                    Rs. {(item.priceAtOrder * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <Separator />

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
              <Separator className="my-4" />
              <div className="flex justify-between text-2xl font-bold">
                <span>Total Paid</span>
                <span className="text-rose-600">Rs. {order.finalAmount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{order.addressDetails.fullAddress}</p>
            {order.addressDetails.floor && <p className="text-muted-foreground mt-1">{order.addressDetails.floor}</p>}
            {order.instructions && (
              <p className="mt-4 italic text-muted-foreground">
                Note: "{order.instructions}"
              </p>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-12">
          <Button variant="outline" size="lg" asChild>
            <Link to="/orders">View All Orders</Link>
          </Button>
          <Button size="lg" asChild>
            <Link to="/menu">Order Again</Link>
          </Button>

          {/* REQUEST REFUND BUTTON - Only for delivered + card payments */}
          {canRequestRefund && (
            <Button asChild size="lg" variant="secondary" className="sm:col-span-2">
              <Link to={`/order/${order._id}/refund`}>
                Request Refund
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}