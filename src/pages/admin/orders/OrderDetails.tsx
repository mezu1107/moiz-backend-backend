// src/pages/admin/orders/OrderDetails.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first admin order details with safe fallbacks and reject functionality
// Fixed TypeScript errors: proper typing for address and safe optional chaining

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
  Loader2,
} from 'lucide-react';

import { 
  useTrackOrder, 
  downloadReceipt,
  useAdminRejectOrder 
} from '@/features/orders/hooks/useOrders';
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

// Proper interface for address details
interface AddressDetails {
  fullAddress?: string;
  floor?: string;
  instructions?: string;
}

export default function AdminOrderDetails() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading } = useTrackOrder(orderId);
  const adminRejectOrder = useAdminRejectOrder();

  const handleDownloadReceipt = () => {
    if (order?._id) {
      downloadReceipt(order._id);
    }
  };

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
        <div className="space-y-8">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-muted/20">
        <Card className="w-full max-w-md text-center p-8 md:p-10">
          <XCircle className="h-14 w-14 md:h-16 md:w-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-bold md:text-3xl mb-4">Order Not Found</h2>
          <Button size="lg" asChild>
            <Link to="/admin/orders">Back to Orders</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const StatusIcon = STATUS_ICONS[order.status] || Clock;
  const customerName = order.guestInfo?.name || order.customer?.name || 'Guest';
  const customerPhone = order.guestInfo?.phone || order.customer?.phone || 'N/A';
  const shortId = order.shortId || order._id.slice(-6).toUpperCase();

  const subtotal = order.items?.reduce(
    (acc, item) => acc + ((item.priceAtOrder ?? 0) * (item.quantity ?? 1)),
    0
  ) ?? 0;

  const paymentMethod = order.paymentMethod?.toUpperCase() || 'N/A';

  // Safely extract address details with fallbacks
  const addressDetails: AddressDetails = order.addressDetails ?? {};
  const addressInstructions = order.instructions || addressDetails.instructions;

  const isRejectable = !['delivered', 'cancelled', 'rejected'].includes(order.status);

  return (
    <main className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-8">
        <Link to="/admin/orders">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Orders
        </Link>
      </Button>

      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4 md:text-4xl lg:text-5xl">Order Details</h1>
        <p className="text-2xl font-mono text-primary mb-4 md:text-3xl">#{shortId}</p>

        <div className="flex flex-wrap justify-center gap-4">
          <Badge className={`text-base md:text-lg px-6 py-2 ${ORDER_STATUS_COLORS[order.status]} text-white`}>
            <StatusIcon className="h-5 w-5 mr-2" />
            {ORDER_STATUS_LABELS[order.status] || 'Unknown Status'}
          </Badge>

          <Badge variant="outline" className="text-base md:text-lg px-4 py-2">
            {paymentMethod}
          </Badge>
        </div>

        <p className="text-base text-muted-foreground mt-4 md:text-lg">
          Placed on {order.placedAt ? format(new Date(order.placedAt), 'dd MMM yyyy • h:mm a') : 'N/A'}
        </p>
      </header>

      {/* Customer Info */}
      <Card className="mb-8 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
            <User className="h-6 w-6" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="font-medium text-lg md:text-xl">{customerName}</p>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Phone className="h-4 w-4" />
              {customerPhone}
            </p>
          </div>
          <div>
            <p className="font-medium text-lg md:text-xl">Order Type</p>
            <p className="text-muted-foreground">
              {order.guestInfo?.isGuest ? 'Guest Order' : 'Registered Customer'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Address */}
      <Card className="mb-8 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
            <MapPin className="h-6 w-6" />
            Delivery Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base md:text-lg leading-relaxed">
            {addressDetails.fullAddress || 'N/A'}
          </p>
          {addressDetails.floor && (
            <p className="text-muted-foreground">Floor: {addressDetails.floor}</p>
          )}
          {addressInstructions && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium mb-1">Special Instructions:</p>
              <p className="italic">"{addressInstructions}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rider Info */}
      {order.rider && (
        <Card className="mb-8 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
              <Truck className="h-6 w-6" />
              Assigned Rider
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-9 w-9 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold md:text-2xl">{order.rider.name || 'N/A'}</p>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {order.rider.phone || 'N/A'}
                </p>
              </div>
            </div>
            {order.rider.phone && (
              <Button size="lg" asChild className="h-12">
                <a href={`tel:${order.rider.phone}`}>
                  <Phone className="mr-2 h-5 w-5" />
                  Call Rider
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Items & Summary */}
      <Card className="mb-8 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
            <Package className="h-6 w-6" />
            Order Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-5">
            {order.items?.map((item, i) => {
              const itemName = item.menuItem?.name || 'Deleted Item';
              const itemPrice = ((item.priceAtOrder ?? 0) * (item.quantity ?? 1));
              return (
                <div key={i} className="flex items-center justify-between py-4 border-b last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm md:text-base">
                      {item.quantity ?? 1}
                    </div>
                    <p className="font-medium text-base md:text-lg">{itemName}</p>
                  </div>
                  <p className="font-medium text-base md:text-lg">
                    Rs. {itemPrice.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>

          <Separator />

          <div className="space-y-4 text-base md:text-lg">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>Rs. {(order.deliveryFee ?? 0).toLocaleString()}</span>
            </div>
            {order.discountApplied && order.discountApplied > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Discount Applied</span>
                <span>-Rs. {order.discountApplied.toLocaleString()}</span>
              </div>
            )}
            {order.walletUsed && order.walletUsed > 0 && (
              <div className="flex justify-between text-blue-600 font-medium">
                <span>Wallet Used</span>
                <span>-Rs. {order.walletUsed.toLocaleString()}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-2xl font-bold md:text-3xl pt-4">
              <span>Total Paid</span>
              <span className="text-primary">
                Rs. {(order.finalAmount ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button size="lg" variant="outline" asChild className="h-12">
          <Link to="/admin/orders">Back to Orders List</Link>
        </Button>

        <Button size="lg" onClick={handleDownloadReceipt} className="h-12">
          <Receipt className="mr-2 h-5 w-5" />
          Download Receipt
        </Button>

        {isRejectable && (
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              const reason = prompt('Reason for rejection (optional):');
              const note = prompt('Admin note (optional):');
              if (reason !== null || note !== null) {
                adminRejectOrder.mutate({
                  orderId: order._id,
                  reason: reason || undefined,
                  note: note || undefined,
                });
              }
            }}
            disabled={adminRejectOrder.isPending}
            className="h-12"
          >
            {adminRejectOrder.isPending ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-5 w-5" />
            )}
            Admin Reject Order
          </Button>
        )}
      </div>
    </main>
  );
}