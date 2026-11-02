import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
export default function SearchBar({ city, onSearch, compact = false }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  return (
    <form
      role="search"
      className={`mn-search flex items-center gap-[10px] border border-[#e3dbd7] rounded-[5px] bg-[#faf8f5] py-[10px] px-[12px] min-w-0 [&_input]:w-full [&_input]:min-w-0 [&_input]:bg-transparent [&_input]:border-0 [&_input]:outline-offset-[6px] [&_input]:text-[12px] [&_button]:flex [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-[#8c414e] ${compact ? "mn-search-compact [&.mn-search-compact]:w-[205px] [&.mn-search-compact]:py-[9px] [&.mn-search-compact]:px-[10px] [&.mn-search-compact_button]:hidden" : ""}`}
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
