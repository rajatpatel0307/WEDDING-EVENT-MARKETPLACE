import { RotateCcw, Search } from "lucide-react";
import RecordPicker from "./RecordPicker";

const control = "h-[40px]! min-w-0 rounded-[8px]! border! border-[#dfe7e1]! bg-white! px-[9px]! py-2! text-[11px]! font-normal! leading-normal! text-[#385649]! transition-colors hover:border-[#b5cbbd]! focus:border-[#176b60]! focus:outline-none! focus:ring-2! focus:ring-[#176b6014]!";

export default function VendorFilters({
  query, onQueryChange, status, statuses, onStatusChange,
  category, onCategoryChange, location, onLocationChange, cityOptions = [],
  from, to, onFromChange, onToChange, onClear, children,
}) {
  const hasFilters = Boolean(query || category || location || status || from || to);

  return (
    <div className="ad-vendor-toolbar @container min-w-0 border-b border-[#edf1ed] bg-white px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-3 @[1040px]:flex-nowrap">
      <label className="flex h-[40px] w-[220px] max-w-full min-w-0 items-center gap-2 rounded-[8px] border border-[#dfe7e1] bg-white px-[10px] transition-colors focus-within:border-[#176b60] focus-within:ring-2 focus-within:ring-[#176b6014] @[1040px]:w-auto @[1040px]:min-w-[130px] @[1040px]:flex-1 @max-[600px]:w-full">
        <Search size={18} className="shrink-0 text-[#91a394]" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search vendors"
          placeholder="Search records..."
          title="Search by business name, owner, email or phone"
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          className="h-[38px]! w-full! min-w-0 flex-1 border-0! bg-transparent! p-0! text-[12px]! font-normal! leading-normal! text-[#385649]! outline-none! shadow-none! ring-0! placeholder:text-[#98a79d]"
        />
      </label>

      <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2 @[1040px]:shrink-0 @[1040px]:flex-nowrap @max-[600px]:w-full [&_button]:h-[40px]! [&_button]:rounded-[8px]! [&_button]:px-[10px]! [&_button]:py-2! [&_button]:text-[11px]! [&_button]:font-normal! [&_button]:leading-normal! [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50">
        <RecordPicker
          resource="categories"
          name="filterCategory"
          required={false}
          showSearch={false}
          controlClassName={`${control} w-[124px]! shrink-0`}
          value={category}
          onChange={onCategoryChange}
        />
        <select
          className={`${control} w-[112px]! shrink-0`}
          aria-label="Filter vendor location"
          value={location}
          onChange={event => onLocationChange(event.target.value)}
        >
          <option value="">All cities</option>
          {location && !cityOptions.includes(location) && <option value={location}>{location}</option>}
          {cityOptions.map(city => <option key={city} value={city}>{city}</option>)}
        </select>
        <select
          className={`${control} w-[108px]! shrink-0`}
          aria-label="Filter by status"
          value={status}
          onChange={event => onStatusChange(event.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map(value => <option key={value} value={value}>{value === "UnderReview" ? "Under Review" : value}</option>)}
        </select>

        <div className="flex shrink-0 items-center gap-2">
          <label className="flex min-w-0 items-center gap-[7px] text-[10px] font-normal text-[#91a094]">
            <span>From</span>
            <input className={`${control} w-[112px]!`} aria-label="Created from" type="date" value={from} max={to || undefined} onChange={event => onFromChange(event.target.value)} />
          </label>
          <label className="flex min-w-0 items-center gap-[7px] text-[10px] font-normal text-[#91a094]">
            <span>To</span>
            <input className={`${control} w-[112px]!`} aria-label="Created until" type="date" value={to} min={from || undefined} onChange={event => onToChange(event.target.value)} />
          </label>
        </div>

        {children}
        {hasFilters && (
          <button type="button" onClick={onClear} aria-label="Clear vendor filters" title="Clear filters" className="ad-button inline-flex w-[40px] shrink-0 items-center justify-center border border-[#dfe7e1] bg-white px-0! text-[#637c6c] transition-colors hover:bg-[#f3f7f4] hover:text-[#176b60]">
            <RotateCcw size={15} aria-hidden="true" />
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
