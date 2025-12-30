// src/pages/MenuFiltersPage.tsx
// ULTIMATE MENU EXPERIENCE — v2.3 • LAUNCHED DEC 30, 2025
// Filters scroll naturally • Slim side cart • Maximum content visibility

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Search,
  X,
  Filter as FilterIcon,
  Loader2,
  ChefHat,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

import { useMenuFilters } from '@/features/menu/hooks/useMenuApi';
import { useCartStore } from '@/features/cart/hooks/useCartStore';
import { MenuItemCard } from '@/features/menu/components/MenuItemCard';
import { MenuGridSkeleton } from '@/features/menu/components/MenuSkeleton';

import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type MenuCategory,
} from '@/features/menu/types/menu.types';

type SortOption =
  | 'name_asc'
  | 'name_desc'
  | 'price_asc'
  | 'price_desc'
  | 'newest'
  | 'oldest'
  | 'category_asc';

const MAX_PRICE = 5000;

export default function MenuFiltersPage() {
  const navigate = useNavigate();
  const { getItemCount, getTotal } = useCartStore();

  const itemCount = getItemCount();
  const subtotal = getTotal();

  // Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<MenuCategory | 'all'>('all');
  const [isVeg, setIsVeg] = useState<'all' | 'true' | 'false'>('all');
  const [isSpicy, setIsSpicy] = useState<'all' | 'true' | 'false'>('all');
  const [sort, setSort] = useState<SortOption>('category_asc');

  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [sliderRange, setSliderRange] = useState<[number, number]>([0, MAX_PRICE]);

  const [debouncedMinPrice, setDebouncedMinPrice] = useState<number | undefined>();
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState<number | undefined>();

  // Price debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const min = minPriceInput.trim() === '' ? undefined : Math.max(0, Number(minPriceInput));
      const max = maxPriceInput.trim() === '' ? undefined : Number(maxPriceInput);
      setDebouncedMinPrice(min);
      setDebouncedMaxPrice(max);
    }, 600);
    return () => clearTimeout(timer);
  }, [minPriceInput, maxPriceInput]);

  useEffect(() => {
    const [min, max] = sliderRange;
    setMinPriceInput(min === 0 ? '' : min.toString());
    setMaxPriceInput(max === MAX_PRICE ? '' : max.toString());
  }, [sliderRange]);

  // Query
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMenuFilters({
      search: search.trim() || undefined,
      category: category === 'all' ? undefined : category,
      isVeg: isVeg === 'all' ? undefined : isVeg === 'true',
      isSpicy: isSpicy === 'all' ? undefined : isSpicy === 'true',
      minPrice: debouncedMinPrice,
      maxPrice: debouncedMaxPrice,
      sort,
      availableOnly: true,
      limit: 20,
    });

  const allItems = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data?.pages]);
  const totalResults = data?.pages[0]?.pagination.total ?? 0;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (category !== 'all') count++;
    if (isVeg !== 'all') count++;
    if (isSpicy !== 'all') count++;
    if (debouncedMinPrice !== undefined || debouncedMaxPrice !== undefined) count++;
    if (sort !== 'category_asc') count++;
    return count;
  }, [search, category, isVeg, isSpicy, debouncedMinPrice, debouncedMaxPrice, sort]);

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setCategory('all');
    setIsVeg('all');
    setIsSpicy('all');
    setSort('category_asc');
    setMinPriceInput('');
    setMaxPriceInput('');
    setSliderRange([0, MAX_PRICE]);
  }, []);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 600 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleVegChange = (value: string) => {
    if (value === 'all' || value === 'true' || value === 'false') setIsVeg(value as any);
  };

  const handleSpicyChange = (value: string) => {
    if (value === 'all' || value === 'true' || value === 'false') setIsSpicy(value as any);
  };

  const resetPriceRange = () => {
    setSliderRange([0, MAX_PRICE]);
    setMinPriceInput('');
    setMaxPriceInput('');
  };

  const priceRangeActive = debouncedMinPrice !== undefined || debouncedMaxPrice !== undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-24 md:pb-32 relative">
      {/* Header - still sticky */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-lg shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2.5">
                <ChefHat className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Our Menu</h1>
                <p className="text-sm text-muted-foreground">
                  {totalResults > 0
                    ? `${totalResults.toLocaleString()} items`
                    : 'Find your favorite dish'}
                </p>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="px-3 py-1 text-sm">
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Filters - now scroll naturally (no sticky) */}
      <section className="bg-background border-b">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Quick filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 pl-9 pr-8 text-sm"
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearch('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Other selects - more compact */}
              <Select value={category} onValueChange={(v) => setCategory(v as MenuCategory | 'all')}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                    const Icon = CATEGORY_ICONS[key as MenuCategory];
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Select value={isVeg} onValueChange={handleVegChange}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Diet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="true">Veg</SelectItem>
                  <SelectItem value="false">Non-veg</SelectItem>
                </SelectContent>
              </Select>

              <Select value={isSpicy} onValueChange={handleSpicyChange}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Spice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="true">Spicy</SelectItem>
                  <SelectItem value="false">Mild</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category_asc">Default</SelectItem>
                  <SelectItem value="name_asc">A → Z</SelectItem>
                  <SelectItem value="price_asc">Low → High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Range - more compact */}
            <Card className="p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">Price Range</Label>
                {priceRangeActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetPriceRange}
                    className="h-7 px-2 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>

              <Slider
                value={sliderRange}
                onValueChange={(v) => setSliderRange(v as [number, number])}
                max={MAX_PRICE}
                step={50}
                className="mb-4"
              />

              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Rs. {sliderRange[0].toLocaleString()}</span>
                <span className="font-medium">Rs. {sliderRange[1].toLocaleString()}</span>
              </div>
            </Card>

            {activeFilterCount > 0 && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Menu Content */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        {isLoading && allItems.length === 0 ? (
          <MenuGridSkeleton count={12} />
        ) : error ? (
          <Card className="p-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-bold mb-2">Connection Error</h3>
            <p className="text-muted-foreground mb-6">Please try again later</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </Card>
        ) : allItems.length === 0 ? (
          <Card className="p-12 text-center">
            <FilterIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-6" />
            <h3 className="text-xl font-semibold mb-3">No results found</h3>
            <p className="text-muted-foreground mb-6">Try different filters</p>
            <Button onClick={clearAllFilters}>Clear Filters</Button>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {allItems.map((item, index) => (
                <div
                  key={item._id}
                  className="animate-in fade-in slide-in-from-bottom-6 duration-700"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <MenuItemCard item={item} />
                </div>
              ))}
            </div>

            {isFetchingNextPage && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            )}
          </>
        )}
      </section>

      {/* Slim fixed cart button on bottom-right side */}
      {itemCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50 md:bottom-8 md:right-8">
          <Button
            onClick={() => navigate('/cart')}
            size="icon"
            className="h-14 w-14 md:h-16 md:w-16 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center bg-primary text-primary-foreground"
          >
            <div className="relative">
              <ShoppingCart className="h-7 w-7" />
              <Badge
                variant="secondary"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 text-xs flex items-center justify-center bg-destructive text-destructive-foreground border-2 border-background"
              >
                {itemCount}
              </Badge>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}