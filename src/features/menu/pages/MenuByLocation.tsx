import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ShoppingCart,
  Share2,
  Globe,
  MapPin,
  Package,
  Truck,
  AlertTriangle,
} from "lucide-react";
import { Helmet } from "react-helmet-async";

import { useMenuByArea } from "../hooks/useMenuApi";
import { MenuHeader } from "../components/MenuHeader";
import { MenuFilters } from "../components/MenuFilters";
import { MenuItemCard } from "../components/MenuItemCard";
import { MenuPageSkeleton } from "../components/MenuSkeleton";
import { useCartStore } from "@/features/cart/hooks/useCartStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type MenuCategory,
  type MenuItem,
} from "../types/menu.types";

export default function MenuByLocationPage() {
  // ── ALL HOOKS FIRST (NO RETURNS ABOVE THIS LINE) ────────────────────
  const navigate = useNavigate();
  const { areaId: paramAreaId } = useParams<{ areaId?: string }>();

  const queryAreaId = new URLSearchParams(window.location.search).get("area");
  const storedAreaId = localStorage.getItem("selectedAreaId");
  const areaId = paramAreaId || queryAreaId || storedAreaId;

  const { data, isLoading, error } = useMenuByArea(areaId || undefined);
  const { getItemCount, getTotal } = useCartStore();

  const itemCount = getItemCount();
  const subtotal = getTotal(); // (kept if you need later)

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<MenuCategory | null>(null);
  const [isVeg, setIsVeg] = useState<boolean | null>(null);
  const [isSpicy, setIsSpicy] = useState<boolean | null>(null);

  useEffect(() => {
    if (!areaId && !isLoading) {
      toast.error("Please select a delivery location first");
      navigate("/", { replace: true });
    } else if (areaId) {
      localStorage.setItem("selectedAreaId", areaId);
    }
  }, [areaId, isLoading, navigate]);

  // ── SAFE DERIVED DATA (ALWAYS EXECUTES) ─────────────────────────────
  const menuItems = data?.menu ?? [];
  const area = data?.area;
  const delivery = data?.delivery;
  const hasDelivery = data?.hasDeliveryZone ?? false;

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.isAvailable) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !item.name.toLowerCase().includes(q) &&
          !(item.description?.toLowerCase().includes(q) ?? false)
        )
          return false;
      }

      if (selectedCategory && item.category !== selectedCategory) return false;
      if (isVeg !== null && item.isVeg !== isVeg) return false;
      if (isSpicy !== null && item.isSpicy !== isSpicy) return false;

      return true;
    });
  }, [menuItems, search, selectedCategory, isVeg, isSpicy]);

  const groupedItems = useMemo<Record<MenuCategory, MenuItem[]>>(() => {
    const groups: Record<MenuCategory, MenuItem[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      desserts: [],
      beverages: [],
    };
    filteredItems.forEach((item) => {
      groups[item.category]?.push(item);
    });
    return groups;
  }, [filteredItems]);

  const hasAnyItems = Object.values(groupedItems).some(
    (items) => items.length > 0
  );

  const handleShare = useCallback(async () => {
    if (!area) return;

    const url = window.location.href;
    const title = `Order from ${area.name}, ${area.city}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        toast.success("Menu shared!");
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Menu link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  }, [area]);

  // ── EARLY RETURNS (NOW 100% SAFE) ───────────────────────────────────
  if (isLoading) return <MenuPageSkeleton />;

  if (error || !data || !area) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md p-10 text-center">
          <MapPin className="mx-auto h-16 w-16 mb-6" />
          <h1 className="text-2xl font-bold mb-4">Not Available Here</h1>
          <p className="mb-8">
            {data?.message ||
              "We're not serving this area yet. More locations coming soon!"}
          </p>
          <Button onClick={() => navigate("/")}>Choose Another Location</Button>
        </Card>
      </main>
    );
  }

 
  return (
    <>
      <Helmet>
        <title>{area.name} Menu • Order Food Online in {area.city}</title>
        <meta name="description" content={`Browse and order delicious food from ${area.name} in ${area.city}. Fast delivery available!`} />
      </Helmet>

      <main className="min-h-screen bg-gradient-to-b from-muted/20 to-background relative pb-24 md:pb-32">
        <MenuHeader
          areaName={area.name}
          city={area.city}
          deliveryFee={delivery?.fee}
          minOrder={delivery?.minOrder}
          estimatedTime={delivery?.estimatedTime}
          hasDelivery={hasDelivery}
          onChangeLocation={() => navigate('/')}
        />

        {/* Status + Share */}
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b">
          <div className="flex items-center gap-3 flex-wrap">
            {hasDelivery ? (
              <Badge className="gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border-primary/20">
                <Truck className="h-3.5 w-3.5" />
                Delivery Available
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                <Package className="h-3.5 w-3.5" />
                Pickup / Coming Soon
              </Badge>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
            <Share2 className="h-4 w-4" />
            Share Menu
          </Button>
        </div>

        {/* Filters */}
        <section className="bg-background/95 border-b shadow-sm">
          <div className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
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

        {/* Menu Content */}
        <section className="container mx-auto px-4 py-8 md:py-12">
          {!hasAnyItems ? (
            <Card className="p-12 md:p-16 text-center border-muted shadow-md max-w-2xl mx-auto">
              <AlertTriangle className="mx-auto h-16 w-16 text-muted-foreground/50 mb-6" />
              <h2 className="text-2xl md:text-3xl font-bold mb-4">No matching dishes</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Try adjusting filters to see available items in {area.name}
              </p>
              <Button size="lg" onClick={() => {
                setSearch('');
                setSelectedCategory(null);
                setIsVeg(null);
                setIsSpicy(null);
              }}>
                Show All Available Items
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
                            Available Everywhere
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

        {/* Slim fixed cart – bottom-right corner */}
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
    </>
  );
}