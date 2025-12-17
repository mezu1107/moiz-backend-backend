// src/pages/Home.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Star, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuItemCard } from "@/features/menu/components/MenuItemCard";
import { useFullMenuCatalog } from "@/features/menu/hooks/useMenuApi";
import { Footer } from "@/components/Footer";

import {
  MenuCategory,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from "@/features/menu/types/menu.types";

interface HomeProps {
  openAreaChecker: () => void;
}

export const Home: React.FC<HomeProps> = ({ openAreaChecker }) => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useFullMenuCatalog();

  const allItems = data?.menu || [];
  const featuredItems = allItems.slice(0, 9);

  const promotionalTexts = [
    { main: "CASHBACK", sub: "up to 30% cashback on all orders" },
    { main: "FREE DELIVERY", sub: "Free delivery on orders above Rs. 500" },
    { main: "SPECIAL DISCOUNT", sub: "Get 20% off on your first order" },
  ];

  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromoIndex((prev) => (prev + 1) % promotionalTexts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Dynamically generate categories from centralized constants
  // Order is preserved from the object key order in CATEGORY_LABELS (which is insertion order)
  const categories = (Object.keys(CATEGORY_LABELS) as MenuCategory[]).map((cat) => ({
    category: cat,
    name: CATEGORY_LABELS[cat],
    link: `/menu?category=${cat}`,
  }));

  const testimonials = [
    { name: "Ahmed Khan", rating: 5, comment: "Best Pakistani food in town! The biryani is absolutely amazing." },
    { name: "Fatima Ali", rating: 5, comment: "Fast delivery and delicious food. Highly recommended!" },
    { name: "Hassan Raza", rating: 5, comment: "Authentic taste that reminds me of home-cooked meals." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background min-h-[80vh] lg:min-h-screen flex items-center py-10 lg:py-0">
        {/* Left: Rotating Food Plate */}
        <motion.div
          initial={{ opacity: 0, x: -200 }}
          animate={{ opacity: 1, x: -200 }}
          transition={{ duration: 0.8 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 hidden xl:block pointer-events-none"
        >
          <div className="relative w-[400px] h-[400px] 2xl:w-[500px] 2xl:h-[500px]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
            >
              <img
                src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop"
                alt="Delicious Pakistani Biryani"
                className="rounded-full w-full h-full object-cover border-8 border-primary/20 shadow-2xl"
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Right: Phone Mockup */}
        <motion.div
          initial={{ opacity: 0, x: 200 }}
          animate={{ opacity: 1, x: 150 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 hidden 2xl:block pointer-events-none"
        >
          <div className="w-[320px] h-[640px] bg-gradient-to-b from-card to-muted rounded-[3rem] border-8 border-foreground/20 shadow-2xl overflow-hidden">
            <div className="p-6 pt-12">
              <h3 className="text-2xl font-bold text-primary text-center mb-2">SUPERMEAL</h3>
              <p className="text-sm text-center text-muted-foreground mb-6">
                up to 30% cashback on all orders
              </p>
              <div className="bg-background/80 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>Hancock Road, Birmingham</span>
                </div>
              </div>
              <Button className="w-full" size="lg">
                Redeem a voucher
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Main Hero Content */}
        <div className="container mx-auto px-4 relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
              <span className="text-foreground">SUPER</span>
              <br />
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentPromoIndex}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.6 }}
                  className="text-primary inline-block"
                >
                  {promotionalTexts[currentPromoIndex].main}
                </motion.span>
              </AnimatePresence>
            </h1>

            <AnimatePresence mode="wait">
              <motion.p
                key={`sub-${currentPromoIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
              >
                {promotionalTexts[currentPromoIndex].sub}
              </motion.p>
            </AnimatePresence>

            {/* Area Search */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto mb-12">
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <input
                  type="text"
                  placeholder="Enter your town or postcode"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={openAreaChecker}
                  readOnly
                />
              </div>
              <Button size="lg" className="px-10" onClick={openAreaChecker}>
                SEARCH
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4 justify-center items-center">
              <Button variant="outline" size="lg">
                GET THE APP
              </Button>
              <Button variant="secondary" size="lg">
                Redeem a voucher
              </Button>
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-card border-2 border-border flex items-center justify-center hover:border-primary transition cursor-pointer">
                  <span className="text-2xl">Apple</span>
                </div>
                <div className="w-12 h-12 rounded-lg bg-card border-2 border-border flex items-center justify-center hover:border-primary transition cursor-pointer">
                  <span className="text-2xl">Play</span>
                </div>
                <div className="w-12 h-12 rounded-lg bg-card border-2 border-border flex items-center justify-center hover:border-primary transition cursor-pointer">
                  <span className="text-2xl">Phone</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Explore Our Menu</h2>
          <p className="text-muted-foreground text-lg">
            From breakfast to dinner, find your favorite Pakistani dishes
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {categories.map((cat, i) => {
            const Icon = CATEGORY_ICONS[cat.category];
            return (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={cat.link}
                  className="group block p-10 bg-card rounded-3xl text-center hover:shadow-2xl hover:-translate-y-4 transition-all duration-500 border border-border"
                >
                  <div className="text-7xl mb-6 group-hover:scale-110 transition-transform">
                    <Icon className="mx-auto" />
                  </div>
                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Popular Dishes */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Popular Dishes</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Most ordered and loved by our customers
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-20">
            <Package className="h-20 w-20 mx-auto mb-6 text-muted-foreground/30" />
            <p className="text-xl text-destructive mb-8">Failed to load menu</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : allItems.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-20 w-20 mx-auto mb-6 text-muted-foreground/30" />
            <p className="text-xl text-muted-foreground">No items available right now</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {featuredItems.map((item, index) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="hover:scale-105 transition-transform duration-300"
                >
                  <MenuItemCard item={item} />
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button asChild size="lg">
                <Link to="/menu">View Full Menu →</Link>
              </Button>
            </div>
          </>
        )}
      </section>

      {/* Testimonials */}
      <section className="bg-muted/30 py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-muted-foreground text-lg">Real reviews from real food lovers</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-card p-8 rounded-2xl shadow-lg border"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">"{t.comment}"</p>
                <p className="font-bold text-lg">{t.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-12 text-center text-white"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Order?</h2>
          <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto">
            Discover authentic Pakistani flavors delivered straight to your door.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-lg px-12 py-6">
            <Link to="/menu">Start Ordering Now</Link>
          </Button>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;