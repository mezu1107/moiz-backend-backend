// src/components/Footer.tsx
import { Link } from "react-router-dom";
import {
  Facebook,
  Instagram,
  Twitter,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

export const Footer: React.FC = () => {
  const currentYear: number = new Date().getFullYear();

  return (
    <footer className="bg-card border-t mt-16">
      {/* 
        Fluid container:
        - Mobile-first padding
        - Max width prevents stretching on 4K
      */}
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <section aria-labelledby="footer-brand">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="
                  flex h-10 w-10 items-center justify-center
                  rounded-full gradient-primary
                  text-white font-bold
                  [font-size:clamp(1rem,2.5vw,1.25rem)]
                "
                aria-hidden
              >
                AM
              </div>
              <div>
                <h3
                  id="footer-brand"
                  className="font-bold [font-size:clamp(1rem,2.5vw,1.125rem)]"
                >
                  AM Foods
                </h3>
                <p className="text-xs text-muted-foreground">
                  AM Enterprises
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-xs">
              Bringing authentic Pakistani taste to your table with love and
              tradition.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {[Facebook, Instagram, Twitter].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  aria-label="Social link"
                  className="
                    flex h-10 w-10 items-center justify-center
                    rounded-full bg-muted
                    hover:bg-primary hover:text-primary-foreground
                    transition-colors
                    focus:outline-none focus:ring-2 focus:ring-primary
                  "
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
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
                <span>+92 300 1234567</span>
              </li>

              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>info@amfoods.com</span>
              </li>

              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Lahore, Pakistan</span>
              </li>
            </ul>

            <p className="mt-4 text-xs text-muted-foreground">
              Mon – Sat: 9:00 AM – 6:00 PM
            </p>
          </section>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} AM Foods – AM Enterprises. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
