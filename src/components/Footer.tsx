// src/components/Footer.tsx
import { Link } from "react-router-dom";
import {
  Facebook,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Music2, // Using Music2 as a close approximation for the TikTok icon (musical note style)
} from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-card border-t mt-16">
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <section aria-labelledby="footer-brand">
            <div className="flex items-center gap-3 mb-4">
              {/* Real Logo */}
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white shadow-md ring-1 ring-gray-200">
                <img
                  src="/logo.jpeg"
                  alt="AlTawakkalfoods Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3
                  id="footer-brand"
                  className="font-bold [font-size:clamp(1rem,2.5vw,1.125rem)]"
                >
                  AlTawakkalfoods
                </h3>
                <p className="text-xs text-muted-foreground">
                  Pakistani Cuisine
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-xs">
              Bringing authentic Pakistani taste to your table with love and tradition.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/profile.php?id=61585268507343"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="
                  flex h-10 w-10 items-center justify-center
                  rounded-full bg-muted
                  hover:bg-primary hover:text-primary-foreground
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary
                "
              >
                <Facebook className="h-4 w-4" />
              </a>

              <a
                href="https://www.instagram.com/altawakkalfoods112"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="
                  flex h-10 w-10 items-center justify-center
                  rounded-full bg-muted
                  hover:bg-primary hover:text-primary-foreground
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary
                "
              >
                <Instagram className="h-4 w-4" />
              </a>

              <a
                href="https://vt.tiktok.com/ZSPwa5PrH/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="
                  flex h-10 w-10 items-center justify-center
                  rounded-full bg-muted
                  hover:bg-primary hover:text-primary-foreground
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary
                "
              >
                <Music2 className="h-4 w-4" />
              </a>

              <a
                href="https://youtu.be/MGq37TZvMXI?si=WJ0JqUQsLl5DWrsp"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="
                  flex h-10 w-10 items-center justify-center
                  rounded-full bg-muted
                  hover:bg-primary hover:text-primary-foreground
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary
                "
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </section>

          {/* Quick Links */}
          <nav aria-labelledby="footer-links">
            <h4
              id="footer-links"
              className="font-semibold mb-4 [font-size:clamp(0.95rem,2vw,1.05rem)]"
            >
              Quick Links
            </h4>
            <ul className="space-y-2">
              {[
                { to: "/", label: "Home" },
                { to: "/menu/all", label: "Menu" },
                { to: "/about", label: "About Us" },
                { to: "/contact", label: "Contact" },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="
                      text-sm text-muted-foreground
                      hover:text-primary
                      transition-colors
                      focus:outline-none focus:underline
                    "
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Portals */}
          <nav aria-labelledby="footer-portals">
            <h4
              id="footer-portals"
              className="font-semibold mb-4 [font-size:clamp(0.95rem,2vw,1.05rem)]"
            >
              Portals
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/login"
                  className="
                    text-sm text-muted-foreground
                    hover:text-primary
                    transition-colors
                  "
                >
                  User Login
                </Link>
              </li>
            </ul>
          </nav>

          {/* Contact */}
          <section aria-labelledby="footer-contact">
            <h4
              id="footer-contact"
              className="font-semibold mb-4 [font-size:clamp(0.95rem,2vw,1.05rem)]"
            >
              Contact Us
            </h4>

            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>+92 370 9447916</span>
              </li>

              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <a href="mailto:Altawakkalfoods@gmail.com" className="hover:text-primary transition-colors">
                  altawakkalfoods112@gmail.com
                </a>
              </li>

              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Islamabad, Pakistan</span>
              </li>
            </ul>

            <p className="mt-4 text-xs text-muted-foreground">
              Mon – Sat: 9:00 AM – 6:00 PM
            </p>
          </section>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t pt-6 text-center">
          <p className="text-center text-sm text-muted-foreground mt-8">
    © {new Date().getFullYear()} AM Enterprises Pakistan • Authentic Pakistani Cuisine Delivered
  </p>
        </div>
      </div>
    </footer>
  );
};