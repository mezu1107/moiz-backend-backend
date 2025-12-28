// src/components/Header.tsx
// FINAL PRODUCTION HEADER — FULLY RESPONSIVE (320px → 4K)
// Foodpanda-inspired, mobile-first design
// Cart badge only → redirects to /cart (no drawer editing)
// Optimized for touch, accessibility, and fluid layout

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
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">

            {/* Logo & Brand */}
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-emerald-600 text-lg font-bold text-white shadow-md">
                AM
              </div>

              {/* Brand text: hidden on mobile, visible from sm+ */}
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold leading-tight">AM Foods</h1>
                <p className="text-xs text-muted-foreground">Authentic Pakistani Cuisine</p>
              </div>
            </Link>

            {/* Desktop Navigation – visible only on lg+ */}
            <nav className="hidden lg:flex items-center gap-8">
              {[
                { to: "/", label: "Home" },
                { to: "/menu/all", label: "Menu" },
                { to: "/about", label: "About" },
                { to: "/contact", label: "Contact" },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right-side Actions */}
            <div className="flex items-center gap-2">

              {/* Select Area Button – hidden on small screens, compact on md+, full on xl+ */}
              <Button
                variant="outline"
                className="hidden md:flex items-center gap-2 rounded-full text-sm"
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
                className="relative h-10 w-10"
                onClick={() => navigate("/cart")}
                aria-label={`Cart with ${cartCount} items`}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs font-medium"
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
                    className="hidden sm:flex items-center gap-2"
                    onClick={() => navigate("/dashboard")}
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline">{user?.name.split(" ")[0]}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden sm:block"
                    onClick={handleLogout}
                    aria-label="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  className="hidden sm:flex text-sm"
                  onClick={() => navigate("/login")}
                >
                  Login
                </Button>
              )}

              {/* Mobile Menu Trigger */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-out Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-full sm:w-80">
          <SheetHeader>
            <SheetTitle className="text-xl">Menu</SheetTitle>
          </SheetHeader>

          <nav className="mt-8 space-y-4">
            {/* Area Selection in Mobile Menu */}
            <Button
              variant="ghost"
              className="w-full justify-start text-base"
              onClick={() => {
                setMobileMenuOpen(false);
                setAreaModalOpen(true);
              }}
            >
              <MapPin className="mr-3 h-5 w-5" />
              Select Delivery Area
            </Button>

            <Separator />

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
                <Button variant="ghost" className="w-full justify-start text-base">
                  {label}
                </Button>
              </Link>
            ))}

            <Separator />

            {/* Auth Section */}
            {isLoggedIn ? (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-base"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/dashboard");
                  }}
                >
                  <User className="mr-3 h-5 w-5" />
                  Dashboard
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start text-base text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Logout
                </Button>
              </>
            ) : (
              <Button
                className="w-full text-base"
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