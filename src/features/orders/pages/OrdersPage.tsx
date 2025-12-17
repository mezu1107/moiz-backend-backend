// src/features/orders/pages/OrdersPage.tsx
// FINAL PRODUCTION — DECEMBER 16, 2025
// Fully synced with backend, order.types.ts, and hooks

import { useState } from 'react';
import { Link } from 'react-router-dom';

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
} from 'lucide-react';

import { useAuthStore } from '@/features/auth/store/authStore';
import { useMyOrders, useTrackOrdersByPhone } from '@/features/orders/hooks/useOrders';
import { useOrderSocket } from '@/features/orders/hooks/useOrderSocket';

import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  type Order,
} from '@/types/order.types';

import { format } from 'date-fns';

const OrderCard = ({ order }: { order: Order }) => {
  const items = order.items || [];

  return (
    <Link to={`/track/${order._id}`} className="block">
      <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer border">
        <CardContent className="p-6">
          {/* Header: Short ID + Date + Status */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-bold text-xl">#{order.shortId}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(order.placedAt), 'dd MMM yyyy • h:mm a')}
              </p>
            </div>
            <Badge variant="outline" className={`${ORDER_STATUS_COLORS[order.status]} text-white`}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
          </div>

          <Separator className="my-4" />

          {/* Items summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Item avatars */}
              <div className="flex -space-x-3">
                {items.slice(0, 4).map((item, i) => (
                  <div
                    key={i}
                    className="w-12 h-12 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-sm font-bold text-primary"
                    title={item.menuItem.name}
                  >
                    {item.menuItem.name[0].toUpperCase()}
                  </div>
                ))}
                {items.length > 4 && (
                  <div className="w-12 h-12 rounded-full bg-muted border-2 border-background flex items-center justify-center text-sm font-medium">
                    +{items.length - 4}
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                <p>{items.length} item{items.length !== 1 ? 's' : ''}</p>
                <p className="font-semibold text-foreground mt-1">
                  Rs. {order.finalAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <ChevronRight className="h-6 w-6 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

const GuestTracker = () => {
  const [phone, setPhone] = useState('');
  const mutation = useTrackOrdersByPhone();

  const isValidPhone = /^03\d{9}$/.test(phone);

  const handleTrack = () => {
    if (isValidPhone) {
      mutation.mutate({ phone });
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Track Your Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Enter your phone number to view your recent orders
          </p>

          <div className="flex gap-3 max-w-md mx-auto">
            <Input
              placeholder="03XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
              maxLength={11}
              className="text-lg"
            />
            <Button
              onClick={handleTrack}
              disabled={!isValidPhone || mutation.isPending}
              size="lg"
            >
              {mutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Track
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {mutation.isSuccess && mutation.data.orders.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <PackageOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No orders found for this number</p>
          </CardContent>
        </Card>
      )}

      {mutation.data?.orders.map((order: Order) => (
        <OrderCard key={order._id} order={order} />
      ))}
    </div>
  );
};

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const { data: orders = [], isLoading } = useMyOrders();

  // Real-time updates for authenticated users
  useOrderSocket();

  // Split orders
  const activeOrders = orders.filter(
    (o) => !['delivered', 'cancelled', 'rejected'].includes(o.status)
  );
  const pastOrders = orders.filter((o) =>
    ['delivered', 'cancelled', 'rejected'].includes(o.status)
  );

  // Guest mode
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="text-center mb-12">
            <ShoppingBag className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">My Orders</h1>
            <p className="text-muted-foreground text-lg">
              Log in to see your full order history
            </p>
          </div>
          <GuestTracker />
        </div>
      </div>
    );
  }

  // Authenticated user view
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background">
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold flex items-center gap-4">
            <ShoppingBag className="h-10 w-10 text-primary" />
            My Orders
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-20">
            <CardContent>
              <PackageOpen className="h-20 w-20 text-muted-foreground/40 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">No Orders Yet</h2>
              <p className="text-muted-foreground mb-8">
                Start your delicious journey with us!
              </p>
              <Button asChild size="lg">
                <Link to="/menu">Browse Menu</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-10">
              <TabsTrigger value="active" className="text-base">
                <Clock className="h-5 w-5 mr-2" />
                Active ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="text-base">
                <Package className="h-5 w-5 mr-2" />
                Past ({pastOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6">
              {activeOrders.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-lg text-muted-foreground">
                      No active orders right now
                    </p>
                  </CardContent>
                </Card>
              ) : (
                activeOrders.map((order) => (
                  <OrderCard key={order._id} order={order} />
                ))
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-6">
              {pastOrders.map((order) => (
                <OrderCard key={order._id} order={order} />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}