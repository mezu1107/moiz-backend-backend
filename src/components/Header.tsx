// src/components/Header.tsx
// FINAL PRODUCTION HEADER — FULLY RESPONSIVE (320px → 4K)
// Warm Pakistani-inspired design with saffron-orange accents, matching Home & Footer

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  User,
  Menu,
  LogOut,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import ServiceAreaModal from "@/components/ServiceAreaModal";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCartStore } from "@/features/cart/hooks/useCartStore";
import { useServerCartQuery } from "@/features/cart/hooks/useServerCart";

export const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const guestCart = useCartStore();
  const { data: cartData } = useServerCartQuery();

  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [areaModalOpen, setAreaModalOpen] = useState<boolean>(false);

  const isLoggedIn = !!user;

  // Cart item count for badge (guest or authenticated)
  const cartCount = useMemo<number>(() => {
    const items = isLoggedIn ? cartData?.items ?? [] : guestCart.items;
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [isLoggedIn, cartData?.items, guestCart.items]);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate("/");
  };

  return (
    <>
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b border-orange-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">

            {/* Logo & Brand */}
            <Link to="/" className="flex items-center gap-3">
              {/* Real logo image */}
              <div className="relative h-11 w-11 overflow-hidden rounded-full bg-white shadow-lg ring-2 ring-orange-300">
                <img
                  src="/logo.jpeg"
                  alt="AlTawakkalfoods Logo"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Brand text: hidden on mobile, visible from sm+ */}
              <div className="hidden sm:block">
                <h1 className="font-bold text-xl leading-tight text-orange-700">
                  AlTawakkalfoods
                </h1>
                <p className="text-xs text-amber-800">Authentic Pakistani Cuisine</p>
              </div>
            </Link>

            {/* Desktop Navigation – visible only on lg+ */}
            <nav className="hidden lg:flex items-center gap-10">
              {[
                { to: "/", label: "Home" },
                { to: "/menu/all", label: "Menu" },
                { to: "/about", label: "About" },
                { to: "/contact", label: "Contact" },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-base font-medium text-gray-700 transition-colors hover:text-orange-600"
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right-side Actions */}
            <div className="flex items-center gap-3">

              {/* Select Area Button – hidden on small screens */}
              <Button
                variant="outline"
                className="hidden md:flex items-center gap-2 rounded-full text-sm border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => setAreaModalOpen(true)}
                aria-label="Select delivery area"
              >
                <MapPin className="h-4 w-4" />
                <span className="hidden xl:inline">Select Area</span>
              </Button>

              {/* Cart Button with Badge */}
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 rounded-full hover:bg-orange-50"
                onClick={() => navigate("/cart")}
                aria-label={`Cart with ${cartCount} items`}
              >
                <ShoppingCart className="h-5 w-5 text-gray-800" />
                {cartCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full p-0 text-xs font-bold bg-orange-600 text-white border-2 border-white"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Button>

              {/* Desktop Auth Controls – visible from sm+ */}
              {isLoggedIn ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden sm:flex items-center gap-2 hover:bg-orange-50"
                    onClick={() => navigate("/dashboard")}
                  >
                    <User className="h-5 w-5 text-gray-800" />
                    <span className="hidden md:inline text-gray-800 font-medium">
                      {user?.name.split(" ")[0]}
                    </span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden sm:block hover:bg-orange-50"
                    onClick={handleLogout}
                    aria-label="Logout"
                  >
                    <LogOut className="h-5 w-5 text-gray-800" />
                  </Button>
                </>
              ) : (
                <Button
                  className="hidden sm:flex text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-full px-6"
                  onClick={() => navigate("/login")}
                >
                  Login
                </Button>
              )}

              {/* Mobile Menu Trigger */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-11 w-11 rounded-full hover:bg-orange-50"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6 text-gray-800" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-out Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-full sm:w-96 bg-white/95 backdrop-blur">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold text-orange-700">Menu</SheetTitle>
          </SheetHeader>

          <nav className="mt-10 space-y-4">
            {/* Area Selection */}
            <Button
              variant="ghost"
              className="w-full justify-start text-lg hover:bg-orange-50"
              onClick={() => {
                setMobileMenuOpen(false);
                setAreaModalOpen(true);
              }}
            >
              <MapPin className="mr-4 h-6 w-6 text-orange-600" />
              Select Delivery Area
            </Button>

            <Separator className="bg-orange-200" />

            {/* Main Navigation Links */}
            {[
              { to: "/", label: "Home" },
              { to: "/menu/all", label: "Menu" },
              { to: "/about", label: "About" },
              { to: "/contact", label: "Contact" },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <Button variant="ghost" className="w-full justify-start text-lg hover:bg-orange-50">
                  {label}
                </Button>
              </Link>
            ))}

            <Separator className="bg-orange-200" />

            {/* Auth Section */}
            {isLoggedIn ? (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-lg hover:bg-orange-50"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/dashboard");
                  }}
                >
                  <User className="mr-4 h-6 w-6 text-orange-600" />
                  Dashboard
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start text-lg text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-4 h-6 w-6" />
                  Logout
                </Button>
              </>
            ) : (
              <Button
                className="w-full text-lg bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-6"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/login");
                }}
              >
                Login
              </Button>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Service Area Selection Modal */}
      <ServiceAreaModal
        isOpen={areaModalOpen}
        onClose={() => setAreaModalOpen(false)}
      />
    </>
  );
};