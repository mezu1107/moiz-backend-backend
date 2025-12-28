// src/pages/Contact.tsx
// PRODUCTION-READY — FULLY RESPONSIVE (320px → 4K)
// Mobile-first contact page with form, info cards, service areas, WhatsApp CTA

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { contactInfo } from "@/utils/mockdata/contactInfo";
import { Mail, Phone, MapPin, Clock, Send, MessageCircle } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const validateEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email);
const validateName = (name: string) => /^[\p{L}\s'-]{2,50}$/u.test(name.trim());
const validateSubject = (subject: string) => subject.trim().length >= 3 && subject.length <= 100;
const validateMessage = (message: string) => message.trim().length >= 10 && message.length <= 2000;

export const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { name, email, subject, message } = formData;

    if (!validateName(name))
      return toast.error("Please enter a valid name (2–50 letters).");
    if (!validateEmail(email))
      return toast.error("Please enter a valid email address.");
    if (!validateSubject(subject))
      return toast.error("Subject must be 3–100 characters.");
    if (!validateMessage(message))
      return toast.error("Message must be 10–2000 characters.");

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/contact/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Thank you! Your message has been sent.");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        toast.error(data.message || "Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error("Contact form error:", err);
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-background to-green-50">
      {/* Hero Section */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-gray-900 mb-6">
              Get in Touch
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Questions? Feedback? Craving something special? We're here to help!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-16 lg:mb-20">
          {contactInfo.map((info, index) => (
            <motion.div
              key={info.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-2xl p-6 md:p-8 text-center shadow-lg border hover:shadow-xl transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-orange-100 mb-6">
                <info.icon className="h-7 w-7 md:h-8 md:w-8 text-orange-600" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-3">{info.title}</h3>
              {info.link ? (
                <a
                  href={info.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base md:text-lg text-muted-foreground hover:text-orange-600 transition-colors break-all"
                >
                  {info.content}
                </a>
              ) : (
                <p className="text-base md:text-lg text-muted-foreground">{info.content}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Form + Service Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-black mb-8">Send us a Message</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-base md:text-lg font-medium">
                  Your Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleChange("name")}
                  placeholder="John Doe"
                  disabled={loading}
                  className="h-12 md:h-14 text-base md:text-lg"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-base md:text-lg font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange("email")}
                  placeholder="john@example.com"
                  disabled={loading}
                  className="h-12 md:h-14 text-base md:text-lg"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="subject" className="text-base md:text-lg font-medium">
                  Subject
                </Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={handleChange("subject")}
                  placeholder="Order inquiry / Feedback / Other"
                  disabled={loading}
                  className="h-12 md:h-14 text-base md:text-lg"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="message" className="text-base md:text-lg font-medium">
                  Message
                </Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={handleChange("message")}
                  placeholder="Tell us how we can help..."
                  rows={6}
                  disabled={loading}
                  className="min-h-32 md:min-h-40 text-base md:text-lg"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full h-12 md:h-14 text-base md:text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
              >
                {loading ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5 md:h-6 md:w-6" />
                    Send Message
                  </>
                )}
              </Button>
            </form>

            {/* WhatsApp CTA */}
            <div className="mt-10 p-6 md:p-8 bg-green-50 dark:bg-green-950/30 rounded-2xl border border-green-200 dark:border-green-800">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-bold mb-2">
                    Instant Help on WhatsApp
                  </h3>
                  <p className="text-base md:text-lg text-muted-foreground mb-4">
                    Need quick assistance? Chat with us directly on WhatsApp — we usually reply within minutes!
                  </p>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto h-12 md:h-14 text-base md:text-lg border-green-600 text-green-700 hover:bg-green-50"
                    onClick={() => window.open("https://wa.me/923709447916", "_blank")}
                  >
                    <MessageCircle className="mr-2 h-5 w-5 md:h-6 md:w-6" />
                    Message on WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Service Areas */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-black mb-8">We Deliver To</h2>

            <div className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border">
              <h3 className="text-xl md:text-2xl font-semibold mb-6">Our Service Areas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  "PWD",
                  "Khanna Pul",
                  "Naval Anchorage",
                  "Bahria Town (All Phases)",
                  "Media Town",
                  "Gulberg",
                  "High Court Society",
                  "Gulzar-e-Quaid",
                ].map((area) => (
                  <div key={area} className="flex items-center gap-3 py-2">
                    <MapPin className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <span className="text-base md:text-lg text-muted-foreground">{area}</span>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-sm md:text-base text-muted-foreground italic">
                Not in these areas? Contact us — we're expanding fast!
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-3xl p-10 md:p-16 text-center text-white shadow-2xl"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6">
            Hungry? Let's Eat!
          </h2>
          <p className="text-lg md:text-xl lg:text-2xl mb-10 opacity-90 max-w-3xl mx-auto">
            Authentic Pakistani flavors delivered fresh to your door
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="h-12 md:h-14 text-base md:text-lg font-bold px-8 md:px-12 bg-white text-orange-600 hover:bg-gray-100"
            onClick={() => window.location.href = "/menu"}
          >
            Order Now
          </Button>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
};

export default Contact;