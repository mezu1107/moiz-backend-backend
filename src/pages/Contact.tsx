// src/pages/Contact.tsx
// PRODUCTION-READY — Modern, responsive contact page matching Al Tawakkalfoods branding

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Clock, Send, MessageCircle } from "lucide-react";

import { Footer } from "@/components/Footer";

const API_URL = import.meta.env.VITE_API_URL;

// Mock contact info (you can move this to a separate file later)
const contactInfo = [
  {
    title: "Email Us",
    content: "altawakkalfoods112@gmail.com",
    icon: Mail,
    link: "mailto:altawakkalfoods112@gmail.com",
  },
  {
    title: "Call Us",
    content: "+92 370 944 7916",
    icon: Phone,
    link: "tel:+923709447916",
  },
  {
    title: "Working Hours",
    content: "10:00 AM – 11:00 PM",
    icon: Clock,
  },
  {
    title: "Visit Us",
    content: "Islamabad, Pakistan",
    icon: MapPin,
  },
];

const validateEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email);
const validateName = (name: string) => /^[\p{L}\s'-]{2,50}$/u.test(name.trim());
const validateSubject = (subject: string) => subject.trim().length >= 3 && subject.length <= 100;
const validateMessage = (message: string) => message.trim().length >= 10 && message.length <= 2000;

export default function Contact() {
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

    if (!validateName(name)) return toast.error("Please enter a valid name (2–50 letters).");
    if (!validateEmail(email)) return toast.error("Please enter a valid email address.");
    if (!validateSubject(subject)) return toast.error("Subject must be 3–100 characters.");
    if (!validateMessage(message)) return toast.error("Message must be 10–2000 characters.");

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
      toast.error("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      {/* Hero Section */}
      <section className="py-16 md:py-20 lg:py-24">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-5 md:mb-6">
              Get in Touch
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Questions? Feedback? Craving something special? We're here to help!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="container mx-auto px-4 pb-16 lg:pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-16 lg:mb-20">
          {contactInfo.map((info, index) => (
            <motion.div
              key={info.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="bg-card rounded-xl p-6 text-center shadow-md border border-border hover:shadow-lg hover:border-primary/30 transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-5 mx-auto">
                <info.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{info.title}</h3>
              {info.link ? (
                <a
                  href={info.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm md:text-base break-all"
                >
                  {info.content}
                </a>
              ) : (
                <p className="text-muted-foreground text-sm md:text-base">{info.content}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Form + Service Areas Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 max-w-6xl mx-auto">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-8">Send us a Message</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleChange("name")}
                  placeholder="Ahmed Khan"
                  disabled={loading}
                  className="h-11 md:h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange("email")}
                  placeholder="altawakkalfoods112@gmail.com"
                  disabled={loading}
                  className="h-11 md:h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={handleChange("subject")}
                  placeholder="Order inquiry / Feedback / Suggestion"
                  disabled={loading}
                  className="h-11 md:h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Your Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={handleChange("message")}
                  placeholder="How can we help you today?"
                  rows={6}
                  disabled={loading}
                  className="min-h-[120px] md:min-h-[140px] resize-none"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full h-11 md:h-12 text-base md:text-lg font-semibold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md"
              >
                {loading ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Send Message
                  </>
                )}
              </Button>
            </form>

            {/* WhatsApp Quick Contact */}
            <div className="mt-10 p-6 rounded-xl bg-green-50 border border-green-100">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Chat with us on WhatsApp</h3>
                  <p className="text-muted-foreground mb-4 text-sm md:text-base">
                    Fastest way to get help — we usually reply within minutes!
                  </p>
                  <Button
                    variant="outline"
                    className="border-green-600 text-green-700 hover:bg-green-50 h-11 md:h-12"
                    onClick={() => window.open("https://wa.me/923709447916", "_blank")}
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Message Now
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Service Areas */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-8">We Deliver To</h2>

            <div className="bg-card rounded-xl p-6 md:p-8 border border-border shadow-md">
              <h3 className="text-xl md:text-2xl font-semibold mb-6">Service Areas</h3>
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
                    <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{area}</span>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-sm text-muted-foreground italic">
                Not in these areas yet? Reach out — we're growing fast!
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl md:rounded-3xl p-10 md:p-16 text-center text-white shadow-xl"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6">
            Ready to Taste the Difference?
          </h2>
          <p className="text-lg md:text-xl opacity-90 mb-8 max-w-3xl mx-auto">
            Authentic Pakistani cuisine delivered hot & fresh to your door
          </p>
          <Button
            size="lg"
            className="h-11 md:h-12 px-8 md:px-12 text-base md:text-lg font-semibold bg-white text-orange-600 hover:bg-gray-100 shadow-lg"
            onClick={() => window.location.href = "/menu"}
          >
            Order Now
          </Button>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}