// src/pages/admin/orders/Orders.tsx
// PRODUCTION-READY — DECEMBER 16, 2025
// Admin Orders List with bulletproof search, filters, and pagination

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  confirmed: CheckCircle,
  preparing: ChefHat,
  out_for_delivery: Truck,
  delivered: Package,
  cancelled: XCircle,
  rejected: XCircle,
  pending_payment: Clock,
} as const;

export default function AdminOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminOrders({
    status: statusFilter === 'all' ? undefined : statusFilter,
    page,
    limit: 20,
  });

  const orders = data?.orders || [];
  const pagination = data?.pagination;

  // Bulletproof filter
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            All Orders
          </h1>
          <p className="text-muted-foreground mt-1">
            Total: {pagination?.total || 0} orders
          </p>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
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
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">No orders found</p>
            </div>
          ) : (
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
                          <Link to={`/admin/orders/${order._id}`} className="font-mono font-bold text-primary">
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
                          <Badge className={`${ORDER_STATUS_COLORS[order.status] || 'bg-gray-500'} text-white`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {ORDER_STATUS_LABELS[order.status] || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                        </TableCell>
                        <TableCell className="font-bold">
                          Rs. {finalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(placedAt, 'dd MMM • h:mm a')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" asChild>
                            <Link to={`/admin/orders/${order._id}`}>View Details</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total > pagination.limit && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {page} of {Math.ceil(pagination.total / pagination.limit)}
              </span>
              <Button
                variant="outline"
                disabled={page >= Math.ceil(pagination.total / pagination.limit)}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
