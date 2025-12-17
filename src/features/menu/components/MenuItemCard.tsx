// src/components/menu/MenuItemCard.tsx
import { Plus, Leaf, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { useAddToCart } from '@/features/cart/hooks/useServerCart';
import { useCartStore } from '@/features/cart/store/useCartStore';
import { useAuthStore } from '@/features/auth/store/authStore';

import type { MenuItem } from '@/features/menu/types/menu.types';

interface MenuItemCardProps {
  item: MenuItem;
  className?: string;
}

export function MenuItemCard({ item, className = '' }: MenuItemCardProps) {
  const { user } = useAuthStore();
  const addToGuestCart = useCartStore((s) => s.addItem);
  const { mutate: addToServerCart, isPending } = useAddToCart();

  // Safe rendering helpers - prevents "Objects are not valid as React child" error
  const safeName = String(item.name || 'Unnamed Item');
  const safeDescription = String(item.description || 'Delicious item from our menu');
  const safePrice = Number(item.price || 0);
  const safeImage = String(item.image || '/placeholder-food.jpg');

  const handleAddToCart = () => {
    if (!item.isAvailable) return;

    if (user) {
      addToServerCart(
        { menuItemId: item._id, quantity: 1 },
        {
          onSuccess: () => toast.success(`${safeName} added to cart!`),
          onError: () => toast.error('Failed to add item'),
        }
      );
    } else {
      addToGuestCart(
        {
          _id: item._id,
          name: safeName,
          price: safePrice,
          image: safeImage,
          isAvailable: true,
        },
        1
      );
      toast.success(`${safeName} added to cart!`);
    }
  };

  return (
    <Card className={`group overflow-hidden bg-card border-border/50 ${className}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={safeImage}
          alt={safeName}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {Boolean(item.isVeg) && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              <Leaf className="h-3 w-3 mr-1" /> Veg
            </Badge>
          )}
          {Boolean(item.isSpicy) && (
            <Badge variant="destructive" className="text-xs px-2 py-0.5">
              <Flame className="h-3 w-3 mr-1" /> Spicy
            </Badge>
          )}
          {!item.isAvailable && (
            <Badge variant="secondary" className="bg-gray-500 text-white">
              Unavailable
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{safeName}</h3>
          <span className="font-bold text-primary">
            Rs. {safePrice.toLocaleString()}
          </span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {safeDescription}
        </p>

        <Button
          onClick={handleAddToCart}
          disabled={!item.isAvailable || isPending}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          {isPending ? 'Adding...' : 'Add to Cart'}
        </Button>
      </CardContent>
    </Card>
  );
}
