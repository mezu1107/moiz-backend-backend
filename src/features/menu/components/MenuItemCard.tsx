// src/components/menu/MenuItemCard.tsx
// PRODUCTION-READY — DECEMBER 27, 2025
// Full integration with AddToCartModal + accessibility + UX polish

import { useState } from 'react';
import { Leaf, Flame } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { AddToCartModal } from '@/features/cart/components/AddToCartModal';

import type { MenuItem } from '@/features/menu/types/menu.types';

interface MenuItemCardProps {
  item: MenuItem;
  className?: string;
}

export function MenuItemCard({ item, className = '' }: MenuItemCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const isAvailable = item.isAvailable !== false; // defaults to true if undefined

  const handleCardClick = () => {
    if (isAvailable) {
      setModalOpen(true);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when button is clicked
    if (isAvailable) {
      setModalOpen(true);
    }
  };

  return (
    <>
      <Card
        className={`group relative overflow-hidden bg-card border transition-all hover:shadow-xl ${
          !isAvailable ? 'opacity-60 grayscale' : 'cursor-pointer'
        } ${className}`}
        onClick={handleCardClick}
        role="button"
        tabIndex={isAvailable ? 0 : -1}
        aria-disabled={!isAvailable}
        aria-label={`View details for ${item.name}${!isAvailable ? ' (unavailable)' : ''}`}
        onKeyDown={(e) => {
          if (isAvailable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setModalOpen(true);
          }
        }}
      >
        {/* Image Section */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={item.image || '/placeholder-food.jpg'}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />

          {/* Badges: Veg, Spicy, Unavailable */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {item.isVeg && (
              <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium shadow-md">
                <Leaf className="h-3.5 w-3.5 mr-1" />
                Veg
              </Badge>
            )}
            {item.isSpicy && (
              <Badge variant="destructive" className="px-3 py-1.5 text-xs font-medium shadow-md">
                <Flame className="h-3.5 w-3.5 mr-1" />
                Spicy
              </Badge>
            )}
            {!isAvailable && (
              <Badge className="bg-black/80 text-white px-3 py-1.5 text-xs font-medium shadow-md">
                Unavailable
              </Badge>
            )}
          </div>

          {/* Price Badge */}
          <div className="absolute bottom-4 right-4">
            <Badge
              variant="default"
              className="text-lg font-bold px-5 py-2.5 shadow-2xl backdrop-blur-sm bg-primary/90"
            >
              Rs. {Number(item.price).toLocaleString('en-IN')}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-6">
          <h3 className="font-bold text-xl mb-2 line-clamp-2">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-6">
              {item.description}
            </p>
          )}

          <Button
            className="w-full"
            size="lg"
            variant={isAvailable ? 'default' : 'secondary'}
            disabled={!isAvailable}
            onClick={handleButtonClick}
          >
            {isAvailable ? 'Customize & Add to Cart' : 'Currently Unavailable'}
          </Button>
        </CardContent>
      </Card>

      {/* Customization Modal */}
      <AddToCartModal
        menuItemId={item._id}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}