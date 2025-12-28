// src/global.d.ts
import { useCartStore } from '@/features/cart/hooks/useCartStore';

declare global {
  interface Window {
    cartStore?: typeof useCartStore;
  }
}
