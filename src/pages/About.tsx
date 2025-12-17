import { motion } from "framer-motion";
import { Users, Award, Heart, Target } from "lucide-react";

import { Footer } from "@/components/Footer";

export const About = () => {
  const team = [
    {
      name: "Chef Rashid Ali",
      role: "Head Chef",
      image:
        "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400",
    },
    {
      name: "Hassan Raza",
      role: "Lead Delivery",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    },
    {
      name: "Fatima Khan",
      role: "Operations Manager",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
    },
  ];

  const timeline = [
    {
      year: "2020",
      title: "Founded",
      description:
        "Al Tawakkalfoods was established with a vision to bring authentic Pakistani cuisine to homes",
    },
    {
      year: "2021",
      title: "Expansion",
      description: "Expanded to 3 cities with over 50 delivery riders",
    },
    {
      year: "2022",
      title: "Recognition",
      description: "Won Best Pakistani Restaurant award",
    },
    {
      year: "2023",
      title: "Digital Growth",
      description: "Launched mobile app and expanded to 7+ service areas",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
  

      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Bringing Pakistani
              <span className="text-primary block">Taste to Your Table</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              At Al Tawakkalfoods, we're passionate about delivering authentic
              Pakistani cuisine that reminds you of home. Every dish is prepared
              with love, tradition, and the finest ingredients.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-8">
          {[
            {
              icon: Heart,
              title: "Passion",
              description: "We love what we do and it shows in every dish",
            },
            {
              icon: Award,
              title: "Quality",
              description: "Only the finest ingredients make it to your plate",
            },
            {
              icon: Users,
              title: "Community",
              description: "Serving our community with pride and dedication",
            },
            {
              icon: Target,
              title: "Excellence",
              description: "Striving for perfection in every order",
            },
          ].map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <value.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-xl mb-2">{value.title}</h3>
              <p className="text-sm text-muted-foreground">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Story</h2>
              <p className="text-muted-foreground mb-4">
                Founded in 2020 Al Tawakkalfoods began with a simple mission: to
                share the rich flavors of Pakistani cuisine with food lovers
                across the country.
              </p>
              <p className="text-muted-foreground mb-4">
                What started as a small kitchen in Islamabad has grown into a
                beloved brand, serving thousands of satisfied customers daily.
                Our chefs use time-honored recipes passed down through
                generations, ensuring every bite is a taste of authentic
                Pakistani tradition.
              </p>
              <p className="text-muted-foreground">
                Today, we operate across 7+ service areas, employing over 50
                dedicated delivery riders and maintaining our commitment to
                quality, taste, and customer satisfaction.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              <img
                src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400"
                alt="Food preparation"
                className="rounded-xl shadow-lg"
              />
              <img
                src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400"
                alt="Kitchen"
                className="rounded-xl shadow-lg mt-8"
              />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Journey</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From humble beginnings to becoming a household name
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {timeline.map((milestone, index) => (
            <motion.div
              key={milestone.year}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-8 mb-12 last:mb-0"
            >
              <div className="flex-shrink-0 w-24 text-right">
                <span className="text-3xl font-bold text-primary">
                  {milestone.year}
                </span>
              </div>
              <div className="relative flex-1 pb-12">
                <div className="absolute left-0 top-2 w-4 h-4 rounded-full bg-primary" />
                <div className="absolute left-2 top-6 w-0.5 h-full bg-border" />
                <div className="pl-8">
                  <h3 className="font-bold text-xl mb-2">{milestone.title}</h3>
                  <p className="text-muted-foreground">
                    {milestone.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Meet Our Team
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The passionate people behind your favorite meals
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover shadow-lg"
                />
                <h3 className="font-bold text-lg mb-1">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
