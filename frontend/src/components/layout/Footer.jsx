import { useEffect, useState } from "react";
import { Instagram, Facebook, Youtube, Linkedin } from "../common/SocialIcons";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Heart, ShieldCheck, MapPin } from "lucide-react";
import Logo from "../common/Logo";
import Newsletter from "../common/Newsletter";
import { serviceGroups, servicePath } from "./services";
const legal = [
  ["Privacy Policy", "/privacy-policy"],
  ["Terms & Conditions", "/terms-and-conditions"],
  ["Cookie Policy", "/cookies"],
  ["Refund Policy", "/refunds"],
];
const columns = [
  [
    "Services",
    serviceGroups
      .flatMap((g) => g.items)
      .slice(0, 9)
      .map(([name]) => [
        name === "Photography & Videography" ? "Photography" : name,
        servicePath(name),
      ]),
  ],
  [
    "Wedding essentials",
    [
      ["Wedding Clothing", servicePath("Wedding Clothing")],
      ["Jewellery & Accessories", servicePath("Jewellery & Accessories")],
      ["Mehndi", servicePath("Mehndi")],
      ...serviceGroups[3].items.map(([name]) => [name, servicePath(name)]),
    ],
  ],
  [
    "Company",
    [
      ["About us", "/about"],
      ["Contact us", "/contact"],
      ["Our vendors", "/vendors"],
      ["Careers", "/careers"],
      ["The journal", "/blog"],
      ["Become a vendor", "/auth/signup?role=vendor"],
    ],
  ],
  [
    "Here to help",
    [
      ["Help center", "/help"],
      ["FAQs", "/faq"],
      ["Booking support", "/help/bookings"],
      ["Payment support", "/help/payments"],
      ["Cancellation policy", "/cancellation"],
      ["Terms & Conditions", "/terms-and-conditions"],
      ["Privacy Policy", "/privacy-policy"],
      ["Refund policy", "/refunds"],
    ],
  ],
];
function FooterColumn({ title, items }) {
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setExpanded(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <details
      className="mn-footer-column"
      open={expanded}
      onToggle={(e) => setExpanded(e.currentTarget.open)}
    >
      <summary>
        {title}
        <span>+</span>
      </summary>
      <div>
        {items.map(([name, path]) => (
          <Link key={name} to={path}>
            {name}
          </Link>
        ))}
        {title === "Services" && (
          <Link className="mn-footer-all" to="/services">
            View all services <ArrowUpRight size={13} />
          </Link>
        )}
      </div>
    </details>
  );
}
export default function Footer() {
  const { pathname } = useLocation();
  return (
    <footer className="mn-footer">
      {!["/", "/about", "/contact"].includes(pathname) && (
        <section className="mn-footer-cta">
          <div>
            <span className="mn-kicker">YOUR NEXT CHAPTER STARTS HERE</span>
            <h2>Big dreams. Beautiful beginnings.</h2>
            <p>
              Find the perfect venue and the people who bring your day to life.
            </p>
          </div>
          <div className="mn-footer-cta-buttons">
            <Link className="mn-button" to="/vendors">
              Explore vendors <ArrowUpRight size={16} />
            </Link>
            <Link
              className="mn-button mn-button-outline"
              to="/auth/signup?role=vendor"
            >
              Become a vendor <ArrowUpRight size={16} />
            </Link>
          </div>
          <Heart
            className="mn-cta-heart"
            size={160}
            strokeWidth={0.4}
            aria-hidden="true"
          />
        </section>
      )}
      <div className="mn-footer-inner">
        <div className="mn-footer-grid">
          <div className="mn-footer-brand">
            <Logo light />
            <p>
              Everything you need to create a beautiful, memorable wedding — all
              in one place.
            </p>
            <div className="mn-footer-location">
              <MapPin size={14} /> Made for celebrations across India.
            </div>
            <div className="mn-socials">
              {[
                [Instagram, "Instagram", import.meta.env.VITE_SOCIAL_INSTAGRAM],
                [Facebook, "Facebook", import.meta.env.VITE_SOCIAL_FACEBOOK],
                [Youtube, "YouTube", import.meta.env.VITE_SOCIAL_YOUTUBE],
                [Linkedin, "LinkedIn", import.meta.env.VITE_SOCIAL_LINKEDIN],
              ].map(([Icon, label, href]) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  aria-disabled={!href}
                  title={href ? label : `${label} profile coming soon`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon size={17} strokeWidth={1.5} />
                </a>
              ))}
              <a
                href={import.meta.env.VITE_SOCIAL_PINTEREST}
                aria-label="Pinterest"
                aria-disabled={!import.meta.env.VITE_SOCIAL_PINTEREST}
                title={
                  import.meta.env.VITE_SOCIAL_PINTEREST
                    ? "Pinterest"
                    : "Pinterest profile coming soon"
                }
                target="_blank"
                rel="noreferrer"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2a10 10 0 0 0-3.6 19.3c0-.8 0-1.8.2-2.7l1.3-5.5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.7 1.3 1.5 0 .9-.6 2.3-.9 3.6-.3 1.1.5 2 1.6 2 1.9 0 3.3-2 3.3-4.9 0-2.5-1.8-4.2-4.3-4.2-3 0-4.8 2.2-4.8 4.5 0 .9.3 1.9.8 2.4l.2.6-.3 1c0 .2-.2.3-.5.2-1.3-.6-2.1-2.4-2.1-3.9 0-3.2 2.3-6.1 6.7-6.1 3.5 0 6.2 2.5 6.2 5.8 0 3.5-2.2 6.4-5.1 6.4-1 0-2-.6-2.4-1.2l-.7 2.7c-.3 1-.9 2-1.3 2.7A10 10 0 1 0 12 2z" />
                </svg>
              </a>
            </div>
          </div>
          {columns.map(([title, items]) => (
            <FooterColumn key={title} title={title} items={items} />
          ))}
          <div className="mn-mobile-legal">
            <FooterColumn title="Legal" items={legal} />
          </div>
        </div>
        <Newsletter />
        <div className="mn-footer-trust">
          <span>
            <ShieldCheck size={15} /> Thoughtful choices. Trusted connections.
          </span>
          <span>
            Made with <Heart size={12} /> for your happily ever after.
          </span>
        </div>
        <div className="mn-footer-bottom">
          <span>
            © {new Date().getFullYear()} MarryNest Wedding Marketplace. All
            rights reserved.
          </span>
          <div>
            {legal.map(([n, p]) => (
              <Link key={n} to={p}>
                {n}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
