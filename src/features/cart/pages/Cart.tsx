// src/features/cart/pages/CartPage.tsx
// UPDATED — JANUARY 2026
// Improvements: skeletons, better empty state, real-time item count feel, accessibility

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  ArrowLeft,
  Package,
  Loader2,
  MessageSquare,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuthStore } from '@/features/auth/store/authStore';
import { useCartStore } from '@/features/cart/hooks/useCartStore';
import {
  useServerCartQuery,
  useUpdateCartItem,
  useRemoveFromCart,
  useClearCart,
} from '@/features/cart/hooks/useServerCart';

import type { CartItem } from '@/types/cart.types';
import { UNIT_LABELS } from '@/features/menu/types/menu.types';

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isGuest = !user;

  const { data: serverCart, isLoading: serverLoading } = useServerCartQuery();
  const localCart = useCartStore();
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!isGuest && serverCart && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      localCart.syncWithServer({
        items: serverCart.items,
        orderNote: serverCart.orderNote,
      });
    }
  }, [isGuest, serverCart, localCart]);

  useEffect(() => {
    if (isGuest) hasSyncedRef.current = false;
  }, [isGuest]);

  const items: CartItem[] = isGuest ? localCart.items : serverCart?.items ?? [];
  const total: number = isGuest ? localCart.getTotal() : serverCart?.total ?? 0;
  const currentOrderNote: string = isGuest ? localCart.orderNote : serverCart?.orderNote ?? '';
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveFromCart();
  const clearMutation = useClearCart();
  const isMutating = updateMutation.isPending || removeMutation.isPending || clearMutation.isPending;

  const [orderNoteInput, setOrderNoteInput] = useState(currentOrderNote);

  useEffect(() => {
    setOrderNoteInput(currentOrderNote);
  }, [currentOrderNote]);

  useEffect(() => {
    if (isGuest && orderNoteInput !== currentOrderNote) {
      const timeout = setTimeout(() => {
        localCart.setOrderNote(orderNoteInput.trim().slice(0, 500));
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [orderNoteInput, isGuest, currentOrderNote, localCart]);

  const saveOrderNote = () => {
    const trimmed = orderNoteInput.trim().slice(0, 500);
    if (!isGuest && trimmed !== currentOrderNote) {
      updateMutation.mutate({
        itemId: 'order-note',
        updates: { orderNote: trimmed || undefined },
      });
    }
  };

  const handleQuantityChange = (id: string, delta: number) => {
    const item = items.find((i) => i._id === id);
    if (!item) return;

    const newQty = Math.max(1, Math.min(50, item.quantity + delta)); // already safe

    if (isGuest) {
      localCart.updateItem(id, { quantity: newQty });
    } else {
      updateMutation.mutate({ itemId: id, updates: { quantity: newQty } });
    }
  };

  const handleRemove = (id: string) => {
    if (isGuest) localCart.removeItem(id);
    else removeMutation.mutate(id);
  };

  const handleClear = () => {
    if (isGuest) localCart.clearCart();
    else clearMutation.mutate();
  };

  // Loading state with skeleton
  if ((serverLoading && !isGuest) || isMutating) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4 rounded-xl border bg-card p-6">
              <Skeleton className="h-32 w-32 rounded-xl" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-10 w-40" />
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="container mx-auto px-4 py-16 md:py-24 text-center">
        <div className="mx-auto mb-10 flex h-32 w-32 items-center justify-center rounded-full bg-muted/40">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
        </div>
        <h1 className="mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">
          Your cart is empty
        </h1>
        <p className="mx-auto mb-12 max-w-md text-lg text-muted-foreground">
          Looks like you haven't added anything yet. Let's change that!
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={() => navigate('/menu/all')}>
            Browse Menu
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/')}>
            Go Home
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 md:py-8 lg:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 md:mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold md:text-3xl lg:text-4xl">Your Cart</h1>
        </div>
        <Badge variant="secondary" className="px-4 py-1.5 text-base md:text-lg">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </Badge>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border bg-card p-4 md:p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 md:mb-6">
              <h2 className="flex items-center gap-3 text-xl font-bold md:text-2xl">
                <ShoppingBag className="h-6 w-6 md:h-7 md:w-7" />
                Your Items ({itemCount})
              </h2>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClear}
                disabled={isMutating}
              >
                {clearMutation.isPending ? 'Clearing...' : 'Clear Cart'}
              </Button>
            </div>

            <ScrollArea className="h-[50vh] md:h-[60vh] lg:h-[65vh] pr-3">
              <div className="space-y-5">
                {items.map((item) => (
                  <article
                    key={item._id}
                    className="flex flex-col gap-4 rounded-xl border bg-background p-4 shadow-sm transition-all hover:shadow-md sm:flex-row"
                  >
                    {item.menuItem.image ? (
                      <img
                        src={item.menuItem.image}
                        alt={item.menuItem.name}
                        className="aspect-square w-full max-w-32 rounded-xl object-cover sm:w-32"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex aspect-square w-32 items-center justify-center rounded-xl bg-muted">
                        <Package className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}

                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-semibold md:text-xl flex flex-wrap items-center gap-2">
                          {item.menuItem.name}
                          <Badge variant="outline" className="text-xs">
                            {UNIT_LABELS[item.menuItem.unit] || item.menuItem.unit}
                          </Badge>
                        </h3>

                        {/* Preferred: selectedOptions display */}
                        {item.selectedOptions && Object.values(item.selectedOptions).flat().length > 0 && (
                          <div className="mt-3 space-y-1 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                            {(['sides', 'drinks', 'addOns'] as const).flatMap((section) =>
                              item.selectedOptions![section]?.map((opt) => (
                                <p key={opt.name} className="flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    • {opt.name}
                                    {opt.unit && (
                                      <Badge variant="outline" className="text-xs">
                                        {UNIT_LABELS[opt.unit] || opt.unit}
                                      </Badge>
                                    )}
                                  </span>
                                  {opt.price > 0 && (
                                    <span className="text-primary font-medium">
                                      +Rs. {opt.price}
                                    </span>
                                  )}
                                </p>
                              ))
                            )}
                          </div>
                        )}

                        {/* Fallback */}
                        {!item.selectedOptions && (item.sides?.length || item.drinks?.length || item.addOns?.length) && (
                          <div className="mt-3 space-y-1 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                            {item.sides?.length > 0 && <p>• Sides: {item.sides.join(', ')}</p>}
                            {item.drinks?.length > 0 && <p>• Drinks: {item.drinks.join(', ')}</p>}
                            {item.addOns?.length > 0 && <p>• Add-ons: {item.addOns.join(', ')}</p>}
                          </div>
                        )}

                        {item.specialInstructions && (
                          <p className="mt-2 text-sm italic text-muted-foreground">
                            Note: {item.specialInstructions}
                          </p>
                        )}

                        <p className="mt-3 text-sm text-muted-foreground">
                          Rs. {item.priceAtAdd.toFixed(2)} each
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between sm:mt-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleQuantityChange(item._id, -1)}
                            disabled={item.quantity <= 1 || isMutating}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-10 text-center text-lg font-bold">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleQuantityChange(item._id, +1)}
                            disabled={item.quantity >= 50 || isMutating}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive/90"
                          onClick={() => handleRemove(item._id)}
                          disabled={isMutating}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-right sm:ml-auto sm:self-center">
                      <p className="text-xl font-bold md:text-2xl">
                        Rs. {(item.priceAtAdd * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Order Note */}
          <div className="rounded-2xl border bg-card p-4 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary md:h-6 md:w-6" />
              <h2 className="text-lg font-semibold md:text-xl">Order Note</h2>
            </div>
            <Label htmlFor="order-note" className="text-sm text-muted-foreground">
              Any special requests? (less spicy, no onions, etc.)
            </Label>
            <Textarea
              id="order-note"
              placeholder="Type your note here..."
              className="mt-3 min-h-32 resize-none"
              value={orderNoteInput}
              onChange={(e) => setOrderNoteInput(e.target.value)}
              onBlur={saveOrderNote}
              maxLength={500}
              disabled={isMutating}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {orderNoteInput.length}/500 characters
              </p>
              {updateMutation.isPending && !isGuest && (
                <span className="flex items-center gap-1.5 text-xs text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Summary Sidebar */}
        <aside className="lg:col-span-1">
          <div className="rounded-2xl border bg-card p-5 md:p-6 lg:sticky lg:top-8">
            <h2 className="mb-6 text-xl font-bold md:text-2xl">Order Summary</h2>

            <div className="space-y-5">
              <div className="flex justify-between text-base md:text-lg">
                <span>Subtotal ({itemCount} items)</span>
                <span className="font-bold">Rs. {total.toFixed(2)}</span>
              </div>

              {currentOrderNote && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                  <p className="mb-1 font-medium text-primary">Your Note</p>
                  <p className="whitespace-pre-wrap">{currentOrderNote}</p>
                </div>
              )}

              <Separator />

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes & Charges</span>
                  <span>Included</span>
                </div>
              </div>

              <Separator />

              <div className="pt-4">
                <div className="flex justify-between text-2xl font-bold md:text-3xl">
                  <span>Total</span>
                  <span className="text-primary">Rs. {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <Button
                  size="lg"
                  className="w-full py-7 text-lg font-semibold"
                  onClick={() => navigate('/checkout')}
                  disabled={isMutating || itemCount === 0}
                >
                  Proceed to Checkout
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => navigate('/menu/all')}
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}