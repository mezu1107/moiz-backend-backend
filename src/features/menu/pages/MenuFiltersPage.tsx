// src/pages/MenuFiltersPage.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first design with fluid layout, touch-friendly controls, infinite scroll
// Optimized filters, sticky sections, floating cart button

import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Search, X, Filter as FilterIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

import { useMenuFilters } from "@/features/menu/hooks/useMenuApi";
import { useCartStore } from "@/features/cart/hooks/useCartStore";
import { MenuItemCard } from "../components/MenuItemCard";
import { MenuGridSkeleton } from "../components/MenuSkeleton";

import { CATEGORY_LABELS, type MenuCategory } from "@/features/menu/types/menu.types";

type SortOption =
  | "name_asc"
  | "name_desc"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "oldest"
  | "category_asc";

export default function MenuFiltersPage() {
  const navigate = useNavigate();
  const { getItemCount, getTotal } = useCartStore();

  const itemCount = getItemCount();
  const subtotal = getTotal();

  const [search, setSearch] = useState<string>("");
  const [category, setCategory] = useState<MenuCategory | "">("");
  const [isVeg, setIsVeg] = useState<boolean | undefined>(undefined);
  const [isSpicy, setIsSpicy] = useState<boolean | undefined>(undefined);
  const [sort, setSort] = useState<SortOption>("category_asc");

  const [minPriceInput, setMinPriceInput] = useState<string>("");
  const [maxPriceInput, setMaxPriceInput] = useState<string>("");
  const [sliderRange, setSliderRange] = useState<number[]>([0, 2000]);
  const [debouncedMinPrice, setDebouncedMinPrice] = useState<number | undefined>();
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState<number | undefined>();

  // Debounce price inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      const min = minPriceInput === "" ? undefined : Number(minPriceInput);
      const max = maxPriceInput === "" ? undefined : Number(maxPriceInput);
      setDebouncedMinPrice(min);
      setDebouncedMaxPrice(max);
    }, 600);
    return () => clearTimeout(timer);
  }, [minPriceInput, maxPriceInput]);

  // Sync slider with debounced values
  useEffect(() => {
    setSliderRange([
      debouncedMinPrice ?? 0,
      debouncedMaxPrice ?? 2000,
    ]);
  }, [debouncedMinPrice, debouncedMaxPrice]);

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useMenuFilters({
    search: search.trim() || undefined,
    category: category || undefined,
    isVeg,
    isSpicy,
    minPrice: debouncedMinPrice,
    maxPrice: debouncedMaxPrice,
    sort,
    availableOnly: true,
    limit: 20,
  });

  const allItems = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data?.pages]);
  const totalResults = data?.pages[0]?.pagination.total ?? 0;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (category) count++;
    if (isVeg !== undefined) count++;
    if (isSpicy !== undefined) count++;
    if (debouncedMinPrice !== undefined || debouncedMaxPrice !== undefined) count++;
    if (sort !== "category_asc") count++;
    return count;
  }, [search, category, isVeg, isSpicy, debouncedMinPrice, debouncedMaxPrice, sort]);

  const clearAllFilters = () => {
    setSearch("");
    setCategory("");
    setIsVeg(undefined);
    setIsSpicy(undefined);
    setSort("category_asc");
    setMinPriceInput("");
    setMaxPriceInput("");
    setSliderRange([0, 2000]);
  };

  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop + 1200 >=
      document.documentElement.offsetHeight &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Page Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto px-4 py-5 md:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold md:text-4xl lg:text-5xl">Menu</h1>
              <p className="mt-1 text-sm text-muted-foreground md:text-base">
                {totalResults > 0
                  ? `${totalResults.toLocaleString()} delicious item${totalResults > 1 ? "s" : ""}`
                  : "Browse our full selection"}
              </p>
            </div>

            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="self-start px-4 py-2 text-sm md:text-base">
                <FilterIcon className="mr-2 h-4 w-4" />
                {activeFilterCount} active filter{activeFilterCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Sticky Filters Panel */}
      <section className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md md:top-20">
        <div className="container mx-auto px-4 py-5 md:py-6">
          <div className="space-y-5">
            {/* Primary Filters – Responsive Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search dishes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 pl-11 pr-10"
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Category */}
              <Select value={category} onValueChange={(v) => setCategory(v as MenuCategory | "")}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {(Object.keys(CATEGORY_LABELS) as MenuCategory[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Diet */}
              <Select
                value={isVeg === undefined ? "" : String(isVeg)}
                onValueChange={(v) => setIsVeg(v === "" ? undefined : v === "true")}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Any Diet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Diet</SelectItem>
                  <SelectItem value="true">Vegetarian Only</SelectItem>
                  <SelectItem value="false">Non-Veg Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Spice */}
              <Select
                value={isSpicy === undefined ? "" : String(isSpicy)}
                onValueChange={(v) => setIsSpicy(v === "" ? undefined : v === "true")}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Any Spice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Spice</SelectItem>
                  <SelectItem value="true">Spicy Only</SelectItem>
                  <SelectItem value="false">Mild Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category_asc">Category</SelectItem>
                  <SelectItem value="name_asc">Name A-Z</SelectItem>
                  <SelectItem value="name_desc">Name Z-A</SelectItem>
                  <SelectItem value="price_asc">Low to High</SelectItem>
                  <SelectItem value="price_desc">High to Low</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <Card className="p-4 md:p-6">
              <Label className="mb-4 block text-base font-semibold md:text-lg">Price Range</Label>
              <Slider
                value={sliderRange}
                onValueChange={setSliderRange}
                max={2000}
                step={50}
                className="mb-5"
              />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className="w-28"
                  />
                  <span className="text-muted-foreground">—</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className="w-28"
                  />
                </div>
                <span className="font-medium text-base md:text-lg">
                  Rs. {sliderRange[0]} - Rs. {sliderRange[1]}
                </span>
              </div>
            </Card>

            {/* Clear All */}
            {activeFilterCount > 0 && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={clearAllFilters}>
                  <X className="mr-2 h-5 w-5" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Menu Grid Content */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        {isLoading ? (
          <MenuGridSkeleton count={12} />
        ) : error ? (
          <Card className="p-12 text-center md:p-20">
            <p className="text-xl font-semibold text-destructive md:text-2xl">
              Failed to load menu
            </p>
            <Button size="lg" className="mt-6" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </Card>
        ) : allItems.length === 0 ? (
          <Card className="p-12 text-center md:p-20">
            <FilterIcon className="mx-auto mb-6 h-16 w-16 text-muted-foreground/40 md:mb-8 md:h-20 md:w-20" />
            <h3 className="text-2xl font-bold md:text-3xl">No items match your filters</h3>
            <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground md:text-lg">
              Try adjusting your search or filters to see more options
            </p>
            <Button size="lg" className="mt-8" onClick={clearAllFilters}>
              Clear All Filters
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {allItems.map((item, index) => (
                <div
                  key={item._id}
                  className="animate-in fade-in slide-in-from-bottom-8 duration-600"
                  style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                >
                  <MenuItemCard item={item} />
                </div>
              ))}
            </div>

            {/* Infinite Scroll Loader */}
            {isFetchingNextPage && (
              <div className="mt-12 flex flex-col items-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading more items...</p>
              </div>
            )}

            {/* End of Results */}
            {!hasNextPage && allItems.length > 0 && (
              <div className="mt-16 text-center">
                <Badge variant="secondary" className="px-6 py-3 text-base">
                  End of menu • {allItems.length} item{allItems.length > 1 ? "s" : ""} shown
                </Badge>
              </div>
            )}
          </>
        )}
      </section>

      {/* Floating Cart Button – only when cart has items */}
      {itemCount > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4">
          <Button
            onClick={() => navigate("/cart")}
            size="lg"
            className="h-14 w-full max-w-md rounded-full px-8 text-base font-bold shadow-2xl sm:h-16 sm:text-lg"
          >
            <ShoppingCart className="mr-3 h-6 w-6" />
            View Cart • {itemCount} item{itemCount > 1 ? "s" : ""}
            <span className="ml-4 font-extrabold">
              Rs. {Number(subtotal).toLocaleString()}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}