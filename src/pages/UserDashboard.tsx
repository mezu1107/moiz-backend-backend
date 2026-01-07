// src/pages/UserDashboard.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first user dashboard with fluid layout, touch-friendly controls

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  User,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Package,
  Clock,
  CheckCircle,
  Truck,
  ChefHat,
  Settings,
  LogOut,
  Star,
  MessageSquare,
  KeyRound,
  History,
} from "lucide-react";

import { toast } from "sonner";
import { format } from "date-fns";

import { useAuthStore } from "@/features/auth/store/authStore";
import { useMyOrders } from "@/features/orders/hooks/useOrders";

interface Order {
  _id: string;
  shortId?: string;
  status: string;
  placedAt: string | Date;
  finalAmount: number;
  review?: boolean | null;
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { data: ordersData = [], isLoading: ordersLoading } = useMyOrders();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/");
  };


  const allOrders = ordersData;
  const recentOrders = allOrders.slice(0, 6);

  // Now fully typed — review field exists!
  const deliveredOrders = allOrders.filter((o) => o.status === "delivered");
  const pendingReviewsCount = deliveredOrders.filter((o) => !o.review).length;
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "confirmed":
        return <Clock className="h-5 w-5" />;
      case "preparing":
        return <ChefHat className="h-5 w-5" />;
      case "out_for_delivery":
        return <Truck className="h-5 w-5" />;
      case "delivered":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "out_for_delivery":
        return "bg-blue-100 text-blue-800";
      case "preparing":
        return "bg-orange-100 text-orange-800";
      case "pending":
      case "confirmed":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      {/* Hero Welcome */}
      <section className="bg-gradient-to-r from-orange-500 to-amber-600 py-16 md:py-20 lg:py-24">
        <div className="container mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-4">
              Welcome back, {user.name.split(" ")[0]}!
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl opacity-90 max-w-3xl mx-auto">
              Manage your orders, reviews, and profile all in one place
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 lg:py-16 max-w-7xl">
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left Sidebar */}
          <aside className="space-y-8">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-2xl overflow-hidden">
                <div className="h-32 md:h-40 bg-gradient-to-r from-orange-500 to-amber-600" />
                <div className="relative px-6 pb-8 -mt-16 md:-mt-20">
                  <div className="w-28 h-28 md:w-36 md:h-36 mx-auto rounded-full bg-white p-2 shadow-2xl">
                    <div className="w-full h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-600 flex items-center justify-center text-5xl md:text-7xl font-black text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  <div className="text-center mt-6">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-black">{user.name}</h2>
                    <Badge variant="secondary" className="mt-3 text-base md:text-lg px-6 py-2">
                      Valued Customer
                    </Badge>
                  </div>

                  <Separator className="my-8" />

                  <div className="space-y-5 text-base md:text-lg">
                    <div className="flex items-center gap-4">
                      <Phone className="h-6 w-6 text-orange-600" />
                      <span>{user.phone}</span>
                    </div>
                    {user.email && (
                      <div className="flex items-center gap-4">
                        <Mail className="h-6 w-6 text-orange-600" />
                        <span>{user.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <MapPin className="h-6 w-6 text-orange-600" />
                      <span className="capitalize">{user.city?.toLowerCase() || 'N/A'}</span>
                    </div>
                  </div>

                  <Separator className="my-8" />

                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full justify-start h-12 md:h-14 text-base md:text-lg"
                      onClick={() => navigate("/profile")}
                    >
                      <User className="mr-3 h-6 w-6" />
                      Edit Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full justify-start h-12 md:h-14 text-base md:text-lg"
                      onClick={() => navigate("/addresses")}
                    >
                      <MapPin className="mr-3 h-6 w-6" />
                      Saved Addresses
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full justify-start h-12 md:h-14 text-base md:text-lg"
                      onClick={() => navigate("/orders")}
                    >
                      <History className="mr-3 h-6 w-6" />
                      Order History
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full justify-start h-12 md:h-14 text-base md:text-lg"
                      onClick={() => navigate("/reviews")}
                    >
                      <Star className="mr-3 h-6 w-6" />
                      My Reviews & Ratings
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full justify-start h-12 md:h-14 text-base md:text-lg"
                      onClick={() => navigate("/change-password")}
                    >
                      <KeyRound className="mr-3 h-6 w-6" />
                      Change Password
                    </Button>
                    <Button
                      variant="destructive"
                      size="lg"
                      className="w-full justify-start h-12 md:h-14 text-base md:text-lg mt-6"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-3 h-6 w-6" />
                      Logout
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Pending Reviews Reminder */}
            {pendingReviewsCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-orange-300 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                      <MessageSquare className="h-8 w-8 text-orange-600" />
                      Help Others Choose!
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base md:text-lg mb-6">
                      You have <strong>{pendingReviewsCount}</strong> delivered order(s) waiting for your review.
                    </p>
                    <Button
                      size="lg"
                      className="w-full h-12 md:h-14 text-base md:text-lg bg-orange-600 hover:bg-orange-700"
                      onClick={() => navigate("/orders")}
                    >
                      <Star className="mr-2 h-5 w-5" />
                      Write Reviews Now
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </aside>

          {/* Right Side: Stats & Orders */}
          <section className="lg:col-span-2 space-y-10">
            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              <Card className="text-center p-6 md:p-8 shadow-xl">
                <ShoppingBag className="h-12 w-12 md:h-14 md:w-14 mx-auto text-orange-600 mb-4" />
                <p className="text-3xl md:text-4xl font-black">{allOrders.length}</p>
                <p className="text-muted-foreground text-base md:text-lg">Total Orders</p>
              </Card>
              <Card className="text-center p-6 md:p-8 shadow-xl">
                <Clock className="h-12 w-12 md:h-14 md:w-14 mx-auto text-amber-600 mb-4" />
                <p className="text-3xl md:text-4xl font-black">
                  {allOrders.filter((o) => ["pending", "confirmed", "preparing"].includes(o.status)).length}
                </p>
                <p className="text-muted-foreground text-base md:text-lg">Active</p>
              </Card>
              <Card className="text-center p-6 md:p-8 shadow-xl">
                <Truck className="h-12 w-12 md:h-14 md:w-14 mx-auto text-blue-600 mb-4" />
                <p className="text-3xl md:text-4xl font-black">
                  {allOrders.filter((o) => o.status === "out_for_delivery").length}
                </p>
                <p className="text-muted-foreground text-base md:text-lg">On the Way</p>
              </Card>
              <Card className="text-center p-6 md:p-8 shadow-xl">
                <CheckCircle className="h-12 w-12 md:h-14 md:w-14 mx-auto text-green-600 mb-4" />
                <p className="text-3xl md:text-4xl font-black">
                  {allOrders.filter((o) => o.status === "delivered").length}
                </p>
                <p className="text-muted-foreground text-base md:text-lg">Delivered</p>
              </Card>
            </motion.div>

            {/* Recent Orders */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl md:text-3xl font-bold flex items-center gap-4">
                    <ShoppingBag className="h-8 w-8 md:h-10 md:w-10 text-orange-600" />
                    Recent Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="space-y-6">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-28 bg-muted/30 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : recentOrders.length === 0 ? (
                    <div className="text-center py-20">
                      <Package className="h-20 w-20 md:h-24 md:w-24 mx-auto text-muted-foreground mb-6 opacity-50" />
                      <h3 className="text-2xl md:text-3xl font-bold mb-4">No orders yet!</h3>
                      <p className="text-base md:text-lg text-muted-foreground mb-8">
                        Start your delicious journey with Al Tawakkalfoods
                      </p>
                      <Button
                        size="lg"
                        className="h-12 md:h-14 text-base md:text-lg bg-orange-600 hover:bg-orange-700 px-10"
                        onClick={() => navigate("/menu/all")}
                      >
                        Browse Menu
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {recentOrders.map((order) => (
                        <motion.div
                          key={order._id}
                          whileHover={{ scale: 1.02 }}
                          className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-200 shadow-lg hover:shadow-xl transition-all"
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                            <div>
                              <div className="flex flex-wrap items-center gap-4 mb-3">
                                <h4 className="text-xl md:text-2xl font-black">
                                  #{order.shortId || order._id.slice(-6).toUpperCase()}
                                </h4>
                                <Badge className={`text-sm md:text-base px-4 py-2 ${getStatusColor(order.status)}`}>
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(order.status)}
                                    {order.status.replace("_", " ").charAt(0).toUpperCase() + order.status.replace("_", " ").slice(1)}
                                  </div>
                                </Badge>
                                {order.status === "delivered" && !order.review && (
                                  <Badge variant="outline" className="border-orange-600 text-orange-600 text-sm md:text-base">
                                    <Star className="h-4 w-4 mr-1" />
                                    Review Pending
                                  </Badge>
                                )}
                              </div>
                              <p className="text-base md:text-lg text-muted-foreground">
                                {format(new Date(order.placedAt), "PPP 'at' p")}
                              </p>
                              <p className="text-xl md:text-2xl font-bold mt-2">
                                Rs. {order.finalAmount.toLocaleString()}
                              </p>
                            </div>
                            <div className="flex flex-col gap-3 md:text-right">
                              <Button
                                size="lg"
                                className="h-12 md:h-14 text-base md:text-lg bg-orange-600 hover:bg-orange-700"
                                onClick={() => navigate(`/track/${order._id}`)}
                              >
                                Track Order
                              </Button>
                              {order.status === "delivered" && !order.review && (
                                <Button
                                  variant="outline"
                                  size="lg"
                                  className="h-12 md:h-14 text-base md:text-lg"
                                  onClick={() => navigate("/orders")}
                                >
                                  <Star className="mr-2 h-5 w-5" />
                                  Rate & Review
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      {allOrders.length > 6 && (
                        <div className="text-center mt-8">
                          <Button
                            size="lg"
                            variant="outline"
                            className="h-12 md:h-14 text-base md:text-lg"
                            onClick={() => navigate("/orders")}
                          >
                            View All Orders
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </section>
        </div>
      </div>
    </main>
  );
}