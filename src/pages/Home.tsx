// src/pages/Home.tsx
// PRODUCTION VERSION — January 07, 2026
// Fully responsive, high-contrast, accessible, modern homepage

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star, AlertTriangle, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuItemCard } from "@/features/menu/components/MenuItemCard";
import { useFullMenuCatalog } from "@/features/menu/hooks/useMenuApi";
import {
  MenuCategory,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from "@/features/menu/types/menu.types";

import { useTopReviews } from "@/features/reviews/hooks/useTopReviews";
import ReviewCard from "@/features/reviews/components/ReviewCard";

type HomeProps = {
  openAreaChecker?: () => void;
};

export const Home = ({ openAreaChecker }: HomeProps = {}) => {
  const { data: menuData, isLoading: menuLoading, isError: menuError } = useFullMenuCatalog();
  const allItems = menuData?.menu ?? [];

  const featuredNames = useMemo(
    () => [
      "Lacha Paratha",
      "Aloo Cheese Paratha",
      "Special Masala Biryani",
      "Chicken Pulao",
      "Chai / Karak Chai",
      "Gur Wali chaye",
    ],
    []
  );

  const featuredItems = useMemo(() => {
    const byName = allItems.filter((item) =>
      featuredNames.some((name) => item.name.toLowerCase().includes(name.toLowerCase()))
    );
    return byName.length >= 6 ? byName.slice(0, 6) : allItems.slice(0, 9);
  }, [allItems, featuredNames]);

  const categories = useMemo(
    () =>
      (Object.keys(CATEGORY_LABELS) as MenuCategory[]).map((cat) => ({
        name: CATEGORY_LABELS[cat],
        icon: CATEGORY_ICONS[cat],
        link: `/menu?category=${cat}`,
      })),
    []
  );

 const promotionalTexts = [
  { 
    main: "AUTHENTIC PAKISTANI TASTE", 
    sub: "Handcrafted desi dishes made with love",
    subColor: "text-golden"  // custom golden color
  },
  { 
    main: "FRESH & HALAL", 
    sub: "100% fresh ingredients, always halal-certified",
    subColor: "text-black"   // solid black
  },
  { 
    main: "GHAR KA KHANA", 
    sub: "Comforting home-style cooking, just like ammi makes",
    subColor: "text-black"   // solid black
  },
];


  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromoIndex((prev) => (prev + 1) % promotionalTexts.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    isError: reviewsError,
  } = useTopReviews({ limit: 6 });

  const reviews = reviewsData?.reviews ?? [];

  return (
    <main className="min-h-screen bg-background">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-cream/30 min-h-[80vh] flex items-center py-12 lg:py-0">
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <div className="absolute top-10 left-10 w-96 h-96 bg-orange-300 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-amber-400 rounded-full blur-3xl"></div>
        </div>

        {/* Floating Food Images */}
        <motion.div
          initial={{ opacity: 0, x: -120 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none"
        >
          <img
            src="/Chicken-Karahi.jpg"
            alt="Authentic Chicken Karahi"
            className="w-80 lg:w-96 2xl:w-[500px] rounded-3xl shadow-2xl border-8 border-white/90 rotate-[-12deg] hover:rotate-[-8deg] transition-transform duration-700"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 120 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none"
        >
          <img
            src="https://www.shutterstock.com/image-photo/hyderabadi-chicken-biryani-aromatic-flavorful-600nw-2497040151.jpg"
            alt="Special Masala Biryani"
            className="w-72 lg:w-80 xl:w-96 2xl:w-[480px] rounded-3xl shadow-2xl border-8 border-white/80 rotate-12 hover:rotate-[6deg] transition-transform duration-700"
          />
        </motion.div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.h1
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.9 }}
  className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold mb-6 leading-tight tracking-tight"
>
  <span className="text-yellow-400">Al</span>
  <span className="text-orange-600 drop-shadow-md">Tawakkal</span>
  <span className="text-yellow-400">foods</span>
</motion.h1>


            <AnimatePresence mode="wait">
              <motion.div
                key={currentPromoIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.7 }}
                className="mb-8"
              >
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-orange-700">
                  {promotionalTexts[currentPromoIndex].main}
                </p>
                <p className="text-lg sm:text-xl text-foreground/80 mt-4 font-medium">
                  {promotionalTexts[currentPromoIndex].sub}
                </p>
              </motion.div>
            </AnimatePresence>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-lg sm:text-xl text-foreground/70 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Bringing authentic Pakistani home-cooked flavors straight to your door.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex flex-col sm:flex-row gap-5 justify-center"
            >
              <Button size="lg" className="px-10 py-7 text-lg rounded-2xl shadow-lg" asChild>
                <Link to="/menu">
                  Order Now <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="px-10 py-7 text-lg rounded-2xl border-2" asChild>
                <Link to="/about">Our Story</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Explore Our Menu</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From flaky parathas to aromatic biryanis – all made fresh daily
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 place-items-center">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <Link
                  to={category.link}
                  className="group block bg-card rounded-3xl p-8 text-center hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-border/50"
                >
                  <div className="text-6xl mb-5 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="text-orange-600" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground group-hover:text-orange-600 transition-colors">
                    {category.name}
                  </h3>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ================= FEATURED DISHES ================= */}
      <section className="container mx-auto px-4 py-16 lg:py-24 bg-muted/40">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Customer Favorites</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our most loved and ordered dishes
          </p>
        </motion.div>

        {menuLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-3xl" />
            ))}
          </div>
        ) : menuError ? (
          <div className="text-center py-20">
            <AlertTriangle className="h-16 w-16 mx-auto mb-6 text-destructive" />
            <p className="text-xl text-foreground mb-6">Couldn't load our specials...</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : featuredItems.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
            <p className="text-xl text-foreground">Menu is being updated...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredItems.map((item, index) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <MenuItemCard item={item} />
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-14">
              <Button size="lg" asChild className="px-12 py-7 text-lg rounded-2xl shadow-lg">
                <Link to="/menu">
                  View Full Menu <ArrowRight className="ml-3 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </section>

      {/* ================= REAL CUSTOMER REVIEWS ================= */}
      <section className="bg-orange-50/70 py-16 lg:py-28">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              What Our Customers Say
            </h2>
            <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
              Real reviews from happy foodies who’ve tasted our authentic Pakistani dishes
            </p>
            {reviewsData && (
              <p className="text-sm text-foreground/60 mt-4">
                Showing {reviews.length} of {reviewsData.count}+ verified reviews
              </p>
            )}
          </motion.div>

          {reviewsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-3xl" />
              ))}
            </div>
          ) : reviewsError ? (
            <div className="text-center py-16">
              <AlertTriangle className="h-14 w-14 mx-auto mb-6 text-destructive" />
              <p className="text-foreground text-lg">Unable to load reviews at this time.</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16">
              <Star className="h-14 w-14 mx-auto mb-6 text-orange-600/70" />
              <p className="text-foreground text-xl">No reviews yet — be the first!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {reviews.map((review, i) => (
                <motion.div
                  key={review._id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                >
                  <ReviewCard review={review} showReply={true} />
                </motion.div>
              ))}
            </div>
          )}

          {reviews.length > 0 && (
            <div className="text-center mt-14">
              <Button size="lg" variant="outline" asChild className="px-10 py-6 text-lg rounded-2xl border-2">
                <Link to="/reviews">
                  View All Reviews <ArrowRight className="ml-3 h-5 w-5" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="container mx-auto px-4 py-20 lg:py-28 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-3xl p-12 lg:p-16 text-white shadow-2xl max-w-5xl mx-auto"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Ready for Authentic Pakistani Food?
          </h2>
          <p className="text-xl lg:text-2xl mb-12 opacity-95 max-w-3xl mx-auto leading-relaxed">
            Order your favorite dishes now and enjoy the real taste of tradition.
          </p>
          <Button
            size="lg"
            variant="secondary"
            asChild
            className="px-14 py-8 text-xl lg:text-2xl rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
          >
            <Link to="/menu">
              Browse Menu <ArrowRight className="ml-4 h-7 w-7" />
            </Link>
          </Button>
        </motion.div>
      </section>
    </main>
  );
};

export default Home;