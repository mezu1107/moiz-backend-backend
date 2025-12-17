// src/pages/MenuFiltersPage.tsx
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
import { useCartStore } from "@/features/cart/store/useCartStore";
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
  const { getItemCount, subtotal } = useCartStore();
  const itemCount = getItemCount();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<MenuCategory | "">("");
  const [isVeg, setIsVeg] = useState<boolean | undefined>(undefined);
  const [isSpicy, setIsSpicy] = useState<boolean | undefined>(undefined);
  const [sort, setSort] = useState<SortOption>("category_asc");

  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
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
  const totalPages = data?.pages[0]?.pagination.totalPages ?? 0;

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
      window.innerHeight + document.documentElement.scrollTop + 1000 >=
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
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold">Menu</h1>
              <p className="text-muted-foreground mt-2">
                {totalResults > 0
                  ? `${totalResults.toLocaleString()} delicious item${totalResults > 1 ? "s" : ""} available`
                  : "Browse our full selection"}
              </p>
            </div>

            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-base px-4 py-2">
                <FilterIcon className="h-4 w-4 mr-2" />
                {activeFilterCount} active filter{activeFilterCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="sticky top-[104px] z-40 bg-background/95 backdrop-blur border-b shadow-md">
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Main Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search dishes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-12"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Select value={category} onValueChange={(v) => setCategory(v as MenuCategory | "")}>
              <SelectTrigger className="h-12">
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

            <Select
              value={isVeg === undefined ? "" : String(isVeg)}
              onValueChange={(v) => setIsVeg(v === "" ? undefined : v === "true")}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Any Diet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any Diet</SelectItem>
                <SelectItem value="true">Vegetarian Only</SelectItem>
                <SelectItem value="false">Non-Veg Only</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={isSpicy === undefined ? "" : String(isSpicy)}
              onValueChange={(v) => setIsSpicy(v === "" ? undefined : v === "true")}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Any Spice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any Spice</SelectItem>
                <SelectItem value="true">Spicy Only</SelectItem>
                <SelectItem value="false">Mild Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="h-12">
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
          <Card className="p-6">
            <Label className="text-lg font-semibold mb-4 block">Price Range</Label>
            <Slider
              value={sliderRange}
              onValueChange={setSliderRange}
              max={2000}
              step={50}
              className="mb-6"
            />
            <div className="flex items-center justify-between">
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
              <span className="font-medium text-lg">
                Rs. {sliderRange[0]} - Rs. {sliderRange[1]}
              </span>
            </div>
          </Card>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <div className="flex justify-end">
              <Button variant="outline" size="lg" onClick={clearAllFilters}>
                <X className="h-5 w-5 mr-2" />
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <MenuGridSkeleton count={12} />
        ) : error ? (
          <Card className="p-20 text-center">
            <p className="text-2xl font-semibold text-destructive mb-6">
              Failed to load menu
            </p>
            <Button size="lg" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </Card>
        ) : allItems.length === 0 ? (
          <Card className="p-20 text-center bg-muted/30">
            <FilterIcon className="h-20 w-20 mx-auto mb-8 text-muted-foreground/40" />
            <h3 className="text-3xl font-bold mb-4">No items match your filters</h3>
            <p className="text-lg text-muted-foreground mb-8">
              Try adjusting your search or filters to see more options
            </p>
            <Button size="lg" onClick={clearAllFilters}>
              Clear All Filters
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {allItems.map((item) => (
                <div
                  key={item._id}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <MenuItemCard item={item} />
                </div>
              ))}
            </div>

            {/* Load More Indicator */}
            {isFetchingNextPage && (
              <div className="mt-16">
                <div className="flex justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
                <p className="text-center text-muted-foreground mt-4">Loading more items...</p>
              </div>
            )}

            {/* End of Results */}
            {!hasNextPage && (
              <div className="mt-20 text-center">
                <Badge variant="secondary" className="text-lg px-6 py-3">
                  End of menu • {allItems.length} item{allItems.length > 1 ? "s" : ""} shown
                </Badge>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <Button
            onClick={() => navigate("/cart")}
            size="lg"
            className="h-16 px-10 text-lg font-bold shadow-2xl rounded-full"
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