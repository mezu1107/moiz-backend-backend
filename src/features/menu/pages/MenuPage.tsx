// src/features/menu/pages/MenuPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Globe, MapPin, Package } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { useAreaStore } from '@/lib/areaStore';
import { useCartStore } from '@/features/cart/store/useCartStore';
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

export default function MenuPage() {
  const navigate = useNavigate();
  const { userLocation } = useAreaStore();
  const { getItemCount, subtotal } = useCartStore();
  const itemCount = getItemCount();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [isVeg, setIsVeg] = useState<boolean | null>(null);
  const [isSpicy, setIsSpicy] = useState<boolean | null>(null);

  const { data, isLoading, error } = useMenuByLocation(
    userLocation?.lat ?? null,
    userLocation?.lng ?? null
  );

  // Redirect to home if no location set
  useEffect(() => {
    if (!userLocation && !isLoading) {
      navigate('/', { replace: true });
    }
  }, [userLocation, isLoading, navigate]);

  const menuItems = data?.menu ?? [];
  const area = data?.area;
  const delivery = data?.delivery;
  const hasDelivery = data?.hasDeliveryZone ?? false;
  const inService = data?.inService ?? false;
  const message = data?.message;

  const areaName = area?.name ?? 'Your Location';
  const city = area?.city ?? 'Pakistan';

  // Client-side filtering
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        if (
          !item.name.toLowerCase().includes(q) &&
          !(item.description && item.description.toLowerCase().includes(q))
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

  // Group by category
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

  const hasGlobalItemsInCategory = (cat: MenuCategory) => {
    return groupedItems[cat].some((item) => item.availableInAreas.length === 0);
  };

  const clearAllFilters = () => {
    setSearch('');
    setSelectedCategory(null);
    setIsVeg(null);
    setIsSpicy(null);
  };

  // Loading
  if (isLoading) {
    return <MenuPageSkeleton />;
  }

  // Not in service area (outside Pakistan or no matching polygon)
  if (!inService || error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-lg w-full p-12 text-center space-y-8">
          <div className="w-28 h-28 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
            <MapPin className="h-14 w-14 text-muted-foreground/50" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Sorry, Not Available Here</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {message || "We currently only deliver within Pakistan. More locations coming soon!"}
            </p>
          </div>
          <Button size="lg" onClick={() => navigate('/')}>
            <MapPin className="mr-3 h-5 w-5" />
            Try Another Location
          </Button>
        </Card>
      </div>
    );
  }

  // In service area but delivery not active yet
  if (inService && !hasDelivery) {
    return (
      <div className="min-h-screen bg-background">
        <MenuHeader
          areaName={areaName}
          city={city}
          hasDelivery={false}
          onChangeLocation={() => navigate('/')}
        />

        <div className="container mx-auto px-4 py-12 text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6 text-base px-5 py-2">
            <Package className="mr-2 h-5 w-5" />
            Delivery Coming Soon to {areaName}
          </Badge>

          <h2 className="text-4xl font-bold mb-6">Welcome to {areaName}!</h2>
          <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
            {message || "We're setting up fast delivery in your area. In the meantime, browse our full menu!"}
          </p>

          <div className="mb-12">
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

          {filteredItems.length === 0 ? (
            <Card className="p-20 bg-muted/30">
              <p className="text-2xl text-muted-foreground">
                No items available with current filters
              </p>
              <Button variant="outline" size="lg" className="mt-8" onClick={clearAllFilters}>
                Clear Filters
              </Button>
            </Card>
          ) : (
            <div className="space-y-20">
              {(Object.keys(groupedItems) as MenuCategory[]).map((cat) => {
                const items = groupedItems[cat];
                if (items.length === 0) return null;

                const Icon = CATEGORY_ICONS[cat];
                const hasGlobal = hasGlobalItemsInCategory(cat);

                return (
                  <section key={cat}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
                      <h3 className="text-3xl font-bold flex items-center gap-4">
                        <Icon className="h-9 w-9 text-primary" />
                        {CATEGORY_LABELS[cat]}
                        <Badge variant="secondary" className="text-xl px-4 py-2">
                          {items.length}
                        </Badge>
                      </h3>
                      {hasGlobal && (
                        <Badge variant="outline" className="gap-2 text-base px-4 py-2">
                          <Globe className="h-5 w-5" />
                          Available in All Areas
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
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
          )}
        </div>
      </div>
    );
  }

  // Full service — normal menu
  return (
    <div className="min-h-screen bg-background pb-32">
      <MenuHeader
        areaName={areaName}
        city={city}
        deliveryFee={delivery?.fee}
        minOrder={delivery?.minOrder}
        estimatedTime={delivery?.estimatedTime || '35-50 min'}
        hasDelivery={true}
        onChangeLocation={() => navigate('/')}
      />

      <div className="container mx-auto px-4 py-6">
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

        <div className="mt-10">
          {filteredItems.length === 0 ? (
            <Card className="p-20 text-center bg-muted/30">
              <div className="w-28 h-28 mx-auto mb-8 rounded-full bg-muted/60 flex items-center justify-center">
                <Package className="h-14 w-14 text-muted-foreground/40" />
              </div>
              <h3 className="text-3xl font-bold mb-4">No matching items</h3>
              <p className="text-lg text-muted-foreground mb-8">
                Try adjusting your filters to see more options
              </p>
              <Button size="lg" variant="outline" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
            </Card>
          ) : selectedCategory ? (
            <>
              <h2 className="text-4xl font-bold mb-10 flex items-center gap-4">
                {CATEGORY_LABELS[selectedCategory]}
                <Badge variant="secondary" className="text-2xl px-5 py-2">
                  {filteredItems.length}
                </Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredItems.map((item, i) => (
                  <div
                    key={item._id}
                    className="animate-in fade-in slide-in-from-bottom-12 duration-700"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <MenuItemCard item={item} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-24">
              {(Object.keys(groupedItems) as MenuCategory[]).map((cat) => {
                const items = groupedItems[cat];
                if (items.length === 0) return null;

                const Icon = CATEGORY_ICONS[cat];
                const hasGlobal = hasGlobalItemsInCategory(cat);

                return (
                  <section key={cat} className="scroll-mt-32">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-6">
                      <h2 className="text-4xl font-bold flex items-center gap-5">
                        <Icon className="h-10 w-10 text-primary" />
                        {CATEGORY_LABELS[cat]}
                        <Badge variant="secondary" className="text-2xl px-5 py-3">
                          {items.length}
                        </Badge>
                      </h2>
                      {hasGlobal && (
                        <Badge variant="outline" className="gap-2 text-base px-5 py-3">
                          <Globe className="h-5 w-5" />
                          Available Everywhere
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                      {items.map((item, i) => (
                        <div
                          key={item._id}
                          className="animate-in fade-in slide-in-from-bottom-16 duration-700"
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
          )}
        </div>
      </div>

      {/* Floating Cart */}
      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-50 px-4 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <Button
              onClick={() => navigate('/cart')}
              size="lg"
              className="w-full h-16 rounded-2xl shadow-2xl font-bold text-lg hover:scale-105 transition-all"
            >
              <div className="flex items-center justify-between w-full px-8">
                <div className="flex items-center gap-4">
                  <ShoppingCart className="h-7 w-7" />
                  <span className="text-xl">
                    {itemCount} item{itemCount > 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-2xl">
                  Rs. {Number(subtotal).toLocaleString()}
                </span>
              </div>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}