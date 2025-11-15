import { useState, useEffect } from "react";
import { Package, MapPin, Phone, User, CheckCircle, Clock, Navigation } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { mockOrders, mockUsers } from "@/lib/mockData";
import { toast } from "sonner";
import { Order } from "@/lib/mockData";

const RiderDeliveries = () => {
  const { currentUser, updateOrderStatus } = useStore();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Get orders assigned to current rider
  const riderOrders = mockOrders.filter((order) => {
    return ["order1", "order2", "order3", "ORD-001", "ORD-002"].includes(order.id);
  });

  const activeOrders = riderOrders.filter(o => 
    o.status === "preparing" || o.status === "out-for-delivery"
  );
  const completedOrders = riderOrders.filter(o => o.status === "delivered");
  const allDeliveries = [...activeOrders, ...completedOrders];

  useEffect(() => {
    // Listen for order updates and show toast notifications
    const handleOrderUpdate = () => {
      toast.success("New order assigned!", {
        description: "Check your deliveries list for details",
      });
    };

    // Simulating real-time updates
    const interval = setInterval(() => {
      const hasNewOrders = Math.random() > 0.95;
      if (hasNewOrders) {
        handleOrderUpdate();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = (orderId: string, status: Order["status"]) => {
    updateOrderStatus(orderId, status);
    toast.success(`Order status updated to ${status}`, {
      description: `Order ${orderId} is now ${status}`,
    });
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "preparing": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "out-for-delivery": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "delivered": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "cancelled": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getCustomer = (userId: string) => {
    return mockUsers.find(u => u.id === userId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{activeOrders.length}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{completedOrders.length}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{allDeliveries.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* All Deliveries List */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">All Deliveries</CardTitle>
          <CardDescription>Complete history of your delivery orders</CardDescription>
        </CardHeader>
        <CardContent>
          {allDeliveries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No deliveries found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allDeliveries.map((order) => {
                const customer = getCustomer(order.userId);
                const isActive = order.status === "preparing" || order.status === "out-for-delivery";
                
                return (
                  <Card key={order.id} className={`border ${isActive ? 'border-primary/50 shadow-lg' : 'border-border'}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">Order #{order.id}</h3>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            Rs. {order.total.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Customer Info */}
                      {customer && (
                        <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <span className="font-medium">{customer.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary" />
                            <span className="text-sm">{customer.phone}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-primary mt-0.5" />
                            <span className="text-sm">{order.deliveryAddress}</span>
                          </div>
                        </div>
                      )}

                      {/* Order Items */}
                      <div className="border-t pt-4 mb-4">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Order Items
                        </h4>
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.menuItem.name}</span>
                              <span className="text-muted-foreground">
                                Rs. {(item.menuItem.price * item.quantity).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons for Active Orders */}
                      {isActive && (
                        <div className="flex gap-2">
                          {order.status === "preparing" && (
                            <Button 
                              onClick={() => handleStatusUpdate(order.id, "out-for-delivery")}
                              className="flex-1"
                              size="sm"
                            >
                              <Navigation className="h-4 w-4 mr-2" />
                              Start Delivery
                            </Button>
                          )}
                          {order.status === "out-for-delivery" && (
                            <Button 
                              onClick={() => handleStatusUpdate(order.id, "delivered")}
                              className="flex-1"
                              size="sm"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark as Delivered
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RiderDeliveries;
