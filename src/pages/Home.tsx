// src/pages/Home.tsx
// PRODUCTION VERSION — January 08, 2026
// Fully responsive, high-contrast, accessible, modern homepage with authentic Pakistani color harmony + floating WhatsApp chat

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star, AlertTriangle, Package, MessageCircle } from "lucide-react";

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
      mainColor: "text-orange-700 dark:text-orange-300",
      subColor: "text-gray-800 dark:text-gray-200"
    },
    {
      main: "FRESH & HALAL",
      sub: "100% fresh ingredients, always halal-certified",
      mainColor: "text-amber-700 dark:text-amber-300",
      subColor: "text-gray-800 dark:text-gray-200"
    },
    {
      main: "GHAR KA KHANA",
      sub: "Comforting home-style cooking, just like ammi makes",
      mainColor: "text-orange-700 dark:text-orange-300",
      subColor: "text-gray-800 dark:text-gray-200"
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

  // WhatsApp floating chat state
  const [chatOpen, setChatOpen] = useState(false);

  const whatsappMessages = [
    { text: "How may I help you?" },
    { text: "Talk with our agent" },
    { text: "Track my order" },
    { text: "Need assistance?" }
  ];

  const openWhatsApp = (msg: string) => {
    const url = `https://wa.me/03320123459?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <main className="min-h-screen bg-background relative">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/50 min-h-[80vh] flex items-center py-12 lg:py-0">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-10 left-10 w-96 h-96 bg-orange-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-amber-500 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-yellow-400/50 rounded-full blur-3xl"></div>
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
              className="mb-6 text-center"
            >
              <span className="inline-flex whitespace-nowrap text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight">
                <span className="text-amber-500">Al</span>
                <span className="text-orange-600 mx-2">Tawakkal</span>
                <span className="text-amber-500">Foods</span>
              </span>

              {/* Slogan */}
              <p className="mt-3 text-sm sm:text-base md:text-lg text-gray-600 tracking-wide">
                Eat • Enjoy • Repeat
              </p>
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
                <p className={`text-3xl sm:text-4xl md:text-5xl font-bold ${promotionalTexts[currentPromoIndex].mainColor}`}>
                  {promotionalTexts[currentPromoIndex].main}
                </p>
                <p className={`text-xl sm:text-2xl mt-5 font-medium ${promotionalTexts[currentPromoIndex].subColor}`}>
                  {promotionalTexts[currentPromoIndex].sub}
                </p>
              </motion.div>
            </AnimatePresence>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xl sm:text-2xl text-gray-800 dark:text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed font-medium"
            >
              Bringing authentic Pakistani home-cooked flavors straight to your door.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              <Button size="lg" className="px-12 py-8 text-lg rounded-2xl shadow-xl bg-orange-600 hover:bg-orange-700" asChild>
                <Link to="/menu">
                  Order Now <ArrowRight className="ml-3 h-6 w-6" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="px-12 py-8 text-lg rounded-2xl border-2 border-orange-600 text-orange-600 hover:bg-orange-50" asChild>
                <Link to="/about">Our Story</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="container mx-auto px-4 py-16 lg:py-24 bg-gradient-to-b from-amber-50/50 to-transparent">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Explore Our Menu</h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            From flaky parathas to aromatic biryanis – all made fresh daily
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 place-items-center">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={category.link}
                  className="group block bg-white/80 backdrop-blur-sm rounded-3xl p-10 text-center hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 border border-orange-200"
                >
                  <div className="text-7xl mb-6 group-hover:scale-115 transition-transform duration-500">
                    <Icon className="text-orange-600 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <h3 className="font-bold text-xl text-gray-800 group-hover:text-orange-600 transition-colors">
                    {category.name}
                  </h3>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ================= FEATURED DISHES ================= */}
      <section className="container mx-auto px-4 py-16 lg:py-24 bg-orange-50/60">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Customer Favorites</h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Our most loved and ordered dishes
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {featuredItems.map((item, index) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12 }}
            >
              <MenuItemCard item={item} />
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Button size="lg" asChild className="px-14 py-8 text-lg rounded-2xl shadow-xl bg-amber-600 hover:bg-amber-700">
            <Link to="/menu">
              View Full Menu <ArrowRight className="ml-4 h-6 w-6" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ================= REAL CUSTOMER REVIEWS ================= */}
      <section className="bg-gradient-to-b from-orange-50 to-amber-50 py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              Real reviews from happy foodies who’ve tasted our authentic Pakistani dishes
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="container mx-auto px-4 py-20 lg:py-32 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-14 lg:p-20 text-white shadow-2xl max-w-6xl mx-auto"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
            Ready for Authentic Pakistani Food?
          </h2>
          <p className="text-xl lg:text-2xl mb-14 opacity-95 max-w-4xl mx-auto leading-relaxed">
            Order your favorite dishes now and enjoy the real taste of tradition.
          </p>
          <Button
            size="lg"
            variant="secondary"
            asChild
            className="px-16 py-9 text-xl lg:text-2xl rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all bg-white text-orange-700 hover:bg-amber-50"
          >
            <Link to="/menu">
              Browse Menu <ArrowRight className="ml-5 h-8 w-8" />
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* ================= FLOATING WHATSAPP BUTTON ================= */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* WhatsApp Icon */}
        <button
          onClick={() => setChatOpen((prev) => !prev)}
          className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-xl transition-all"
        >
          <MessageCircle className="w-6 h-6" />
        </button>

        {/* Mini WhatsApp Popup */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-16 right-0 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-green-500 p-3 text-white font-bold text-center">
                AlTawakkal Foods
              </div>

              {/* Messages */}
              <div className="flex flex-col p-2 space-y-2">
                {whatsappMessages.map((msg, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openWhatsApp(msg.text)}
                    className="text-gray-800 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg p-2 text-left transition-all"
                  >
                    {msg.text}
                  </motion.button>
                ))}
              </div>

              {/* Bottom Typing area (UI only) */}
              <div className="border-t border-gray-200 p-2 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  disabled
                />
                <button className="bg-green-500 text-white p-2 rounded-lg text-sm" disabled>
                  Send
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

export default Home;
