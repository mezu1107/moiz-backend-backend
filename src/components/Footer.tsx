// src/components/Footer.tsx
import { Link } from "react-router-dom";
import {
  Facebook,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Music2, // Approximation for TikTok icon
} from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-b from-orange-50/80 to-amber-100/60 border-t border-orange-200 mt-20">
      <div className="mx-auto w-full max-w-screen-2xl px-6 sm:px-8 lg:px-12 py-12 sm:py-16">
        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <section aria-labelledby="footer-brand">
            <div className="flex items-center gap-4 mb-6">
              {/* Logo */}
              <div className="relative h-12 w-12 overflow-hidden rounded-full bg-white shadow-lg ring-2 ring-orange-300">
                <img
                  src="/logo.jpeg"
                  alt="AlTawakkalfoods Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3
                  id="footer-brand"
                  className="font-bold text-2xl text-orange-700"
                >
                  AlTawakkalfoods
                </h3>
                <p className="text-sm text-amber-800">
                  Authentic Pakistani Cuisine
                </p>
              </div>
            </div>

            <p className="text-base text-gray-700 leading-relaxed mb-8 max-w-xs">
              Bringing authentic Pakistani home-cooked flavors straight to your door with love and tradition.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://www.facebook.com/share/1Ds3XXteB8/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-600 text-white hover:bg-amber-600 hover:scale-110 transition-all duration-300 shadow-md"
              >
                <Facebook className="h-5 w-5" />
              </a>

              <a
                href="https://www.instagram.com/altawakkalfoods112?igsh=ZDdpZ3d2Znk0anFy"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-600 text-white hover:bg-amber-600 hover:scale-110 transition-all duration-300 shadow-md"
              >
                <Instagram className="h-5 w-5" />
              </a>

              <a
                href="https://vt.tiktok.com/ZSPwa5PrH/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-600 text-white hover:bg-amber-600 hover:scale-110 transition-all duration-300 shadow-md"
              >
                <Music2 className="h-5 w-5" />
              </a>

              <a
                href="https://youtube.com/@altawakkalfoods?si=QyHyE_y3GzNZf87S"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-600 text-white hover:bg-amber-600 hover:scale-110 transition-all duration-300 shadow-md"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </section>

          {/* Quick Links */}
          <nav aria-labelledby="footer-links">
            <h4
              id="footer-links"
              className="font-bold text-lg text-gray-900 mb-5"
            >
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                { to: "/", label: "Home" },
                { to: "/menu/all", label: "Menu" },
                { to: "/about", label: "About Us" },
                { to: "/contact", label: "Contact" },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-base text-gray-700 hover:text-orange-600 transition-colors duration-200"
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
              className="font-bold text-lg text-gray-900 mb-5"
            >
              Portals
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/login"
                  className="text-base text-gray-700 hover:text-orange-600 transition-colors duration-200"
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
              className="font-bold text-lg text-gray-900 mb-5"
            >
              Contact Us
            </h4>

            <ul className="space-y-4">
              <li className="flex items-start gap-4 text-base text-gray-700">
                <Phone className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <span>+92 332 0123459</span>
              </li>

              <li className="flex items-start gap-4 text-base text-gray-700">
                <Mail className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <a href="mailto:Altawakkalfoods@gmail.com" className="hover:text-orange-600 transition-colors">
                  altawakkalfoods112@gmail.com
                </a>
              </li>

              <li className="flex items-start gap-4 text-base text-gray-700">
                <MapPin className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <span>Islamabad, Pakistan</span>
              </li>
            </ul>

            <p className="mt-6 text-sm text-gray-600">
              Mon – Sat: 9:00 AM – 6:00 PM
            </p>
          </section>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-orange-200 text-center">
          <p className="text-sm text-gray-700">
  © {new Date().getFullYear()} AM Enterprises Pakistan • Authentic Pakistani Cuisine Delivered with Love
  <br />
  Designed & Developed by{" "}
  <a
    href="https://www.amenterprises.tech/"
    target="_blank"
    rel="noopener noreferrer"
    className="text-gray-700 no-underline hover:underline"
  >
    AM Enterprises
  </a>
</p>

        </div>
      </div>
    </footer>
  );
};