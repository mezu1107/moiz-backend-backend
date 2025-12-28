// src/features/cart/hooks/useCartStore.ts
// PRODUCTION-READY — DECEMBER 28, 2025
// Added: addMultipleItems() for fast bulk reorder (guest + authenticated)
// Fixed: Immediate persist + TypeScript-safe

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, MenuItemInCart } from '@/types/cart.types';

interface CartState {
  items: CartItem[];
  orderNote: string;

  addItem: (
    menuItem: MenuItemInCart,
    quantity?: number,
    customizations?: {
      sides?: string[];
      drinks?: string[];
      addOns?: string[];
      specialInstructions?: string;
    },
    priceAtAdd?: number
  ) => void;

  // NEW: Bulk add for reorder — replaces current cart
  addMultipleItems: (items: CartItem[]) => void;

  updateItem: (
    cartItemId: string,
    updates: Partial<
      Pick<CartItem, 'quantity' | 'sides' | 'drinks' | 'addOns' | 'specialInstructions'>
    > & { orderNote?: string }
  ) => void;

  removeItem: (cartItemId: string) => void;
  setOrderNote: (note: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  syncWithServer: (serverCart: { items: CartItem[]; orderNote: string }) => void;
}

// ---------------- Helpers ----------------
const calculateTotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

const arraysEqual = (a: string[] = [], b: string[] = []) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
};

// ---------------- Store ----------------
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      // Helper to immediately persist state
      const persistState = (partial: Partial<CartState>) => {
        set(partial);
        // Force immediate flush to localStorage
        localStorage.setItem(
          'amfood-cart-v6',
          JSON.stringify({ ...get(), version: 6 })
        );
      };

      return {
        items: [],
        orderNote: '',

        addItem: (menuItem, quantity = 1, customizations = {}, priceAtAdd = menuItem.price) => {
          const state = get();
          const existingIndex = state.items.findIndex((i) => {
            if (i.menuItem._id !== menuItem._id) return false;
            if (i.specialInstructions !== (customizations.specialInstructions ?? '')) return false;
            return (
              arraysEqual(i.sides ?? [], customizations.sides ?? []) &&
              arraysEqual(i.drinks ?? [], customizations.drinks ?? []) &&
              arraysEqual(i.addOns ?? [], customizations.addOns ?? [])
            );
          });

          let newItems: CartItem[];

          if (existingIndex > -1) {
            newItems = [...state.items];
            newItems[existingIndex].quantity = Math.min(
              newItems[existingIndex].quantity + quantity,
              50
            );
          } else {
            const newItem: CartItem = {
              _id: crypto.randomUUID(),
              menuItem,
              quantity,
              priceAtAdd,
              sides: customizations.sides,
              drinks: customizations.drinks,
              addOns: customizations.addOns,
              specialInstructions: customizations.specialInstructions,
              addedAt: new Date().toISOString(),
            };
            newItems = [...state.items, newItem];
          }

          persistState({ items: newItems });
        },

        // NEW: Bulk add — used by reorder (replaces current cart)
        addMultipleItems: (newItems: CartItem[]) => {
          if (!Array.isArray(newItems)) {
            persistState({ items: [] });
            return;
          }

          // Reorder replaces the entire cart — clean and expected behavior
          persistState({ items: newItems });
        },

        updateItem: (cartItemId, updates) => {
          const state = get();
          const idx = state.items.findIndex((i) => i._id === cartItemId);
          if (idx === -1) return;

          const updatedItems = [...state.items];

          if (updates.quantity !== undefined) {
            if (updates.quantity <= 0) {
              updatedItems.splice(idx, 1);
            } else {
              updatedItems[idx].quantity = Math.min(updates.quantity, 50);
            }
          }
          if (updates.sides !== undefined) updatedItems[idx].sides = updates.sides;
          if (updates.drinks !== undefined) updatedItems[idx].drinks = updates.drinks;
          if (updates.addOns !== undefined) updatedItems[idx].addOns = updates.addOns;
          if (updates.specialInstructions !== undefined)
            updatedItems[idx].specialInstructions = updates.specialInstructions;

          persistState({
            items: updatedItems,
            orderNote: updates.orderNote ?? state.orderNote,
          });
        },

        removeItem: (cartItemId) => {
          const newItems = get().items.filter((i) => i._id !== cartItemId);
          persistState({ items: newItems });
        },

        setOrderNote: (note) => {
          persistState({ orderNote: note });
        },

        clearCart: () => {
          persistState({ items: [], orderNote: '' });
        },

        getTotal: () => calculateTotal(get().items),
        getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

        syncWithServer: ({ items, orderNote }) => {
          persistState({ items, orderNote });
        },
      };
    },
    {
      name: 'amfood-cart-v6',
      version: 6,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, orderNote: state.orderNote }),
      migrate: (persistedState: any, version) => {
        if (version < 6) {
          return { items: [], orderNote: '' };
        }
        return persistedState as CartState;
      },
    }
  )
);