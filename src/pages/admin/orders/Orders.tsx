// src/pages/admin/orders/Orders.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first admin orders list with search, filters, pagination

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Search,
  Package,
  Clock,
  CheckCircle,
  Truck,
  ChefHat,
  XCircle,
  User,
  Phone,
} from 'lucide-react';

import { format } from 'date-fns';

import { useAdminOrders } from '@/features/orders/hooks/useOrders';
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
} as const;

export default function AdminOrders() {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);

  const { data, isLoading } = useAdminOrders({
    status: statusFilter === 'all' ? undefined : statusFilter,
    page,
    limit: 20,
  });

  const orders = data?.orders || [];
  const pagination = data?.pagination;

  // Client-side search (bulletproof)
  const filteredOrders = orders.filter((order) => {
    const searchLower = searchTerm.toLowerCase();

    const shortId = order.shortId?.toString().toLowerCase() || '';
    const customerName = order.customer?.name?.toLowerCase() || '';
    const customerPhone = order.customer?.phone || '';
    const guestName = order.guestInfo?.name?.toLowerCase() || '';
    const guestPhone = order.guestInfo?.phone || '';

    return (
      shortId.includes(searchLower) ||
      customerName.includes(searchLower) ||
      customerPhone.includes(searchTerm) ||
      guestName.includes(searchLower) ||
      guestPhone.includes(searchTerm)
    );
  });

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;

  return (
    <main className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold flex items-center gap-4">
            <Package className="h-10 w-10 md:h-12 md:w-12 text-primary" />
            All Orders
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mt-2">
            Total: {pagination?.total || 0} orders
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by ID, name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 md:h-14 text-base"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-56 h-12 md:h-14">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="pending_payment">Payment Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="out_for_delivery">On the Way</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Orders Table */}
      <Card className="shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl md:text-2xl">Orders List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20">
              <Package className="h-20 w-20 mx-auto mb-6 text-muted-foreground/30" />
              <p className="text-xl text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Placed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const StatusIcon = STATUS_ICONS[order.status] || Clock;
                      const customerName = order.guestInfo?.name || order.customer?.name || 'Guest';
                      const customerPhone = order.guestInfo?.phone || order.customer?.phone || 'N/A';
                      const itemsCount = order.items?.length || 0;
                      const finalAmount = order.finalAmount || 0;
                      const placedAt = order.placedAt ? new Date(order.placedAt) : new Date();

                      return (
                        <TableRow key={order._id} className="hover:bg-muted/50">
                          <TableCell>
                            <Link to={`/admin/orders/${order._id}`} className="font-mono font-bold text-primary hover:underline">
                              #{order.shortId || 'N/A'}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {customerName}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {customerPhone}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-sm md:text-base px-4 py-2 ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-500'} text-white`}>
                              <StatusIcon className="h-4 w-4 mr-1" />
                              {ORDER_STATUS_LABELS[order.status] || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                          </TableCell>
                          <TableCell className="font-bold text-base md:text-lg">
                            Rs. {finalAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(placedAt, 'dd MMM • h:mm a')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" asChild className="h-10">
                              <Link to={`/admin/orders/${order._id}`}>View Details</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-10">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="w-full sm:w-auto"
                  >
                    Previous
                  </Button>
                  <span className="text-base">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="w-full sm:w-auto"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}