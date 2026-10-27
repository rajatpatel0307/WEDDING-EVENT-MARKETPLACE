import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Flower2, Heart, MapPin } from "lucide-react";
import {
  serviceGroups,
  servicePath,
} from "../../../components/layout/services";
const titles = {
  venues: "A place for your forever.",
  vendors: "Good people. Beautiful celebrations.",
  packages: "Your day, brought together.",
  offers: "A little more to celebrate.",
  about: "Made for beautiful beginnings.",
  contact: "Let’s make something beautiful.",
  careers: "Build beautiful beginnings with us.",
  blog: "The MarryNest journal.",
  help: "A little help, every step of the way.",
  faq: "Your questions, thoughtfully answered.",
  cookies: "Cookie Policy",
  refunds: "Refund Policy",
  cancellation: "Cancellation Policy",
};
export default function MarketplacePage() {
  const { pathname } = useLocation(),
    [params] = useSearchParams();
  const page = pathname.split("/")[1],
    home = pathname === "/",
    services = page === "services",
    search = page === "search";
  return (
    <main id="main-content" className="mn-marketplace">
      <section className="mn-page-intro">
        <span className="mn-kicker">
          <span className="mn-tiny-flower">✳</span> THE WEDDING & EVENT
          MARKETPLACE
        </span>
        <h1>
          {home ? (
            <>
              Your kind of love.
              <br />
              <em>Your kind of celebration.</em>
            </>
          ) : services ? (
            <>
              Every detail.
              <br />
              <em>Beautifully covered.</em>
            </>
          ) : search ? (
            "Find your perfect match."
          ) : (
            titles[page] || "Your celebration starts here."
          )}
        </h1>
        <p>
          {home
            ? "The places, people and little details that make your big day feel like you. Discover your wedding, thoughtfully brought together."
            : services
              ? "From the first invitation to the last dance. Find the people who make it all possible."
              : search
                ? `Searching for “${params.get("q") || ""}”${params.get("city") ? ` in ${params.get("city")}` : ""}.`
                : "A thoughtful space for your plans, your people and your next chapter."}
        </p>
        {home && (
          <div className="mn-hero-actions">
            <Link className="mn-button" to="/services">
              Explore wedding services <ArrowUpRight size={16} />
            </Link>
            <Link className="mn-text-link" to="/auth/signup?role=vendor">
              Are you a wedding professional? <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
        <div className="mn-intro-flower" aria-hidden="true">
          <Flower2 size={210} strokeWidth={0.45} />
        </div>
      </section>
      {home || services || search ? (
        <section className="mn-services-section">
          <div className="mn-section-heading">
            <div>
              <span className="mn-kicker">A CELEBRATION, UNIQUELY YOURS</span>
              <h2>
                {params.get("category") || "What’s on your wedding list?"}
              </h2>
            </div>
            <Link to="/services" className="mn-text-link">
              All services <ArrowUpRight size={15} />
            </Link>
          </div>
          {search && (
            <p className="mb-6">
              Browse matching service categories below. Live venue, vendor and
              package listings are not available yet.
            </p>
          )}
          <div className="mn-service-cards">
            {serviceGroups
              .flatMap((g) => g.items)
              .filter(
                ([n, d]) =>
                  (!params.get("category") || n === params.get("category")) &&
                  (!search ||
                    `${n} ${d}`
                      .toLowerCase()
                      .includes((params.get("q") || "").toLowerCase())),
              )
              .map(([name, description, Icon]) => (
                <Link
                  to={servicePath(name)}
                  key={name}
                  className="mn-service-card"
                >
                  <Icon size={26} strokeWidth={1.25} />
                  <h3>{name}</h3>
                  <p>{description}</p>
                  <ArrowUpRight className="mn-card-arrow" size={18} />
                </Link>
              ))}
          </div>
          {search &&
            !serviceGroups
              .flatMap((g) => g.items)
              .some(([n, d]) =>
                `${n} ${d}`
                  .toLowerCase()
                  .includes((params.get("q") || "").toLowerCase()),
              ) && (
              <div className="mn-empty">
                <MapPin size={25} />
                <h3>No matching services yet.</h3>
                <p>
                  Try “photography”, “food” or “venue”, or explore all services.
                </p>
                <Link className="mn-text-link" to="/services">
                  Explore services <ArrowUpRight size={15} />
                </Link>
              </div>
            )}
        </section>
      ) : (
        <section className="mn-empty">
          <Heart size={28} strokeWidth={1.3} />
          <h2>
            {["cookies", "refunds", "cancellation"].includes(page)
              ? "Policy awaiting publication"
              : ["contact", "help", "faq"].includes(page)
                ? "We’re here to help."
                : "Something lovely is taking shape."}
          </h2>
          <p>
            {["cookies", "refunds", "cancellation"].includes(page)
              ? "The marketplace operator has not published this policy yet. Contact support before making a booking."
              : ["contact", "help", "faq"].includes(page)
                ? "For account questions or help with your vendor application, contact our support team."
                : "This part of the marketplace is being prepared. Explore our service categories or create your account to get started."}
          </p>
          {["contact", "help", "faq"].includes(page) && (
            <Link className="mn-text-link" to="/contact">
              Contact our team <ArrowUpRight size={14} />
            </Link>
          )}
          <Link className="mn-button" to="/services">
            Explore services <ArrowUpRight size={15} />
          </Link>
        </section>
      )}
    </main>
  );
}
