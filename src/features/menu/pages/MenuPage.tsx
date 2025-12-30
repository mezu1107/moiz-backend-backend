// src/features/menu/pages/MenuPage.tsx
// PRODUCTION-READY v2.2 — DECEMBER 30, 2025
// Slim side cart • Non-sticky filters • Max content visibility
// Consistent with MenuByLocationPage & MenuFiltersPage

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Globe, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { useAreaStore } from '@/lib/areaStore';
import { useCartStore } from '@/features/cart/hooks/useCartStore';
import { useMenuByLocation } from '@/features/menu/hooks/useMenuApi';

import { MenuHeader } from '@/features/menu/components/MenuHeader';
import { MenuFilters } from '@/features/menu/components/MenuFilters';
import { MenuItemCard } from '../components/MenuItemCard';
import { MenuPageSkeleton } from '../components/MenuSkeleton';

import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type MenuCategory,
  type MenuItem,
} from '@/features/menu/types/menu.types';

export default function MenuPage(): JSX.Element {
  const navigate = useNavigate();
  const { userLocation } = useAreaStore();
  const { getItemCount, getTotal } = useCartStore();

  const itemCount = getItemCount();
  const subtotal = getTotal();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [isVeg, setIsVeg] = useState<boolean | null>(null);
  const [isSpicy, setIsSpicy] = useState<boolean | null>(null);

  const { data, isLoading, error } = useMenuByLocation(
    userLocation?.lat ?? null,
    userLocation?.lng ?? null
  );

  useEffect(() => {
    if (!userLocation && !isLoading) {
      navigate('/', { replace: true });
    }
  }, [userLocation, isLoading, navigate]);

  if (isLoading) return <MenuPageSkeleton />;

  const menuItems = data?.menu ?? [];
  const area = data?.area;
  const delivery = data?.delivery;
  const hasDelivery = data?.hasDeliveryZone ?? false;
  const inService = data?.inService ?? false;
  const message = data?.message;

  const areaName = area?.name ?? 'Your Location';
  const city = area?.city ?? 'Pakistan';

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !item.name.toLowerCase().includes(q) &&
          !(item.description || '').toLowerCase().includes(q)
        ) return false;
      }
      if (selectedCategory && item.category !== selectedCategory) return false;
      if (isVeg !== null && item.isVeg !== isVeg) return false;
      if (isSpicy !== null && item.isSpicy !== isSpicy) return false;
      return true;
    });
  }, [menuItems, search, selectedCategory, isVeg, isSpicy]);

  const groupedItems = useMemo<Record<MenuCategory, MenuItem[]>>(() => {
    const groups: Record<MenuCategory, MenuItem[]> = {
      breakfast: [], lunch: [], dinner: [], desserts: [], beverages: []
    };
    filteredItems.forEach(item => groups[item.category]?.push(item));
    return groups;
  }, [filteredItems]);

  const hasAnyItems = Object.values(groupedItems).some(items => items.length > 0);

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setSelectedCategory(null);
    setIsVeg(null);
    setIsSpicy(null);
  }, []);

  if (!inService || error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-muted/30 to-background">
        <Card className="w-full max-w-md p-10 text-center shadow-xl border-muted">
          <div className="mx-auto h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
            <Globe className="h-10 w-10 text-muted-foreground/70" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">Coming Soon!</h1>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-sm md:text-base">
            {message || "Delivery to your area will be available soon. We're expanding rapidly!"}
          </p>
          <Button size="lg" onClick={() => navigate('/')} className="w-full md:w-auto">
            Choose Location
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/20 to-background relative pb-24 md:pb-32">
      <MenuHeader
        areaName={areaName}
        city={city}
        deliveryFee={delivery?.fee}
        minOrder={delivery?.minOrder}
        estimatedTime={delivery?.estimatedTime}
        hasDelivery={hasDelivery}
        onChangeLocation={() => navigate('/')}
      />

      {/* Filters - natural scroll */}
      <section className="bg-background/95 border-b shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
          <MenuFilters
            search={search}
            onSearchChange={setSearch}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            isVeg={isVeg}
            onVegChange={setIsVeg}
            isSpicy={isSpicy}
            onSpicyChange={setIsSpicy}
          />
        </div>
      </section>

      {/* Menu */}
      <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
        {!hasAnyItems ? (
          <Card className="p-12 md:p-16 text-center border-muted shadow-md max-w-2xl mx-auto">
            <AlertTriangle className="mx-auto h-16 w-16 text-muted-foreground/50 mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">No matching dishes</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Adjust your filters to see delicious options from {areaName}!
            </p>
            <Button size="lg" onClick={clearAllFilters}>
              Show All Dishes
            </Button>
          </Card>
        ) : (
          <div className="space-y-12 md:space-y-20">
            {(Object.keys(groupedItems) as MenuCategory[]).map((cat) => {
              const items = groupedItems[cat];
              if (!items.length) return null;

              const Icon = CATEGORY_ICONS[cat];
              const hasGlobal = items.some(item => item.availableInAreas.length === 0);

              return (
                <section key={cat} id={cat} className="scroll-mt-24">
                  <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2.5">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold">
                        {CATEGORY_LABELS[cat]}
                      </h2>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="secondary" className="px-4 py-1.5">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                      </Badge>
                      {hasGlobal && (
                        <Badge variant="outline" className="gap-1.5 px-4 py-1.5">
                          <Globe className="h-4 w-4" />
                          Nationwide
                        </Badge>
                      )}
                    </div>
                  </header>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((item, index) => (
                      <div
                        key={item._id}
                        className="animate-in fade-in slide-in-from-bottom-6 duration-700"
                        style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
                      >
                        <MenuItemCard item={item} />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>

      {/* Slim side cart – bottom right corner */}
      {itemCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50 md:bottom-8 md:right-8">
          <Button
            onClick={() => navigate('/cart')}
            size="icon"
            className="h-14 w-14 md:h-16 md:w-16 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 relative bg-primary text-primary-foreground"
          >
            <div className="relative flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 md:h-7 md:w-7" />
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 text-xs flex items-center justify-center border-2 border-background shadow-md min-w-[24px]"
              >
                {itemCount}
              </Badge>
            </div>
          </Button>
        </div>
      )}
    </main>
  );
}