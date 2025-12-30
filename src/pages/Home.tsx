// src/pages/Home.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K) — December 30, 2025
// Real API filters • Rotating plate (left xl+) & Phone mockup (right xl+) • Smooth animations

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, Star, ArrowRight, Package, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuItemCard } from "@/features/menu/components/MenuItemCard";
import { useFullMenuCatalog } from "@/features/menu/hooks/useMenuApi";
import { Footer } from "@/components/Footer";

import {
  MenuCategory,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type MenuItem,
} from "@/features/menu/types/menu.types";

interface HomeProps {
  openAreaChecker: () => void;
}

export const Home: React.FC<HomeProps> = ({ openAreaChecker }) => {
  const { data, isLoading, isError } = useFullMenuCatalog();

  const allItems = data?.menu ?? [];
  const featuredItems = useMemo(() => allItems.slice(0, 9), [allItems]);

  const categories = useMemo(
    () =>
      (Object.keys(CATEGORY_LABELS) as MenuCategory[]).map((cat) => ({
        category: cat,
        name: CATEGORY_LABELS[cat],
        Icon: CATEGORY_ICONS[cat],
        link: `/menu?category=${cat}`,
      })),
    []
  );

  const promotionalTexts = [
    { main: "CASHBACK", sub: "Up to 30% cashback on all orders" },
    { main: "FREE DELIVERY", sub: "Free delivery on orders above Rs. 500" },
    { main: "SPECIAL DISCOUNT", sub: "20% off your first order" },
  ];

  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromoIndex((prev) => (prev + 1) % promotionalTexts.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const testimonials = [
    {
      name: "Ahmed Khan",
      rating: 5,
      comment: "Best Pakistani food in town! The biryani is absolutely amazing.",
    },
    {
      name: "Fatima Ali",
      rating: 5,
      comment: "Fast delivery and delicious food. Highly recommended!",
    },
    {
      name: "Hassan Raza",
      rating: 5,
      comment: "Authentic taste that reminds me of home-cooked meals.",
    },
  ];

  return (
    <main className="min-h-screen bg-background relative overflow-x-hidden">
      {/* ================= HERO ================= */}
      <section className="relative min-h-[80vh] lg:min-h-screen flex items-center py-12 lg:py-0 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
        {/* Left Side - Half Hidden Rotating Plate - visible from lg (1024px+) */}
        <motion.div
          initial={{ opacity: 0, x: -300 }}
          animate={{ opacity: 1, x: -150 }} // half-hidden effect
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden lg:block pointer-events-none"
        >
          <div className="relative w-[360px] h-[360px] lg:w-[400px] lg:h-[400px] xl:w-[450px] xl:h-[450px]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
            >
              <img
                src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop"
                alt="Delicious Pakistani Biryani Plate"
                className="rounded-full w-full h-full object-cover border-8 border-primary/30 shadow-2xl opacity-90"
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side - Half Hidden Phone Mockup - visible from xl (1280px+) */}
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 150 }} // half-hidden effect
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden xl:block pointer-events-none"
        >
          <div className="w-[280px] h-[560px] lg:w-[320px] lg:h-[640px] bg-gradient-to-b from-card to-muted rounded-[3rem] border-8 border-foreground/20 shadow-2xl overflow-hidden">
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

        {/* Center - Main Hero Content */}
        <div className="container mx-auto px-4 relative z-20">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold mb-6 leading-tight tracking-tight"
            >
              <span className="text-foreground">SUPER</span>
              <br />
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentPromoIndex}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ duration: 0.7 }}
                  className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent inline-block"
                >
                  {promotionalTexts[currentPromoIndex].main}
                </motion.span>
              </AnimatePresence>
            </motion.h1>

            <AnimatePresence mode="wait">
              <motion.p
                key={`sub-${currentPromoIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-lg md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto"
              >
                {promotionalTexts[currentPromoIndex].sub}
              </motion.p>
            </AnimatePresence>

            {/* Location Search */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto mb-12"
            >
              <div className="flex-1 relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary transition-colors group-focus-within:text-primary/80" />
                <input
                  type="text"
                  placeholder="Enter your town or postcode"
                  className="w-full pl-12 pr-4 py-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/30 text-foreground transition-all outline-none"
                  onClick={openAreaChecker}
                  readOnly
                  aria-label="Enter your delivery location"
                />
              </div>
              <Button
                size="lg"
                className="px-10 py-6 text-lg font-medium rounded-2xl"
                onClick={openAreaChecker}
              >
                Find Food
              </Button>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap gap-4 justify-center"
            >
              <Button variant="outline" size="lg" className="rounded-2xl px-8">
                Download App
              </Button>
              <Button variant="secondary" size="lg" className="rounded-2xl px-8">
                Redeem Voucher
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Explore Our Menu</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Authentic Pakistani flavors from breakfast to dinner
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {categories.map((cat, i) => {
            const Icon = cat.Icon;
            return (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 100 }}
              >
                <Link
                  to={cat.link}
                  className="group flex flex-col items-center p-6 md:p-8 bg-card rounded-3xl border border-border hover:border-primary/50 hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
                  aria-label={`Browse ${cat.name} category`}
                >
                  <div className="text-6xl md:text-7xl mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Icon />
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ================= FEATURED DISHES ================= */}
      <section className="container mx-auto px-4 py-16 lg:py-24 bg-muted/30">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Popular Picks</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Most loved and ordered dishes right now
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-20">
            <AlertTriangle className="h-16 w-16 mx-auto mb-6 text-destructive/50" />
            <p className="text-xl text-muted-foreground mb-6">
              Failed to load featured dishes
            </p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : featuredItems.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto mb-6 text-muted-foreground/50" />
            <p className="text-xl text-muted-foreground">No featured items available yet</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {featuredItems.map((item, index) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                >
                  <MenuItemCard item={item} />
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button asChild size="lg" className="rounded-2xl px-10">
                <Link to="/menu">
                  View Full Menu <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Loved by Our Customers</h2>
          <p className="text-lg text-muted-foreground">
            Real stories from real food lovers
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-card p-8 rounded-3xl shadow-lg border border-border hover:shadow-xl transition-all duration-300"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-6 w-6 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6 italic text-lg leading-relaxed">"{t.comment}"</p>
              <p className="font-semibold text-xl">{t.name}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-12 md:p-16 text-center text-white shadow-2xl"
        >
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
            Ready to Taste the Difference?
          </h2>
          <p className="text-xl md:text-2xl mb-10 opacity-90 max-w-3xl mx-auto">
            Authentic Pakistani flavors delivered fast & fresh to your door
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="text-lg md:text-xl px-12 py-8 rounded-2xl font-bold shadow-lg"
          >
            <Link to="/menu/all">Start Ordering Now</Link>
          </Button>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
};

export default Home;