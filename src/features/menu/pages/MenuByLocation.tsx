import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ShoppingCart,
  Share2,
  Globe,
  MapPin,
  Package,
  Truck,
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
  const navigate = useNavigate();
  const { areaId: paramAreaId } = useParams<{ areaId?: string }>();

  const queryAreaId = new URLSearchParams(window.location.search).get("area");
  const urlAreaId = paramAreaId || queryAreaId;
  const storedAreaId = localStorage.getItem("selectedAreaId");
  const areaId = urlAreaId || storedAreaId;

  const { data, isLoading, error } = useMenuByArea(areaId || undefined);
const { getItemCount, getTotal } = useCartStore();

const itemCount = getItemCount();
const subtotal = getTotal();
;

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<MenuCategory | null>(null);
  const [isVeg, setIsVeg] = useState<boolean | null>(null);
  const [isSpicy, setIsSpicy] = useState<boolean | null>(null);

  useEffect(() => {
    if (!areaId && !isLoading) {
      toast.error("Please select a delivery location");
      navigate("/", { replace: true });
    } else if (areaId) {
      localStorage.setItem("selectedAreaId", areaId);
    }
  }, [areaId, isLoading, navigate]);

  const menuItems = data?.menu ?? [];
  const area = data?.area;
  const delivery = data?.delivery;
  const hasDelivery = data?.hasDeliveryZone ?? false;
  const message = data?.message;

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.isAvailable) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
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

  const hasGlobalItemsInCategory = (cat: MenuCategory) =>
    groupedItems[cat].some((item) => item.availableInAreas.length === 0);

  const handleShare = async () => {
    const url = window.location.href;
    const title = `Order from ${area?.name} Menu`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        toast.success("Menu shared!");
        return;
      } catch {}
    }

    await navigator.clipboard.writeText(url);
    toast.success("Menu link copied to clipboard!");
  };

  if (isLoading) return <MenuPageSkeleton />;

  if (error || !data || !area) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-10 text-center space-y-8">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h2 className="text-3xl font-bold mb-4">
              Delivery Not Available Here
            </h2>
            <p className="text-muted-foreground">
              {message ||
                "We're not serving this location yet. More areas coming soon!"}
            </p>
          </div>
          <Button size="lg" onClick={() => navigate("/")}>
            Change Location
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {area.name} Menu • Order Food Online in {area.city}
        </title>
      </Helmet>

      <div className="min-h-screen pb-32">
        <MenuHeader
          areaName={area.name}
          city={area.city}
          deliveryFee={delivery?.fee}
          minOrder={delivery?.minOrder}
          estimatedTime={delivery?.estimatedTime}
          hasDelivery={hasDelivery}
          onChangeLocation={() => navigate("/")}
        />

        <div className="container mx-auto px-4 py-4 flex justify-between">
          {hasDelivery ? (
            <Badge className="gap-2">
              <Truck className="h-4 w-4" /> Delivery Available
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Package className="h-4 w-4 mr-1" /> Setup in Progress
            </Badge>
          )}

          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

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
        </div>

        <div className="container mx-auto px-4 py-12">
          {(Object.keys(groupedItems) as MenuCategory[]).map((cat) => {
            const items = groupedItems[cat];
            if (!items.length) return null;

            const Icon = CATEGORY_ICONS[cat];

            return (
              <section key={cat} className="mb-20">
                <h2 className="text-4xl font-bold mb-8 flex gap-4">
                  <Icon className="h-10 w-10" />
                  {CATEGORY_LABELS[cat]}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {items.map((item) => (
                    <MenuItemCard key={item._id} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {itemCount > 0 && (
          <div className="fixed bottom-6 inset-x-0 px-4">
            <Button
              size="lg"
              className="w-full h-16 text-lg font-bold"
              onClick={() => navigate("/cart")}
            >
              <ShoppingCart className="mr-3" />
              {itemCount} item • Rs.{" "}
              {Number(subtotal).toLocaleString()}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}