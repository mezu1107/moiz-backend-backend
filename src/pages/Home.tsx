import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChefHat, Clock, MapPin, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuItemCard } from "@/components/MenuItemCard";
import { mockMenuItems } from "@/lib/mockData";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Home = () => {
  const featuredItems = mockMenuItems.filter((item) => item.featured);
  const categories = [
    { name: "Breakfast", icon: "🍳", link: "/menu?category=breakfast" },
    { name: "Lunch", icon: "🍛", link: "/menu?category=lunch" },
    { name: "Dinner", icon: "🍲", link: "/menu?category=dinner" },
    { name: "Desserts", icon: "🍰", link: "/menu?category=desserts" },
    { name: "Beverages", icon: "🥤", link: "/menu?category=beverages" },
  ];

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
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background min-h-screen flex items-center">
        {/* Left Side - Half Hidden Rotating Plate */}
        <motion.div
          initial={{ opacity: 0, x: -200 }}
          animate={{ opacity: 1, x: -200 }}
          transition={{ duration: 0.6 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10"
        >
          <div className="relative w-[500px] h-[500px]">
            <div className="absolute inset-0 animate-rotate-slow">
              <img
                src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800"
                alt="Delicious Pakistani Food"
                className="rounded-full w-full h-full object-cover border-8 border-golden/30 shadow-2xl"
              />
            </div>
          </div>
        </motion.div>

        {/* Right Side - Half Hidden Phone Mockup */}
        <motion.div
          initial={{ opacity: 0, x: 200 }}
          animate={{ opacity: 1, x: 150 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden lg:block"
        >
          <div className="relative">
            <div className="w-[350px] h-[700px] bg-gradient-to-b from-card to-muted rounded-[3rem] border-8 border-foreground/20 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-8 bg-background/50 rounded-t-[2.5rem]"></div>
              <div className="p-6 pt-12">
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold text-primary">SUPERMEAL</h3>
                  <p className="text-xs text-muted-foreground">up to 30% cashback on all orders</p>
                </div>
                <div className="bg-background/80 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-foreground">Hancock Road, Birmingham</span>
                  </div>
                </div>
                <Button className="w-full bg-secondary text-secondary-foreground mb-4">
                  Redeem a voucher
                </Button>
                <div className="mt-8">
                  <div className="relative">
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary rounded-full flex items-center justify-center transform rotate-12">
                      <span className="text-3xl font-bold">💰</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Center - Main Content */}
        <div className="container mx-auto px-4 py-20 relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
              <span className="text-foreground">SUPER</span>
              <span className="text-primary block animate-pulse">CASHBACK</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-12">
              up to 30% cashback on all orders
            </p>
            
            <div className="flex flex-col gap-6 items-center mb-12">
              <div className="flex gap-4 w-full max-w-2xl">
                <div className="flex-1 relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                  <input
                    type="text"
                    placeholder="Your Town or Area"
                    className="w-full px-12 py-4 rounded-lg bg-card border border-border text-foreground text-lg"
                  />
                </div>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-4 text-lg">
                  SEARCH
                </Button>
              </div>
              
              <div className="flex gap-4 items-center">
                <Button variant="secondary" size="lg" className="bg-secondary text-secondary-foreground px-8">
                  Redeem a voucher
                </Button>
                <div className="w-14 h-14 bg-card border-2 border-border rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📱</span>
                </div>
              </div>
            </div>

            <div className="flex gap-6 items-center justify-center flex-wrap">
              <Button size="lg" className="bg-background text-foreground border-2 border-border hover:bg-card px-8">
                GET THE APP
              </Button>
              <div className="flex gap-3">
                <div className="w-12 h-12 bg-card border-2 border-border rounded-lg flex items-center justify-center hover:border-primary transition-colors cursor-pointer">
                  <span className="text-2xl">🍎</span>
                </div>
                <div className="w-12 h-12 bg-card border-2 border-border rounded-lg flex items-center justify-center hover:border-primary transition-colors cursor-pointer">
                  <span className="text-2xl">▶️</span>
                </div>
                <div className="w-12 h-12 bg-card border-2 border-border rounded-lg flex items-center justify-center hover:border-primary transition-colors cursor-pointer">
                  <span className="text-2xl">📱</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Explore Our Menu</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From breakfast to dinner, find your favorite Pakistani dishes
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={category.link}
                className="group block bg-card rounded-xl p-6 text-center hover:shadow-warm transition-all border"
              >
                <div className="text-5xl mb-3">{category.icon}</div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Dishes */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Dishes</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Try our most popular and loved dishes
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredItems.map((item, index) => (
            <MenuItemCard key={item.id} item={item} index={index} />
          ))}
        </div>

        <div className="text-center mt-8">
          <Button size="lg" variant="outline" asChild>
            <Link to="/menu">View Full Menu</Link>
          </Button>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Real reviews from real food lovers
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card p-6 rounded-xl shadow-sm"
              >
                <div className="flex gap-1 mb-4">
                  {Array(testimonial.rating)
                    .fill(0)
                    .map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-accent text-accent" />
                    ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">"{testimonial.comment}"</p>
                <p className="font-semibold">{testimonial.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="gradient-primary rounded-2xl p-12 text-center text-white"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Order?
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Discover your digital health score and order your favorite Pakistani dishes today!
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/menu">Start Ordering Now</Link>
          </Button>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
