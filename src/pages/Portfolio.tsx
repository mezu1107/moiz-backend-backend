import { motion } from "framer-motion";
import { Award, Star, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";

export const Portfolio = () => {
  const stats = [
    { icon: Users, value: "10,000+", label: "Happy Customers" },
    { icon: Star, value: "4.8/5", label: "Average Rating" },
    { icon: Award, value: "15+", label: "Awards Won" },
    { icon: TrendingUp, value: "50K+", label: "Orders Delivered" },
  ];

  const projects = [
    {
      title: "Signature Biryani Collection",
      category: "Main Course",
      image:
        "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800",
      description:
        "Our award-winning biryani varieties that have won hearts across Pakistan",
    },
    {
      title: "Traditional Breakfast Menu",
      category: "Breakfast",
      image:
        "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800",
      description:
        "Authentic Pakistani breakfast items that start your day right",
    },
    {
      title: "Karahi Specialties",
      category: "Dinner",
      image:
        "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800",
      description:
        "Traditional karahi dishes cooked to perfection with family recipes",
    },
    {
      title: "Dessert Delights",
      category: "Desserts",
      image:
        "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800",
      description: "Sweet endings with traditional Pakistani desserts",
    },
    {
      title: "Fresh Beverages",
      category: "Beverages",
      image:
        "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=800",
      description: "Refreshing drinks to complement your meal perfectly",
    },
    {
      title: "Party Catering Services",
      category: "Catering",
      image: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800",
      description: "Complete catering solutions for your special events",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Transforming Ideas into
              <span className="text-primary block">
                Powerful Culinary Experiences
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Explore our portfolio of signature dishes and catering services
              that have delighted thousands of customers
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center bg-card rounded-xl p-6 shadow-sm border"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Our Culinary Portfolio
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From traditional recipes to modern innovations, discover what makes
            Al Tawakkalfoods special
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-warm transition-all border"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                  {project.category}
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-xl mb-2">{project.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {project.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Image Gallery */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Gallery</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A visual journey through our delicious offerings
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",
              "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400",
              "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400",
              "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400",
              "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400",
              "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=400",
              "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400",
              "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400",
            ].map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all"
              >
                <img
                  src={image}
                  alt={`Gallery ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="gradient-primary rounded-2xl p-12 text-center text-white"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Project?
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Whether it's a family dinner or a large event, we're here to make it
            special
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/contact">Get in Touch</Link>
          </Button>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Portfolio;
