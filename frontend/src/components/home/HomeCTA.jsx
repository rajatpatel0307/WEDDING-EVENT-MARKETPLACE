import { Link } from "react-router-dom";
import { ArrowUpRight, Flower2 } from "lucide-react";
export default function HomeCTA({ about = false }) {
  return (
    <section className="mp-final-cta">
      <Flower2 size={85} strokeWidth={0.7} aria-hidden="true" />
      <span className="mn-kicker">A BEAUTIFUL BEGINNING AWAITS</span>
      <h2>
        {about
          ? "Ready to start planning?"
          : "Your perfect wedding starts here."}
      </h2>
      <p>
        Find the right people, places and services
        <br />
        to make your celebration unforgettable.
      </p>
      <div>
        <Link className="mn-button" to="/vendors">
          Explore vendors <ArrowUpRight size={16} />
        </Link>
        <Link className="mn-button mn-button-outline" to="/venues">
          Find a venue <ArrowUpRight size={16} />
        </Link>
      </div>
      <p className="mp-vendor-invite">
        Are you a wedding professional?{" "}
        <Link to="/auth/signup?role=vendor">
          Become a vendor <ArrowUpRight size={13} />
        </Link>
      </p>
    </section>
  );
}
