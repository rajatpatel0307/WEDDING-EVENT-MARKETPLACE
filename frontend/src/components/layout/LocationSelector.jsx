import { useState } from "react";
import { MapPin, ChevronDown, Check, Search } from "lucide-react";
import Popover from "./Popover";
import { cities } from "./navigation";
export default function LocationSelector({ city, setCity, open, setOpen }) {
  const [query, setQuery] = useState("");
  return (
    <Popover
      name="location"
      open={open}
      setOpen={setOpen}
      className="mn-location"
      label={
        <>
          <MapPin size={15} />
          <span>{city}</span>
          <ChevronDown size={12} />
        </>
      }
    >
      <div className="mn-city-list">
        <h3>Select your city</h3>
        <label className="mn-input">
          <Search size={16} />
          <input
            aria-label="Search city"
            placeholder="Search city…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {cities
          .filter((c) => c.toLowerCase().includes(query.toLowerCase()))
          .map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => {
                setCity(c);
                setOpen(null);
              }}
            >
              <MapPin size={15} />
              {c}
              {c === city && <Check size={15} className="ml-auto" />}
            </button>
          ))}
        {!cities.some((c) => c.toLowerCase().includes(query.toLowerCase())) && (
          <p>No matching cities.</p>
        )}
      </div>
    </Popover>
  );
}
