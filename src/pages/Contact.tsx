// src/pages/Contact.tsx
// PRODUCTION-READY — Modern, responsive contact page with warm Pakistani-inspired branding

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

// Updated contact info with enhanced styling
const contactInfo = [
  {
    title: "Email Us",
    content: "altawakkalfoods112@gmail.com",
    icon: Mail,
    link: "mailto:altawakkalfoods112@gmail.com",
  },
  {
    title: "Call Us",
    content: "+92 332 0123459",
    icon: Phone,
    link: "tel:+923320123459",
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
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/60">
      {/* Hero Section */}
      <section className="py-20 md:py-28 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
            className="max-w-5xl mx-auto"
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-orange-700 tracking-tight mb-6">
              Get in Touch
            </h1>
            <p className="text-xl md:text-2xl text-gray-800 max-w-3xl mx-auto leading-relaxed">
              Questions? Feedback? Craving something special?<br />
              We’re here to help with a smile!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="container mx-auto px-4 pb-16 lg:pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-20 lg:mb-28">
          {contactInfo.map((info, index) => (
            <motion.div
              key={info.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12, duration: 0.6 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 text-center shadow-xl border border-orange-200 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-6 mx-auto">
                <info.icon className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{info.title}</h3>
              {info.link ? (
                <a
                  href={info.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg text-gray-700 hover:text-orange-600 transition-colors break-all"
                >
                  {info.content}
                </a>
              ) : (
                <p className="text-lg text-gray-700">{info.content}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Form + Service Areas Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 max-w-7xl mx-auto">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-10">
              Send us a Message
            </h2>

            <form onSubmit={handleSubmit} className="space-y-7">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-base font-medium">Your Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleChange("name")}
                  placeholder="Ahmed Khan"
                  disabled={loading}
                  className="h-12 md:h-14 text-base rounded-xl border-orange-200 focus:border-orange-500"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-base font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange("email")}
                  placeholder="you@example.com"
                  disabled={loading}
                  className="h-12 md:h-14 text-base rounded-xl border-orange-200 focus:border-orange-500"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="subject" className="text-base font-medium">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={handleChange("subject")}
                  placeholder="Order inquiry / Feedback / Suggestion"
                  disabled={loading}
                  className="h-12 md:h-14 text-base rounded-xl border-orange-200 focus:border-orange-500"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="message" className="text-base font-medium">Your Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={handleChange("message")}
                  placeholder="How can we help you today?"
                  rows={7}
                  disabled={loading}
                  className="min-h-[160px] md:min-h-[180px] text-base rounded-xl border-orange-200 focus:border-orange-500 resize-none"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full h-14 md:h-16 text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-xl shadow-xl"
              >
                {loading ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="mr-3 h-6 w-6" />
                    Send Message
                  </>
                )}
              </Button>
            </form>

            {/* WhatsApp Quick Contact */}
            <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Chat on WhatsApp</h3>
                  <p className="text-gray-700 mb-6 text-base">
                    Fastest way to reach us — we usually reply within minutes!
                  </p>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 px-8 text-base font-medium border-2 border-green-600 text-green-700 hover:bg-green-600 hover:text-white rounded-xl shadow-md"
                    onClick={() => window.open("https://wa.me/923709447916", "_blank")}
                  >
                    <MessageCircle className="mr-3 h-6 w-6" />
                    Message Now
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
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-10">
              We Deliver To
            </h2>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 md:p-10 border border-orange-200 shadow-xl">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Current Service Areas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                  <div key={area} className="flex items-center gap-4 py-3 px-4 rounded-lg bg-orange-50/60">
                    <MapPin className="h-6 w-6 text-orange-600 flex-shrink-0" />
                    <span className="text-lg text-gray-800 font-medium">{area}</span>
                  </div>
                ))}
              </div>
              <p className="mt-10 text-base text-gray-700 italic">
                Not in these areas yet? Reach out — we’re expanding fast across Islamabad!
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-14 md:p-20 text-center text-white shadow-2xl max-w-6xl mx-auto"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-8 leading-tight">
            Ready to Taste the Difference?
          </h2>
          <p className="text-xl lg:text-2xl opacity-95 mb-12 max-w-4xl mx-auto leading-relaxed">
            Authentic Pakistani cuisine delivered hot & fresh to your door
          </p>
          <Button
            size="lg"
            className="h-14 px-12 text-xl font-bold bg-white text-orange-700 hover:bg-amber-50 hover:scale-105 transition-all shadow-xl rounded-xl"
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