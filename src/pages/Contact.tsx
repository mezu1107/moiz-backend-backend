import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { contactInfo } from "@/utils/mockdata/contactInfo";
import { Mail, Phone, MapPin, Clock, Send, MessageCircle } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;
const validateEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email);
const validateName = (name: string) => /^[\p{L}\s]{2,50}$/u.test(name);
const validateSubject = (subject: string) =>
  subject.length > 0 && subject.length <= 100;
const validateMessage = (message: string) =>
  message.length > 0 && message.length <= 1000;

export const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { name, email, subject, message } = formData;

    if (!validateName(name))
      return toast.error("Name must be 2-50 letters only.");
    if (!validateEmail(email)) return toast.error("Invalid email address.");
    if (!validateSubject(subject))
      return toast.error("Subject is required (max 100 chars).");
    if (!validateMessage(message))
      return toast.error("Message is required (max 1000 chars).");

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/contact/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        toast.success(data.message || "Message sent successfully!");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        toast.error(data.message || "Failed to send message");
      }
    } catch (err) {
      setLoading(false);
      toast.error("Something went wrong. Please try again.");
    }
  };

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
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground">
              Have a question or feedback? We'd love to hear from you. Let's
              build your digital future together!
            </p>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {contactInfo.map((info, index) => (
            <motion.div
              key={info.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-xl p-6 shadow-sm border text-center hover:shadow-warm transition-all"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <info.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{info.title}</h3>
              {info.link ? (
                <a
                  href={info.link}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {info.content}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">{info.content}</p>
              )}
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-6">Send us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Your name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="How can we help?"
                  required
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Tell us more..."
                  rows={6}
                  required
                />
              </div>

              <Button type="submit" size="lg" className="w-full">
                <Send className="mr-2 h-5 w-5" />
                Send Message
              </Button>
            </form>

            <div className="mt-6 p-6 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-900">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    Quick Response on WhatsApp
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Need immediate assistance? Chat with us on WhatsApp for
                    faster response!
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-500 text-green-600 hover:bg-green-50"
                    onClick={() =>
                      window.open("https://wa.me/923709447916", "_blank")
                    }
                  >
                    Chat on WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            id="map"
          >
            <h2 className="text-3xl font-bold mb-6">Find Us</h2>
            {/* <div className="rounded-xl overflow-hidden shadow-lg h-[500px] bg-muted">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13601.324489722636!2d74.34342!3d31.5204!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39190483e58107d9%3A0xc23abe6ccc7e2462!2sGulberg%2C%20Lahore%2C%20Punjab%2C%20Pakistan!5e0!3m2!1sen!2s!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              />
            </div> */}

            <div className="mt-6 p-6 bg-card rounded-xl shadow-sm border">
              <h3 className="font-semibold mb-4">Service Areas</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  PWD
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Khanna Pul
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Navl Anchorage
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Bahria Town - All Phases
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Media Town
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Gulberg
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  High Court{" "}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Gulzar-e-Qauid
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="gradient-primary rounded-2xl p-12 text-center text-white"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Let's Build Your Digital Future Together
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Ready to experience authentic Pakistani cuisine? Order now and taste
            the tradition!
          </p>
          <Button size="lg" variant="secondary">
            Start Ordering
          </Button>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
