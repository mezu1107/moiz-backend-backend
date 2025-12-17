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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockRiders, mockOrders, mockUsers } from "@/lib/mockData";
import { Eye } from "lucide-react";
import type { Rider } from "@/lib/mockData";

const Riders = () => {
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);

  const getRiderOrders = (riderId: string) =>
    mockOrders.filter((order) => order.riderId === riderId);

  const getUser = (userId: string) => mockUsers.find((u) => u.id === userId);

  const getStatusColor = (status: Rider["status"]) => {
    const colors = {
      online: "bg-green-100 text-green-800",
      offline: "bg-gray-100 text-gray-800",
      "on-delivery": "bg-blue-100 text-blue-800",
    };
    return colors[status];
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Riders Management</h1>
        <p className="text-sm md:text-base text-muted-foreground">View and manage delivery riders</p>
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">All Riders ({mockRiders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {/* Mobile View */}
          <div className="md:hidden space-y-3 p-4">
            {mockRiders.map((rider) => (
              <Card key={rider.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{rider.name}</p>
                      <Badge className={`${getStatusColor(rider.status)} text-xs`}>
                        {rider.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{rider.phone}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRider(rider)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>{rider.completedOrders} completed</span>
                  <span>Rs. {rider.earnings}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Orders</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRiders.map((rider) => (
                  <TableRow key={rider.id}>
                    <TableCell className="font-medium">{rider.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{rider.email}</p>
                        <p className="text-muted-foreground">{rider.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(rider.status)}>
                        {rider.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{rider.currentOrders.length}</TableCell>
                    <TableCell>{rider.completedOrders}</TableCell>
                    <TableCell>Rs. {rider.earnings}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRider(rider)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rider Details Dialog */}
      <Dialog open={!!selectedRider} onOpenChange={() => setSelectedRider(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Rider Details - {selectedRider?.name}</DialogTitle>
          </DialogHeader>
          {selectedRider && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm md:text-base">Contact Information</h3>
                  <p className="text-xs md:text-sm">Email: {selectedRider.email}</p>
                  <p className="text-xs md:text-sm">Phone: {selectedRider.phone}</p>
                  <p className="text-xs md:text-sm">
                    Status:{" "}
                    <Badge className={getStatusColor(selectedRider.status)}>
                      {selectedRider.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm md:text-base">Performance</h3>
                  <p className="text-xs md:text-sm">
                    Completed Deliveries: {selectedRider.completedOrders}
                  </p>
                  <p className="text-xs md:text-sm">
                    Total Earnings: Rs. {selectedRider.earnings}
                  </p>
                  <p className="text-xs md:text-sm">
                    Current Orders: {selectedRider.currentOrders.length}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-sm md:text-base">Delivery History</h3>
                <div className="space-y-2 max-h-64 md:max-h-96 overflow-y-auto">
                  {getRiderOrders(selectedRider.id).map((order) => {
                    const user = getUser(order.userId);
                    return (
                      <Card key={order.id}>
                        <CardContent className="p-3 md:pt-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                            <div>
                              <p className="font-medium text-sm">{order.id}</p>
                              <p className="text-xs text-muted-foreground">
                                Customer: {user?.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {order.deliveryAddress}
                              </p>
                            </div>
                            <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:text-right">
                              <p className="font-medium text-sm">Rs. {order.total}</p>
                              <Badge className="text-xs">{order.status}</Badge>
                              <p className="text-xs text-muted-foreground hidden sm:block">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 text-xs">
                            <p className="font-medium">Items:</p>
                            {order.items.map((item, idx) => (
                              <p key={idx} className="text-muted-foreground">
                                • {item.menuItem.name} x {item.quantity}
                              </p>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Riders;