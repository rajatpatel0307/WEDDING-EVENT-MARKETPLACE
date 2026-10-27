import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
export default function SearchBar({ city, onSearch, compact = false }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  return (
    <form
      role="search"
      className={`mn-search ${compact ? "mn-search-compact" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!query.trim()) return;
        navigate(
          `/search?q=${encodeURIComponent(query.trim())}&city=${encodeURIComponent(city)}`,
        );
        onSearch?.();
      }}
    >
      <Search size={17} />
      <input
        aria-label="Search venues, vendors, services, locations and packages"
        type="search"
        required
        placeholder="Search venues, vendors…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button aria-label="Submit search" type="submit">
        <ArrowRight size={17} />
      </button>
    </form>
  );
}
