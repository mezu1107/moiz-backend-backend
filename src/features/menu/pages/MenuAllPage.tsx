// src/features/menu/pages/MenuAllPage.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first, fluid layout, touch-friendly tabs, smooth animations
// Optimized for performance and accessibility

import { useState, useMemo } from "react";
import { useFullMenuCatalog } from "../hooks/useMenuApi";
import { MenuItemCard } from "../components/MenuItemCard";
import { MenuPageSkeleton } from "../components/MenuSkeleton";
import { MenuCategory, CATEGORY_LABELS, CATEGORY_ICONS } from "../types/menu.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, UtensilsCrossed, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const allCategories: (MenuCategory | "all")[] = [
  "all",
  "breakfast",
  "lunch",
  "dinner",
  "desserts",
  "beverages",
];

export const MenuAllPage = () => {
  const { data, isLoading, error } = useFullMenuCatalog();
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | "all">("all");

  const items = data?.menu ?? [];
  const totalItems = data?.totalItems ?? 0;

  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return items;
    return items.filter((item) => item.category === selectedCategory);
  }, [items, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<MenuCategory, number>> = {};
    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
        <div className="container mx-auto px-4 py-12 text-center md:py-16 lg:py-20">
          <UtensilsCrossed className="mx-auto mb-6 h-12 w-12 text-primary md:mb-8 md:h-14 md:w-14 lg:h-16 lg:w-16" />
          <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Our Complete Menu
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:mt-6 md:text-lg lg:text-xl">
            Fresh, delicious, and made with love — explore every dish we offer
          </p>
          {totalItems > 0 && (
            <Badge variant="secondary" className="mt-6 px-6 py-3 text-base font-medium md:mt-8 md:text-lg">
              {totalItems} mouthwatering item{totalItems > 1 ? "s" : ""} available
            </Badge>
          )}
        </div>
      </section>

      {/* Sticky Category Filter Tabs */}
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {allCategories.map((cat) => {
              const Icon = cat === "all" ? Filter : CATEGORY_ICONS[cat as MenuCategory];
              const label = cat === "all" ? "All Items" : CATEGORY_LABELS[cat as MenuCategory];
              const count = cat === "all" ? totalItems : categoryCounts[cat as MenuCategory] ?? 0;
              const isActive = selectedCategory === cat;

              return (
                <Button
                  key={cat}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "gap-2 font-medium transition-all duration-200",
                    "px-4 py-5 text-sm sm:text-base",
                    isActive
                      ? "shadow-lg ring-2 ring-primary/30"
                      : "hover:shadow-md hover:scale-105"
                  )}
                  onClick={() => setSelectedCategory(cat)}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={`${label} (${count} items)`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden xs:inline">{label}</span>
                  <span className="inline xs:hidden">{label.charAt(0)}</span>
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <section className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        {isLoading ? (
          <MenuPageSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center md:py-32">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-muted/50 md:mb-10 md:h-32 md:w-32">
              <Package className="h-12 w-12 text-muted-foreground/40 md:h-16 md:w-16" />
            </div>
            <h2 className="text-2xl font-bold text-destructive md:text-3xl lg:text-4xl">
              Unable to load menu
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground md:mt-6 md:text-lg">
              We're having trouble fetching the menu. Please check your connection and try again.
            </p>
            <Button size="lg" className="mt-8" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-muted/30 py-20 text-center md:py-32">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-muted/60 md:mb-10 md:h-32 md:w-32">
              <Package className="h-12 w-12 text-muted-foreground/40 md:h-16 md:w-16" />
            </div>
            <h3 className="text-2xl font-bold md:text-3xl lg:text-4xl">
              No items in this category
            </h3>
            <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground md:mt-6 md:text-lg">
              We're constantly adding new delicious options. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item, index) => (
              <div
                key={item._id}
                className="animate-in fade-in slide-in-from-bottom-8 duration-700"
                style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
              >
                <MenuItemCard item={item} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MenuAllPage;