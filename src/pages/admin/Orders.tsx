import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockOrders, mockUsers, mockRiders } from "@/lib/mockData";
import { Eye } from "lucide-react";
import type { Order } from "@/lib/mockData";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const Orders = () => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filteredOrders = mockOrders.filter((order) => {
    if (filter === "all") return true;
    return order.status === filter;
  });

  const getUser = (userId: string) => mockUsers.find((u) => u.id === userId);
  const getRider = (riderId?: string) =>
    riderId ? mockRiders.find((r) => r.id === riderId) : null;

  const getStatusColor = (status: Order["status"]) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      preparing: "bg-blue-100 text-blue-800",
      "out-for-delivery": "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status];
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Orders Management</h1>
        <p className="text-sm md:text-base text-muted-foreground">View and manage all customer orders</p>
      </div>

      {/* Filters */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {["all", "pending", "preparing", "out-for-delivery", "delivered", "cancelled"].map(
            (status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                onClick={() => setFilter(status)}
                className="capitalize text-xs md:text-sm"
                size="sm"
              >
                {status === "all" ? "All" : status.replace("-", " ")}
              </Button>
            )
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">All Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {/* Mobile View */}
          <div className="md:hidden space-y-3 p-4">
            {filteredOrders.map((order) => {
              const user = getUser(order.userId);
              const rider = getRider(order.riderId);
              return (
                <Card key={order.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">{order.id}</p>
                      <p className="text-xs text-muted-foreground">{user?.name || "Unknown"}</p>
                    </div>
                    <Badge className={`${getStatusColor(order.status)} text-xs`}>
                      {order.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <p>Rs. {order.total}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} items</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Rider</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const user = getUser(order.userId);
                  const rider = getRider(order.riderId);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{user?.name || "Unknown"}</TableCell>
                      <TableCell>{rider?.name || "Not Assigned"}</TableCell>
                      <TableCell>{order.items.length} items</TableCell>
                      <TableCell>Rs. {order.total}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Order Details - {selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm md:text-base">Customer</h3>
                  <p className="text-sm">{getUser(selectedOrder.userId)?.name}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {getUser(selectedOrder.userId)?.email}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm md:text-base">Rider</h3>
                  <p className="text-sm">{getRider(selectedOrder.riderId)?.name || "Not Assigned"}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {getRider(selectedOrder.riderId)?.phone}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-sm md:text-base">Delivery Address</h3>
                <p className="text-xs md:text-sm">{selectedOrder.deliveryAddress}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-sm md:text-base">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between border-b pb-2 text-sm"
                    >
                      <span>
                        {item.menuItem.name} x {item.quantity}
                      </span>
                      <span>Rs. {item.menuItem.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between border-t pt-2 font-bold text-sm md:text-base">
                <span>Total</span>
                <span>Rs. {selectedOrder.total}</span>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-sm md:text-base">Payment Method</h3>
                <Badge>{selectedOrder.paymentMethod.toUpperCase()}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;