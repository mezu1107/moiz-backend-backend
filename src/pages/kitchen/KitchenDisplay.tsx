// src/features/kitchen/pages/KitchenDisplay.tsx
// FINAL PRODUCTION — DECEMBER 28, 2025 (Responsive Only)

import { useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChefHat, Clock } from 'lucide-react';
import { toast } from 'sonner';

import {
  useAdminOrders,
  useUpdateOrderStatus,
} from '@/features/orders/hooks/useOrders';
import { useOrderSocket } from '@/features/orders/hooks/useOrderSocket';

type Order = any;

export default function KitchenDisplay() {
  const { data, isLoading, refetch } = useAdminOrders({
    status: 'pending,confirmed,preparing',
  });

  const updateStatus = useUpdateOrderStatus();
  useOrderSocket();

  const { newOrders, preparingOrders } = useMemo(() => {
    const orders = data?.orders || [];
    return {
      newOrders: orders.filter(
        (o: Order) => o.status === 'pending' || o.status === 'confirmed'
      ),
      preparingOrders: orders.filter((o: Order) => o.status === 'preparing'),
    };
  }, [data]);

  const handleStatusChange = useCallback(
    (orderId: string, nextStatus: 'preparing' | 'out_for_delivery') => {
      updateStatus.mutate(
        { orderId, status: nextStatus },
        {
          onSuccess: () =>
            toast.success(
              nextStatus === 'preparing'
                ? 'Started preparing'
                : 'Marked as ready'
            ),
        }
      );
    },
    [updateStatus]
  );

  useEffect(() => {
    const onVisible = () => !document.hidden && refetch();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
        <Loader2 className="h-16 w-16 animate-spin text-rose-600" />
        <span className="sr-only">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      {/* Mobile-first padding & max-width container */}
      <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header - responsive typography & spacing */}
        <header className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <ChefHat className="h-10 w-10 sm:h-12 sm:w-12 text-rose-600 flex-shrink-0" />
            <span>Kitchen Display</span>
          </h1>
          <p className="mt-3 text-lg sm:text-xl lg:text-2xl text-slate-700">
            Live orders • Real-time updates
          </p>
        </header>

        {/* Responsive grid: 1 column on small screens, 2 columns from lg+ */}
        <div className="grid gap-8 lg:gap-12 lg:grid-cols-2">
          {/* NEW ORDERS */}
          <Section
            title={`New Orders (${newOrders.length})`}
            icon={<Clock className="h-7 w-7 sm:h-8 sm:w-8 text-orange-600" />}
            emptyTitle="No new orders"
            emptySub="Waiting for customers..."
          >
            {newOrders.map((order: Order) => (
              <OrderCard
                key={order._id}
                order={order}
                headerBg="bg-orange-100"
                actionLabel="Start Preparing"
                actionColor="bg-orange-600 hover:bg-orange-700"
                onAction={() => handleStatusChange(order._id, 'preparing')}
                loading={updateStatus.isPending}
              />
            ))}
          </Section>

          {/* PREPARING */}
          <Section
            title={`Preparing (${preparingOrders.length})`}
            icon={<ChefHat className="h-7 w-7 sm:h-8 sm:w-8 text-purple-700" />}
            emptyTitle="Nothing preparing"
            emptySub="All caught up!"
          >
            {preparingOrders.map((order: Order) => (
              <OrderCard
                key={order._id}
                order={order}
                headerBg="bg-purple-100"
                actionLabel="Ready for Pickup / Delivery"
                variant="secondary"
                onAction={() => handleStatusChange(order._id, 'out_for_delivery')}
                loading={updateStatus.isPending}
              />
            ))}
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- */
/* Reusable Components                */
/* ---------------------------------- */

function Section({
  title,
  icon,
  emptyTitle,
  emptySub,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  emptyTitle: string;
  emptySub: string;
  children?: React.ReactNode;
}) {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0);

  return (
    <section>
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 flex items-center gap-3 text-slate-900">
        {icon}
        {title}
      </h2>

      {isEmpty ? (
        <Card className="border-2 border-dashed border-slate-300 bg-white/80">
          <CardContent className="py-16 sm:py-20 text-center">
            <p className="text-xl sm:text-2xl font-semibold text-slate-700">
              {emptyTitle}
            </p>
            <p className="mt-3 text-base sm:text-lg text-slate-600">{emptySub}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">{children}</div>
      )}
    </section>
  );
}

function OrderCard({
  order,
  headerBg,
  actionLabel,
  actionColor,
  variant,
  onAction,
  loading,
}: {
  order: Order;
  headerBg: string;
  actionLabel: string;
  actionColor?: string;
  variant?: 'default' | 'secondary';
  onAction: () => void;
  loading: boolean;
}) {
  return (
    <Card className="overflow-hidden border shadow-sm hover:shadow-lg transition-shadow duration-300 bg-white/90">
      <CardHeader className={`p-4 sm:p-6 ${headerBg}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900">
            #{order._id.slice(-6).toUpperCase()}
          </CardTitle>
          <Badge className="text-base sm:text-lg px-3 py-1 bg-slate-800 text-white">
            {order.items.length} items
          </Badge>
        </div>

        {(order.guestInfo || order.customer) && (
          <p className="text-sm sm:text-base text-slate-700 mt-2">
            {order.guestInfo?.name || order.customer?.name} •{' '}
            {order.guestInfo?.phone || order.customer?.phone}
          </p>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-5">
        <div className="space-y-3 mb-6">
          {order.items.map((item: any, idx: number) => (
            <div
              key={item._id || idx}
              className="flex justify-between items-center text-base sm:text-lg text-slate-900 pb-2 border-b border-slate-200 last:border-0"
            >
              <span>
                <strong className="text-rose-600">{item.quantity}×</strong>{' '}
                {item.menuItem?.name || item.name}
              </span>
            </div>
          ))}
        </div>

        {order.instructions && (
          <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg mb-6">
            <p className="font-semibold text-slate-900 text-sm sm:text-base">
              Special Instructions
            </p>
            <p className="italic text-slate-800 mt-1 text-sm sm:text-base">
              "{order.instructions}"
            </p>
          </div>
        )}

        {/* Large touch-friendly button */}
        <Button
          size="lg"
          variant={variant}
          className={`w-full h-14 text-lg sm:text-xl font-medium ${actionColor || ''}`}
          onClick={onAction}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              Processing...
            </>
          ) : (
            actionLabel
          )}
        </Button>
      </CardContent>
    </Card>
  );
}