// src/features/menu/pages/MenuAllPage.tsx
import { useState, useMemo } from "react";
import { useFullMenuCatalog } from "../hooks/useMenuApi";
import { MenuItemCard } from "../components/MenuItemCard";
import { MenuPageSkeleton } from "../components/MenuSkeleton"; // ← Updated import path
import { MenuCategory, CATEGORY_LABELS, CATEGORY_ICONS } from "../types/menu.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, UtensilsCrossed, Filter } from "lucide-react"; // ← Fixed: Added Filter

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
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background border-b">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
        <div className="container mx-auto px-4 py-20 text-center relative z-10">
          <div className="inline-flex items-center justify-center gap-4 mb-8">
            <UtensilsCrossed className="h-14 w-14 text-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Our Complete Menu
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
            Fresh, delicious, and made with love — explore every dish we offer
          </p>
          {totalItems > 0 && (
            <Badge variant="secondary" className="text-lg px-8 py-4 font-medium">
              {totalItems} mouthwatering item{totalItems > 1 ? "s" : ""} available
            </Badge>
          )}
        </div>
      </div>

      {/* Sticky Category Tabs */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-lg">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-wrap justify-center gap-4">
            {allCategories.map((cat) => {
              const Icon = cat === "all" ? Filter : CATEGORY_ICONS[cat as MenuCategory];
              const count = cat === "all" ? totalItems : categoryCounts[cat as MenuCategory] ?? 0;
              const isActive = selectedCategory === cat;

              return (
                <Button
                  key={cat}
                  variant={isActive ? "default" : "outline"}
                  size="lg"
                  onClick={() => setSelectedCategory(cat)}
                  className={`
                    gap-3 font-semibold transition-all duration-300
                    ${isActive 
                      ? "shadow-xl ring-4 ring-primary/20" 
                      : "hover:shadow-lg hover:scale-105 hover:bg-accent/70"
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  {cat === "all" ? "All Items" : CATEGORY_LABELS[cat as MenuCategory]}
                  <Badge variant="secondary" className="ml-2 px-2 py-0.5 text-xs">
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <MenuPageSkeleton />
        ) : error ? (
          <div className="text-center py-32">
            <div className="w-32 h-32 mx-auto mb-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/40" />
            </div>
            <h2 className="text-3xl font-bold text-destructive mb-6">
              Unable to load menu
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
              We're having trouble fetching the menu. Please check your connection and try again.
            </p>
            <Button size="lg" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-32 bg-muted/30 rounded-3xl">
            <div className="w-32 h-32 mx-auto mb-10 rounded-full bg-muted/60 flex items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/40" />
            </div>
            <h3 className="text-3xl font-bold mb-4">No items in this category</h3>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              We're constantly adding new delicious options. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredItems.map((item, index) => (
              <div
                key={item._id}
                className="animate-in fade-in slide-in-from-bottom-12 duration-700"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <MenuItemCard item={item} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuAllPage;