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
import { KitchenLayout } from "./components/KitchenLayout"; // ← ADD THIS

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
import ContactMessagesPage from "./pages/admin/contact/ContactMessagesPage";


// Kitchen
import KitchenDashboard from "./pages/kitchen/KitchenDashboard";

// Rider
import RiderLogin from "./pages/rider/Login";
import RiderDashboard from "./pages/rider/Dashboard";
import RiderDeliveries from "./pages/rider/Deliveries";

// Debug
import DebugAPI from "./pages/DebugAPI";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
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

                <Route path="/menu" element={<MenuPage />} />
                <Route path="/menu/all" element={<MenuAllPage />} />
                <Route path="/menu/filters" element={<MenuFiltersPage />} />
                <Route path="/menu/area/:areaId" element={<MenuByLocationPage />} />

                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/checkout/card" element={<CardPaymentPage />} />
                <Route path="/checkout/bank-transfer" element={<BankTransferPage />} />

                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/track/:orderId" element={<OrderTrackingPage />} />
                <Route path="/order/:orderId/refund" element={<OrderRefundRequestPage />} />

                <Route path="/addresses" element={<AddressListPage />} />

                <Route path="/login" element={<Login />} />

                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/portfolio" element={<Portfolio />} />

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
                <Route path="areas/edit/:id" element={<AdminEditArea />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="orders/:orderId" element={<AdminOrderDetails />} />
                <Route path="contact" element={<ContactMessagesPage />} />
              </Route>

              {/* ====================== KITCHEN ROUTES ====================== */}
              <Route element={<KitchenLayout />}>
                <Route path="/kitchen" element={<KitchenDashboard />} />
                {/* Add more kitchen routes here in the future */}
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