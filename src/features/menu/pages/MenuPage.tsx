// src/features/menu/pages/MenuPage.tsx

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Globe, MapPin, Package } from 'lucide-react';

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

  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] =
    useState<MenuCategory | null>(null);
  const [isVeg, setIsVeg] = useState<boolean | null>(null);
  const [isSpicy, setIsSpicy] = useState<boolean | null>(null);

  const { data, isLoading, error } = useMenuByLocation(
    userLocation?.lat ?? null,
    userLocation?.lng ?? null
  );

  /** Redirect if location missing */
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

  /** Filtering */
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !item.name.toLowerCase().includes(q) &&
          !item.description?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (selectedCategory && item.category !== selectedCategory) return false;
      if (isVeg !== null && item.isVeg !== isVeg) return false;
      if (isSpicy !== null && item.isSpicy !== isSpicy) return false;
      return true;
    });
  }, [menuItems, search, selectedCategory, isVeg, isSpicy]);

  /** Grouping */
  const groupedItems = useMemo<Record<MenuCategory, MenuItem[]>>(() => {
    const groups: Record<MenuCategory, MenuItem[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      desserts: [],
      beverages: [],
    };

    filteredItems.forEach((item) => {
      groups[item.category].push(item);
    });

    return groups;
  }, [filteredItems]);

  const hasGlobalItemsInCategory = (cat: MenuCategory): boolean =>
    groupedItems[cat].some((item) => item.availableInAreas.length === 0);

  const clearAllFilters = (): void => {
    setSearch('');
    setSelectedCategory(null);
    setIsVeg(null);
    setIsSpicy(null);
  };

  /** Outside service area */
  if (!inService || error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-lg p-8 sm:p-12 text-center space-y-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center">
            <MapPin className="h-12 w-12 text-muted-foreground/60" />
          </div>
          <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-bold">
            Not Available Here
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            {message ||
              'We currently only deliver within Pakistan. More locations coming soon!'}
          </p>
          <Button size="lg" onClick={() => navigate('/')}>
            Try Another Location
          </Button>
        </Card>
      </main>
    );
  }

  /** Delivery coming soon */
  if (inService && !hasDelivery) {
    return (
      <main className="min-h-screen bg-background">
        <MenuHeader
          areaName={areaName}
          city={city}
          hasDelivery={false}
          onChangeLocation={() => navigate('/')}
        />

        <section className="mx-auto max-w-6xl px-4 py-12 text-center space-y-10">
          <Badge variant="secondary" className="px-4 py-2 text-sm sm:text-base">
            <Package className="mr-2 h-4 w-4" />
            Delivery Coming Soon
          </Badge>

          <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold">
            Welcome to {areaName}
          </h2>

          <p className="text-muted-foreground max-w-3xl mx-auto">
            {message ||
              "We're setting up fast delivery in your area. Browse our menu meanwhile!"}
          </p>

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
        </section>
      </main>
    );
  }

  /** Full service */
  return (
    <main className="min-h-screen bg-background pb-28">
      <MenuHeader
        areaName={areaName}
        city={city}
        deliveryFee={delivery?.fee}
        minOrder={delivery?.minOrder}
        estimatedTime={delivery?.estimatedTime || '35–50 min'}
        hasDelivery
        onChangeLocation={() => navigate('/')}
      />

      <section className="mx-auto max-w-7xl px-4 py-6">
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

        <div className="mt-10 space-y-24">
          {(Object.keys(groupedItems) as MenuCategory[]).map((cat) => {
            const items = groupedItems[cat];
            if (!items.length) return null;

            const Icon = CATEGORY_ICONS[cat];
            const hasGlobal = hasGlobalItemsInCategory(cat);

            return (
              <section key={cat} className="scroll-mt-28">
                <header className="flex flex-col sm:flex-row justify-between gap-6 mb-10">
                  <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold flex items-center gap-4">
                    <Icon className="h-8 w-8 text-primary" />
                    {CATEGORY_LABELS[cat]}
                    <Badge variant="secondary">{items.length}</Badge>
                  </h2>
                  {hasGlobal && (
                    <Badge variant="outline" className="gap-2">
                      <Globe className="h-4 w-4" />
                      Available Everywhere
                    </Badge>
                  )}
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {items.map((item, i) => (
                    <div
                      key={item._id}
                      className="animate-in fade-in slide-in-from-bottom-12 duration-700"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <MenuItemCard item={item} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      {/* Floating Cart — Mobile-first safe */}
      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-background/90 backdrop-blur border-t">
          <div className="mx-auto max-w-2xl px-4 py-3">
            <Button
              size="lg"
              className="w-full h-14 font-bold text-base sm:text-lg"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart className="mr-3 h-5 w-5" />
              {itemCount} item{itemCount > 1 ? 's' : ''} • Rs.{' '}
              {Number(subtotal).toLocaleString()}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
