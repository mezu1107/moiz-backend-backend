// src/components/Header.tsx
// FINAL PRODUCTION VERSION — DECEMBER 17, 2025

import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  User,
  Menu,
  LogOut,
  MapPin,
  Package,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import ServiceAreaModal from "@/components/ServiceAreaModal";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCartStore } from "@/features/cart/store/useCartStore";
import {
  useServerCart,
  useRemoveFromCart,
  useUpdateCartQuantity,
} from "@/features/cart/hooks/useServerCart";

export const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const guestCart = useCartStore();

  const { data: serverCart, isLoading: serverLoading } = useServerCart();
  const removeItem = useRemoveFromCart();
  const updateQty = useUpdateCartQuantity();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [areaModalOpen, setAreaModalOpen] = useState(false);

  // ===============================
  // CART LOGIC — UNIFIED SOURCE
  // ===============================

  const cartItems = user ? serverCart?.items ?? [] : guestCart.items;
  const cartTotal = user ? serverCart?.total ?? 0 : guestCart.getTotal();

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  // ===============================
  // HANDLERS
  // ===============================

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleQuantityChange = (cartItemId: string, delta: number) => {
    const item = cartItems.find((i) => i._id === cartItemId);
    if (!item) return;

    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      user ? removeItem.mutate(cartItemId) : guestCart.removeItem(cartItemId);
      return;
    }

    user
      ? updateQty.mutate({ itemId: cartItemId, quantity: newQty })
      : guestCart.updateQuantity(cartItemId, newQty);
  };

  const handleClearCart = () => {
    if (user) {
      // Assuming your remove mutation supports "all"
      removeItem.mutate("all" as any);
    } else {
      guestCart.clearCart();
    }
  };

  // ===============================
  // RENDER
  // ===============================

  return (
    <>
      {/* MAIN HEADER */}
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xl font-black shadow-lg">
                AM
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold">AM Foods</h1>
                <p className="text-xs text-muted-foreground">Pakistani Cuisine</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
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
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-3">

              {/* Area Selector */}
              <Button
                variant="outline"
                className="hidden md:flex items-center gap-2 rounded-full"
                onClick={() => setAreaModalOpen(true)}
              >
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="text-sm">Select Area</span>
              </Button>

              {/* Cart */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Button>

              {/* Auth Controls */}
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/profile")}
                    className="hidden sm:flex"
                  >
                    <User className="h-4 w-4 mr-2" />
                    {user.name.split(" ")[0]}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  className="hidden sm:flex"
                  onClick={() => navigate("/login")}
                >
                  Login
                </Button>
              )}

              {/* Mobile Menu */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* CART SIDEBAR */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Cart ({cartCount} items)</SheetTitle>
              {cartCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCart}
                  className="text-destructive hover:text-destructive"
                >
                  Clear All
                </Button>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-1 px-1 py-4">
            {serverLoading && user ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg mb-4" />
              ))
            ) : cartItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <Package className="h-20 w-20 mb-4 opacity-50" />
                <p className="text-lg">Your cart is empty</p>
                <p className="text-sm mt-2">Add items from the menu</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item._id}
                    className="flex gap-4 p-4 bg-muted/30 rounded-lg border"
                  >
                    <img
                      src={item.menuItem.image || "/placeholder.jpg"}
                      alt={item.menuItem.name}
                      className="h-20 w-20 rounded-lg object-cover bg-muted"
                    />

                    <div className="flex-1">
                      <h4 className="font-semibold text-base">
                        {item.menuItem.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Rs. {item.priceAtAdd.toFixed(2)} each
                      </p>

                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(item._id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>

                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>

                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(item._id, +1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 ml-auto text-destructive"
                          onClick={() =>
                            user
                              ? removeItem.mutate(item._id)
                              : guestCart.removeItem(item._id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">
                        Rs. {(item.priceAtAdd * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Cart Footer */}
          {cartCount > 0 && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>Rs. {cartTotal.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => navigate("/cart")}>
                  View Cart
                </Button>
                <Button onClick={() => navigate("/checkout")}>
                  Checkout
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* AREA MODAL */}
      <ServiceAreaModal
        isOpen={areaModalOpen}
        onClose={() => setAreaModalOpen(false)}
      />
    </>
  );
};