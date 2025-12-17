// src/pages/admin/orders/OrderDetails.tsx
// FINAL PRODUCTION — DECEMBER 16, 2025
// Admin detailed view of a single order

import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';

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
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Package,
  Clock,
  CheckCircle,
  Truck,
  ChefHat,
  XCircle,
  Receipt,
} from 'lucide-react';

import { useTrackOrder, downloadReceipt } from '@/features/orders/hooks/useOrders';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types/order.types';

const STATUS_ICONS = {
  pending: Clock,
  pending_payment: Clock,
  confirmed: CheckCircle,
  preparing: ChefHat,
  out_for_delivery: Truck,
  delivered: Package,
  cancelled: XCircle,
  rejected: XCircle,
};

export default function AdminOrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading } = useTrackOrder(orderId);

  const handleDownloadReceipt = () => {
    if (!order) return;
    downloadReceipt(order._id);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="space-y-8">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-10">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
          <Button asChild>
            <Link to="/admin/orders">Back to Orders</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const StatusIcon = STATUS_ICONS[order.status] || Clock;
  const customerName = order.guestInfo?.name || order.customer?.name || 'Guest';
  const customerPhone = order.guestInfo?.phone || order.customer?.phone || 'N/A';

  // Compute subtotal safely
  const subtotal = order.items.reduce(
    (acc, item) => acc + (item.priceAtOrder || 0) * (item.quantity || 1),
    0
  );

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-8">
        <Link to="/admin/orders">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Orders
        </Link>
      </Button>

      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Order Details</h1>
        <p className="text-2xl font-mono text-primary mb-4">#{order.shortId}</p>

        <div className="flex items-center justify-center gap-6">
          <Badge className={`text-lg px-6 py-2 ${ORDER_STATUS_COLORS[order.status]} text-white`}>
            <StatusIcon className="h-5 w-5 mr-2" />
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>

          <Badge variant="outline" className="text-lg px-4 py-2">
            {order.paymentMethod.toUpperCase()}
          </Badge>
        </div>

        <p className="text-muted-foreground mt-4">
          Placed on {format(new Date(order.placedAt), 'dd MMM yyyy • h:mm a')}
        </p>
      </div>

      {/* Customer Info */}
      <Card className="mb-8 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-6 w-6" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="font-medium text-lg">{customerName}</p>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Phone className="h-4 w-4" />
              {customerPhone}
            </p>
          </div>
          <div>
            <p className="font-medium">Order Type</p>
            <p className="text-muted-foreground">
              {order.guestInfo?.isGuest ? 'Guest Order' : 'Registered Customer'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Address */}
      <Card className="mb-8 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Delivery Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{order.addressDetails.fullAddress}</p>
          {order.addressDetails.floor && (
            <p className="text-muted-foreground mt-1">{order.addressDetails.floor}</p>
          )}
          {order.instructions && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="font-medium mb-1">Special Instructions:</p>
              <p className="italic">"{order.instructions}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rider Info */}
      {order.rider && (
        <Card className="mb-8 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Assigned Rider
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-9 w-9 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{order.rider.name}</p>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {order.rider.phone}
                </p>
              </div>
            </div>
            <Button asChild>
              <a href={`tel:${order.rider.phone}`}>
                <Phone className="h-5 w-5 mr-2" />
                Call Rider
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card className="mb-8 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            Order Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.items.map((item, i) => {
            const itemName = item.menuItem?.name || 'Deleted Item';
            const itemPrice = (item.priceAtOrder || 0) * (item.quantity || 1);
            return (
              <div key={i} className="flex justify-between items-center py-4 border-b last:border-0">
                <div>
                  <p className="font-medium text-lg">
                    {item.quantity || 1} × {itemName}
                  </p>
                </div>
                <p className="font-bold text-lg">Rs. {itemPrice.toLocaleString()}</p>
              </div>
            );
          })}

          <Separator className="my-6" />

          <div className="space-y-4 text-lg">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>Rs. {(order.deliveryFee || 0).toLocaleString()}</span>
            </div>
            {order.discountApplied > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Discount Applied</span>
                <span>-Rs. {(order.discountApplied || 0).toLocaleString()}</span>
              </div>
            )}
            {order.walletUsed > 0 && (
              <div className="flex justify-between text-blue-600 font-medium">
                <span>Wallet Used</span>
                <span>-Rs. {(order.walletUsed || 0).toLocaleString()}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-2xl font-bold pt-4">
              <span>Total Paid</span>
              <span className="text-primary">
                Rs. {(order.finalAmount || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button size="lg" variant="outline" asChild>
          <Link to="/admin/orders">Back to Orders List</Link>
        </Button>
        <Button size="lg" onClick={handleDownloadReceipt}>
          <Receipt className="h-5 w-5 mr-2" />
          Download Receipt
        </Button>
      </div>
    </div>
  );
}
