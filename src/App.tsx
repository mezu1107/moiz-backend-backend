// src/App.tsx
// FINAL PRODUCTION — January 07, 2026
// Complete routing for Al Tawakkal Foods Pakistan
// Using React Router Data API (createBrowserRouter) with v7 future flags

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";

import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import { SocketProvider } from '@/context/SocketContext';

// Layouts
import { PublicLayout } from "./components/PublicLayout";
import AdminLayout from "./components/admin/AdminLayout";
import RiderLayout from "./components/rider/RiderLayout";
import { KitchenLayout } from "./components/KitchenLayout";

// Public Pages
import Index from "./pages/Index";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOtp from "./pages/VerifyOtp";
import ResetPassword from "./pages/ResetPassword";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Portfolio from "./pages/Portfolio";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import UserDashboard from "./pages/UserDashboard";
import ChangePassword from "./pages/ChangePassword";

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

// Admin Pages
import AdminOrders from "./pages/admin/orders/Orders";
import AdminOrderDetails from "./pages/admin/orders/OrderDetails";
import AdminDeals from "./pages/admin/Deals";
import AdminMenuPage from "./features/menu/pages/AdminMenuPage";
import EditMenuItemPage from "@/features/menu/pages/EditMenuItemPage";
import AdminAreasList from "./pages/admin/areas/AreasList";
import AdminAddArea from "./pages/admin/areas/AddArea";
import AddDeliveryZone from "./pages/admin/areas/AddDeliveryZone";
import AdminEditArea from "./pages/admin/areas/EditArea";
import ContactMessagesPage from "./pages/admin/contact/ContactMessagesPage";
import { CustomerList } from "./features/customers/admin/customers/CustomerList";
import { StaffList } from "./components/admin/staff/StaffList";
import { InventoryList } from "./components/admin/inventory/InventoryList";
import AnalyticsPage from "./features/analytics/AnalyticsPage";

// Reviews
import CustomerReviewsPage from "./features/reviews/pages/CustomerReviewsPage";
import AdminReviewsDashboard from "./features/reviews/pages/AdminReviewsDashboard";

// Kitchen
import KitchenDashboard from "./pages/kitchen/KitchenDashboard";
import KitchenDisplay from "./pages/kitchen/KitchenDisplay";

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

// Define router with v7 future flags to silence deprecation warnings
const router = createBrowserRouter(
  [
    {
      element: <PublicLayout />,
      children: [
        { path: "/", element: <Index /> },
        {
          path: "/home",
          element: <Home />, // openAreaChecker will be passed via context or props if needed
        },

        // Menu
        { path: "/menu", element: <MenuPage /> },
        { path: "/menu/all", element: <MenuAllPage /> },
        { path: "/menu/filters", element: <MenuFiltersPage /> },
        { path: "/menu/area/:areaId", element: <MenuByLocationPage /> },

        // Cart & Checkout
        { path: "/cart", element: <CartPage /> },
        { path: "/checkout", element: <CheckoutPage /> },
        { path: "/checkout/card", element: <CardPaymentPage /> },
        { path: "/checkout/bank-transfer", element: <BankTransferPage /> },

        // Orders
        { path: "/orders", element: <OrdersPage /> },
        { path: "/track/:orderId", element: <OrderTrackingPage /> },
        { path: "/order/:orderId/refund", element: <OrderRefundRequestPage /> },

        // Address
        { path: "/addresses", element: <AddressListPage /> },

        // Auth & Info
        { path: "/login", element: <Login /> },
        { path: "/register", element: <Register /> },
        { path: "/forgot-password", element: <ForgotPassword /> },
        { path: "/verify-otp", element: <VerifyOtp /> },
        { path: "/reset-password", element: <ResetPassword /> },
        { path: "/about", element: <About /> },
        { path: "/contact", element: <Contact /> },
        { path: "/portfolio", element: <Portfolio /> },

        // Public Reviews
        { path: "/reviews", element: <CustomerReviewsPage /> },

        // User Profile
        { path: "/profile", element: <Profile /> },
        { path: "/dashboard", element: <UserDashboard /> },
        { path: "/change-password", element: <ChangePassword /> },

        // Debug
        { path: "/debug-api", element: <DebugAPI /> },
      ],
    },

    // Admin Routes
    {
      path: "/admin",
      element: <AdminLayout />,
      children: [
        { path: "deals", element: <AdminDeals /> },
        { path: "menu", element: <AdminMenuPage /> },
        { path: "menu/edit/:id", element: <EditMenuItemPage /> },
        { path: "areas", element: <AdminAreasList /> },
        { path: "areas/add", element: <AdminAddArea /> },
        { path: "areas/edit/:id", element: <AdminEditArea /> },
        { path: "delivery-zones", element: <AddDeliveryZone /> },
        { path: "orders", element: <AdminOrders /> },
        { path: "orders/:orderId", element: <AdminOrderDetails /> },
        { path: "contact", element: <ContactMessagesPage /> },
        { path: "customers", element: <CustomerList /> },
        { path: "staff", element: <StaffList /> },
        { path: "inventory", element: <InventoryList /> },
        { path: "analytics", element: <AnalyticsPage /> },
        { path: "reviews", element: <AdminReviewsDashboard /> },
        { path: "kitchen", element: <KitchenDisplay /> },
      ],
    },

    // Kitchen Dashboard (Separate Layout)
    {
      path: "/kitchen",
      element: <KitchenLayout />,
      children: [
        { index: true, element: <KitchenDashboard /> },
      ],
    },

    // Rider (Future)
    {
      path: "/rider",
      element: <RiderLayout />,
      children: [
        // Add rider routes later
      ],
    },

    // 404
    {
      path: "*",
      element: <NotFound />,
    },
  ],
  {
    
  }
);

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <SocketProvider>
            {/* Replace BrowserRouter + Routes with RouterProvider */}
            <RouterProvider router={router} />
          </SocketProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}