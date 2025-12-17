import { useState, useEffect } from "react";
import { Package, MapPin, Phone, DollarSign, Clock, User, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { mockOrders, mockUsers } from "@/lib/mockData";
import { toast } from "sonner";
import { Order } from "@/lib/mockData";

const RiderDashboard = () => {
  const { currentUser, updateOrderStatus } = useStore();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Get orders assigned to current rider (mock - using rider ID from user)
  const riderOrders = mockOrders.filter((order) => {
    // In a real app, this would check order.riderId === currentUser?.id
    // For demo, showing some orders
    return ["order1", "order2", "order3", "ORD-001", "ORD-002"].includes(order.id);
  });

  const activeOrders = riderOrders.filter(o => o.status === "preparing" || o.status === "out-for-delivery");
  const completedOrders = riderOrders.filter(o => o.status === "delivered");

  // Real-time order notifications
  useEffect(() => {
    const handleNewOrder = () => {
      toast.success("New order assigned!", {
        description: "You have a new delivery ready to pick up",
        duration: 5000,
      });
    };

    // Simulate real-time notifications (in production, this would use WebSocket/Supabase Realtime)
    const interval = setInterval(() => {
      const hasNewOrders = Math.random() > 0.95; // 5% chance every 10 seconds
      if (hasNewOrders && activeOrders.length > 0) {
        handleNewOrder();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [activeOrders.length]);

  const handleStatusUpdate = (orderId: string, status: Order["status"]) => {
    updateOrderStatus(orderId, status);
    toast.success(`Order status updated!`, {
      description: `Order ${orderId} is now ${status}`,
    });
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      case "preparing": return "bg-blue-500/10 text-blue-500";
      case "out-for-delivery": return "bg-purple-500/10 text-purple-500";
      case "delivered": return "bg-green-500/10 text-green-500";
      case "cancelled": return "bg-red-500/10 text-red-500";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  const getCustomer = (userId: string) => {
    return mockUsers.find(u => u.id === userId);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Active Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{activeOrders.length}</div>
            <p className="text-xs text-muted-foreground">Orders in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{completedOrders.length}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">
              Rs. {completedOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">From completed orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Orders */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">Active Deliveries</CardTitle>
          <CardDescription className="text-xs md:text-sm">Orders currently assigned to you</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          {activeOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active deliveries at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => {
                const customer = getCustomer(order.userId);
                return (
                  <Card key={order.id} className="border-2">
                    <CardContent className="p-4 md:pt-6">
                      <div className="space-y-4">
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-semibold text-sm md:text-base">Order #{order.id}</h3>
                              <Badge className={`${getStatusColor(order.status)} text-xs`}>
                                {order.status.replace("_", " ")}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-xl md:text-2xl font-bold">Rs. {order.total.toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="grid gap-2 md:gap-3 p-3 md:p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{customer?.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs md:text-sm">{customer?.phone}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <span className="text-xs md:text-sm">{order.deliveryAddress}</span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-2">
                          <p className="text-xs md:text-sm font-medium">Order Items:</p>
                          <div className="space-y-1">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="text-xs md:text-sm flex justify-between">
                                <span>{item.menuItem.name} x{item.quantity}</span>
                                <span>Rs. {(item.menuItem.price * item.quantity).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t">
                          {order.status === "preparing" && (
                            <Button 
                              onClick={() => handleStatusUpdate(order.id, "out-for-delivery")}
                              className="flex-1 text-sm"
                              size="sm"
                            >
                              Mark as Picked Up
                            </Button>
                          )}
                          {order.status === "out-for-delivery" && (
                            <Button 
                              onClick={() => handleStatusUpdate(order.id, "delivered")}
                              className="flex-1 text-sm"
                              size="sm"
                            >
                              Mark as Delivered
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Completed Deliveries</CardTitle>
            <CardDescription className="text-xs md:text-sm">Recently completed orders</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="space-y-2">
              {completedOrders.map((order) => {
                const customer = getCustomer(order.userId);
                return (
                  <div key={order.id} className="flex items-center justify-between p-3 md:p-4 border rounded-lg">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">Order #{order.id}</p>
                        <p className="text-xs text-muted-foreground truncate">{customer?.name}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-sm">Rs. {order.total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RiderDashboard;