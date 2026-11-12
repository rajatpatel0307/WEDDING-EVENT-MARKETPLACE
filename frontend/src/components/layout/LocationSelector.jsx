import { useState } from "react";
import { MapPin, ChevronDown, Check, Search } from "lucide-react";
import Popover from "./Popover";
import { useCustomerLocations } from "../../modules/marketplace/location-selection";
export default function LocationSelector({ city, setCity, open, setOpen }) {
  const locations = useCustomerLocations();
  const cities = (locations.data || []).map(l => ({ id: l.id, name: `${l.city}, ${l.state}` }));
  const [query, setQuery] = useState("");
  return (
    <Popover
      name="location"
      open={open}
      setOpen={setOpen}
      className="mn-location [&_>_button]:flex [&_>_button]:items-center [&_>_button]:gap-[7px] [&_.mn-panel]:top-[calc(100%_+_8px)] [&_>_button]:py-[7px] [&_>_button]:px-0 max-[768px]:[&_>_button]:text-[10px]"
      label={
        <>
          <MapPin size={15} />
          <span>{cities.find(l => l.id === city)?.name || "Select location"}</span>
          <ChevronDown size={12} />
        </>
      }
    >
      <div className="mn-city-list w-[245px] p-[7px] [&_h3]:text-[14px] [&_>_button]:p-[8px] [&_>_button]:w-full [&_>_button]:flex [&_>_button]:items-center [&_>_button]:gap-[10px] [&_>_button]:rounded-[4px] [&_>_button:hover]:bg-[#f4e8e5]">
        <h3>Select your city</h3>
        <label className="mn-input flex items-center gap-[9px] border border-[#e5dbd7] p-[9px] rounded-[4px] mb-[8px] [&_input]:border-0 [&_input]:bg-transparent [&_input]:min-w-0 [&_input]:w-full [&_input]:text-[12px]">
          <Search size={16} />
          <input
            aria-label="Search city"
            placeholder="Search city…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {cities
          .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
          .map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => {
                setCity(c.id);
                setOpen(null);
              }}
            >
              <MapPin size={15} />
              {c.name}
              {c.id === city && <Check size={15} className="ml-auto" />}
            </button>
          ))}
        {locations.loading && <p role="status">Loading locations…</p>}
        {locations.error && <p role="alert">Locations unavailable. <button type="button" onClick={locations.retry}>Retry</button></p>}
        {!locations.loading && !locations.error && !cities.some((c) => c.name.toLowerCase().includes(query.toLowerCase())) && (
          <p>No matching cities.</p>
        )}
      </div>
    </Popover>
  );
}
