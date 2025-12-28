// src/features/orders/pages/OrdersPage.tsx
// PRODUCTION-READY — FULLY RESPONSIVE, DEC 28, 2025

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import {
  ShoppingBag,
  Clock,
  Package,
  Search,
  ChevronRight,
  Loader2,
  PackageOpen,
  Star,
} from 'lucide-react';

import { useAuthStore } from '@/features/auth/store/authStore';
import { useMyOrders, useTrackOrdersByPhone } from '@/features/orders/hooks/useOrders';
import { useOrderSocket } from '@/features/orders/hooks/useOrderSocket';

import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  type Order,
} from '@/types/order.types';

import SubmitReviewModal from '@/features/reviews/components/SubmitReviewModal';

// ------------------------------
// Order Card Component
// ------------------------------
const OrderCard: React.FC<{ order: Order }> = ({ order }) => {
  const items = order.items || [];
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const isDeliveredAndNotReviewed = order.status === 'delivered' && !order.review;

  return (
    <>
      <Link to={`/track/${order._id}`} className="block">
        <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer border rounded-xl">
          <CardContent className="p-4 sm:p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <p className="font-bold text-lg sm:text-xl md:text-2xl">#{order.shortId}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {format(new Date(order.placedAt), 'dd MMM yyyy • h:mm a')}
                </p>
              </div>
              <div className="flex flex-col sm:items-end gap-2">
                <Badge
                  variant="outline"
                  className={`${ORDER_STATUS_COLORS[order.status]} text-white text-xs sm:text-sm`}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
                {isDeliveredAndNotReviewed && (
                  <Badge variant="outline" className="border-orange-600 text-orange-600 text-xs sm:text-sm flex items-center gap-1">
                    <Star className="h-3 w-3 sm:h-4 sm:w-4" /> Review Pending
                  </Badge>
                )}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Items + Price */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {items.slice(0, 4).map((item, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-sm font-bold text-primary"
                      title={item.menuItem.name}
                    >
                      {item.menuItem.name[0].toUpperCase()}
                    </div>
                  ))}
                  {items.length > 4 && (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs sm:text-sm font-medium">
                      +{items.length - 4}
                    </div>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  <p>{items.length} item{items.length !== 1 ? 's' : ''}</p>
                  <p className="font-semibold text-foreground mt-1 sm:mt-2">
                    Rs. {order.finalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground self-center" />
            </div>

            {/* Review Button */}
            {isDeliveredAndNotReviewed && (
              <div className="mt-4 sm:mt-6">
                <Button
                  className="w-full sm:w-auto text-sm sm:text-base"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setReviewModalOpen(true);
                  }}
                >
                  <Star className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Rate & Review This Order
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>

      <SubmitReviewModal
        orderId={order._id}
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
      />
    </>
  );
};

// ------------------------------
// Guest Tracker Component
// ------------------------------
const GuestTracker: React.FC = () => {
  const [phone, setPhone] = useState('');
  const mutation = useTrackOrdersByPhone();

  const isValidPhone = /^03\d{9}$/.test(phone.replace(/\D/g, ''));

  const handleTrack = () => {
    if (isValidPhone) {
      mutation.mutate({ phone: phone.replace(/\D/g, '') });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-2xl">Track Your Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <p className="text-center text-sm sm:text-base text-muted-foreground">
            Enter your phone number to view your recent orders
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center">
            <Input
              placeholder="03XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
              maxLength={11}
              className="flex-1 text-base sm:text-lg"
            />
            <Button
              onClick={handleTrack}
              disabled={!isValidPhone || mutation.isPending}
              size="lg"
              className="w-full sm:w-auto"
            >
              {mutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" /> Track
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {mutation.isSuccess && mutation.data.orders.length === 0 && (
        <Card className="max-w-md mx-auto text-center py-12">
          <PackageOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-base sm:text-lg text-muted-foreground">No orders found for this number</p>
        </Card>
      )}

      {mutation.isSuccess &&
        mutation.data.orders.map((order: Order) => (
          <OrderCard key={order._id} order={order} />
        ))}
    </div>
  );
};

// ------------------------------
// Main Orders Page
// ------------------------------
const OrdersPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { data: orders = [], isLoading } = useMyOrders();
  useOrderSocket();

  const activeOrders = orders.filter(
    (o) => !['delivered', 'cancelled', 'rejected'].includes(o.status)
  );
  const pastOrders = orders.filter((o) =>
    ['delivered', 'cancelled', 'rejected'].includes(o.status)
  );

  // ------------------------------
  // Guest View
  // ------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4 sm:space-y-6">
            <ShoppingBag className="h-16 w-16 text-primary mx-auto" />
            <h1 className="text-3xl sm:text-4xl font-bold">My Orders</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Log in to see your full order history
            </p>
          </div>
          <GuestTracker />
        </div>
      </div>
    );
  }

  // ------------------------------
  // Authenticated User View
  // ------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-8 px-4">
      <div className="bg-background border-b py-4 sm:py-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold flex items-center gap-2 sm:gap-4">
            <ShoppingBag className="h-8 w-8 sm:h-10 sm:w-10 text-primary" /> My Orders
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto py-6 sm:py-8 space-y-6">
        {isLoading ? (
          <div className="space-y-4 sm:space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 sm:h-48 rounded-xl w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-12 sm:py-20">
            <CardContent>
              <PackageOpen className="h-16 sm:h-20 w-16 sm:w-20 text-muted-foreground/40 mx-auto mb-4" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-4">No Orders Yet</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-8">
                Start your delicious journey with us!
              </p>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/menu">Browse Menu</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6 sm:mb-10">
              <TabsTrigger value="active" className="text-sm sm:text-base">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 mr-2 inline" />
                Active ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="text-sm sm:text-base">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 mr-2 inline" />
                Past ({pastOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4 sm:space-y-6">
              {activeOrders.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-6 sm:py-12">
                    <p className="text-sm sm:text-base text-muted-foreground">
                      No active orders right now
                    </p>
                  </CardContent>
                </Card>
              ) : (
                activeOrders.map((order) => <OrderCard key={order._id} order={order} />)
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4 sm:space-y-6">
              {pastOrders.map((order) => (
                <OrderCard key={order._id} order={order} />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
