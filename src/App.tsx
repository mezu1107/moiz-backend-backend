// src/App.tsx
// FINAL PRODUCTION — DECEMBER 17, 2025
// Complete routing for FoodExpress Pakistan

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// Layouts
import { PublicLayout } from "./components/PublicLayout";
import AdminLayout from "./components/admin/AdminLayout";
import RiderLayout from "./components/rider/RiderLayout";

// Public Pages
import Index from "./pages/Index";
import Home from "./pages/Home";
import Login from "./pages/Login";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Portfolio from "./pages/Portfolio";
import NotFound from "./pages/NotFound";

// Menu
import MenuPage from "./features/menu/pages/MenuPage";
import MenuAllPage from "./features/menu/pages/MenuAllPage";
import MenuFiltersPage from "./features/menu/pages/MenuFiltersPage";
import MenuByLocationPage from "@/features/menu/pages/MenuByLocation";

// Cart & Checkout
import CartPage from "@/features/cart/pages/Cart";
import CheckoutPage from "@/features/orders/pages/CheckoutPage";
import BankTransferPage from "@/features/orders/pages/BankTransferPage";
import CardPaymentPage from "@/features/orders/pages/CardPaymentPage";

// Orders
import OrdersPage from "@/features/orders/pages/OrdersPage";
import OrderTrackingPage from "@/features/orders/pages/OrderTrackingPage";
import OrderRefundRequestPage from "@/features/orders/pages/OrderRefundRequestPage";

// Address
import AddressListPage from "@/features/address/pages/AddressListPage";

// Admin
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminOrders from "./pages/admin/orders/Orders";
import AdminOrderDetails from "./pages/admin/orders/OrderDetails";

import AdminUsers from "./pages/admin/Users";
import AdminRiders from "./pages/admin/Riders";
import AdminDeals from "./pages/admin/Deals";
import AdminMenuPage from "./features/menu/pages/AdminMenuPage";
import EditMenuItemPage from "@/features/menu/pages/EditMenuItemPage";
import AdminAreasList from "./pages/admin/areas/AreasList";
import AdminAddArea from "./pages/admin/areas/AddArea";
import AdminEditArea from "./pages/admin/areas/EditArea";

// Rider
import RiderLogin from "./pages/rider/Login";
import RiderDashboard from "./pages/rider/Dashboard";
import RiderDeliveries from "./pages/rider/Deliveries";

// Debug
import DebugAPI from "./pages/DebugAPI";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const openAreaChecker = () => {
    sessionStorage.removeItem("selectedArea");
    sessionStorage.removeItem("areaCheckedAt");
    window.location.href = "/";
  };

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <BrowserRouter>
            <Routes>
              {/* ====================== PUBLIC ROUTES ====================== */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/home" element={<Home openAreaChecker={openAreaChecker} />} />

                {/* Menu */}
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/menu/all" element={<MenuAllPage />} />
                <Route path="/menu/filters" element={<MenuFiltersPage />} />
                <Route path="/menu/area/:areaId" element={<MenuByLocationPage />} />

                {/* Cart & Checkout */}
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />

                {/* Payment Pages */}
                <Route path="/checkout/card" element={<CardPaymentPage />} />
                <Route path="/checkout/bank-transfer" element={<BankTransferPage />} />

                {/* Orders */}
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/track/:orderId" element={<OrderTrackingPage />} />
                <Route path="/order/:orderId/refund" element={<OrderRefundRequestPage />} />

                {/* Address */}
                <Route path="/addresses" element={<AddressListPage />} />

                {/* Auth */}
                <Route path="/login" element={<Login />} />

                {/* Static */}
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/portfolio" element={<Portfolio />} />

                {/* Debug */}
                <Route path="/debug-api" element={<DebugAPI />} />
              </Route>

              {/* ====================== ADMIN ROUTES ====================== */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="riders" element={<AdminRiders />} />
                <Route path="deals" element={<AdminDeals />} />
                <Route path="menu" element={<AdminMenuPage />} />
                <Route path="menu/edit/:id" element={<EditMenuItemPage />} />
                <Route path="areas" element={<AdminAreasList />} />
                <Route path="areas/add" element={<AdminAddArea />} />
                {/* Fixed: Changed :areaId → :id to match useParams<{ id: string }>() in EditArea */}
                <Route path="areas/edit/:id" element={<AdminEditArea />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="orders/:orderId" element={<AdminOrderDetails />} />
              </Route>

              {/* ====================== RIDER ROUTES ====================== */}
              <Route path="/rider/login" element={<RiderLogin />} />
              <Route path="/rider" element={<RiderLayout />}>
                <Route index element={<RiderDashboard />} />
                <Route path="deliveries" element={<RiderDeliveries />} />
              </Route>

              {/* ====================== 404 ====================== */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}