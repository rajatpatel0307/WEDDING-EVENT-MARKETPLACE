import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, ArrowUpRight, Flower2 } from "lucide-react";
import { cities } from "../layout/navigation";
export default function Hero() {
  const [query, setQuery] = useState(""),
    [city, setCity] = useState("");
  const navigate = useNavigate();
  function search(e) {
    e.preventDefault();
    navigate(`/search?${new URLSearchParams({ q: query.trim(), city })}`);
  }
  return (
    <section className="mp-hero">
      <div className="mp-hero-copy">
        <span className="mn-kicker">
          <Flower2 size={14} /> FOR YOUR BEAUTIFULLY EVER AFTER
        </span>
        <h1>
          Plan your dream
          <br />
          wedding.
          <br />
          <em>All in one place.</em>
        </h1>
        <p>
          Discover venues, caterers, decorators, photographers and wedding
          professionals for a celebration that feels like you.
        </p>
        <div className="mp-hero-buttons">
          <Link to="/vendors" className="mn-button">
            Explore vendors <ArrowUpRight size={16} />
          </Link>
          <Link to="/venues" className="mn-text-link">
            Find a venue <ArrowUpRight size={16} />
          </Link>
        </div>
        <span className="mp-hero-note">
          Your people. Your place. Your perfect beginning.
        </span>
      </div>
      <figure className="mp-hero-photo">
        <img
          src="/images/wedding-garden-1024.webp"
          srcSet="/images/wedding-garden-640.webp 640w, /images/wedding-garden-1024.webp 1024w"
          sizes="(max-width: 767px) 100vw, 54vw"
          alt="Ivory flowers and soft draping frame a garden wedding mandap at golden hour"
          fetchPriority="high"
          width="1536"
          height="1024"
        />
        <figcaption>Make room for a little magic.</figcaption>
      </figure>
      <form className="mp-hero-search" role="search" onSubmit={search}>
        <label>
          <Search size={19} />
          <span>
            <span className="mp-search-label">YOUR WEDDING WISH LIST</span>
            <input
              type="search"
              list="wedding-search-suggestions"
              placeholder="What are you looking for?"
              aria-label="Search service, vendor or venue"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={200}
            />
          </span>
        </label>
        <datalist id="wedding-search-suggestions">
          {[
            "Venue",
            "Catering",
            "Decoration",
            "Photography",
            "DJ",
            "Makeup",
            "Mehndi",
            "Wedding Clothing",
            "Jewellery",
            "Transportation",
          ].map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <label>
          <MapPin size={19} />
          <span>
            <span className="mp-search-label">WHERE’S THE CELEBRATION?</span>
            <select
              aria-label="Search location"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">Select location</option>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </span>
        </label>
        <button className="mn-button" type="submit">
          Let’s find it <Search size={16} />
        </button>
      </form>
    </section>
  );
}
