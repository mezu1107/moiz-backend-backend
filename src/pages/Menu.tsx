import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MenuItemCard } from "@/components/MenuItemCard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { mockMenuItems } from "@/lib/mockData";
import { categories } from "@/utils/mockdata/categories";

export const Menu = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [vegFilter, setVegFilter] = useState<boolean | null>(null);
  const [spicyFilter, setSpicyFilter] = useState<boolean | null>(null);

  const filteredItems = useMemo(() => {
    return mockMenuItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const matchesVeg = vegFilter === null || item.isVeg === vegFilter;
      const matchesSpicy = spicyFilter === null || item.isSpicy === spicyFilter;

      return matchesSearch && matchesCategory && matchesVeg && matchesSpicy;
    });
  }, [searchQuery, selectedCategory, vegFilter, spicyFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
            Our Menu
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            Explore our delicious selection of authentic Pakistani cuisine
          </p>
        </motion.div>

        <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <Input
              placeholder="Search for dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base"
            />
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
            <Button
              variant={vegFilter === true ? "default" : "outline"}
              size="sm"
              onClick={() => setVegFilter(vegFilter === true ? null : true)}
              className="text-xs sm:text-sm"
            >
              🌿 Vegetarian
            </Button>
            <Button
              variant={vegFilter === false ? "default" : "outline"}
              size="sm"
              onClick={() => setVegFilter(vegFilter === false ? null : false)}
              className="text-xs sm:text-sm"
            >
              🍖 Non-Veg
            </Button>
            <Button
              variant={spicyFilter === true ? "default" : "outline"}
              size="sm"
              onClick={() => setSpicyFilter(spicyFilter === true ? null : true)}
              className="text-xs sm:text-sm"
            >
              🌶️ Spicy
            </Button>
            <Button
              variant={spicyFilter === false ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setSpicyFilter(spicyFilter === false ? null : false)
              }
              className="text-xs sm:text-sm"
            >
              ❄️ Mild
            </Button>
            {(vegFilter !== null || spicyFilter !== null) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setVegFilter(null);
                  setSpicyFilter(null);
                }}
                className="text-xs sm:text-sm"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        <Tabs
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          className="mb-6 sm:mb-8"
        >
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto gap-1 sm:gap-2 p-1">
            {categories.map((category) => (
              <TabsTrigger
                key={category.value}
                value={category.value}
                className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3"
              >
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Menu Items Grid */}
        {filteredItems.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
          >
            {filteredItems.map((item, index) => (
              <MenuItemCard key={item.id} item={item} index={index} />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12 sm:py-20">
            <Filter className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              No items found
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Try adjusting your filters or search query
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Menu;
