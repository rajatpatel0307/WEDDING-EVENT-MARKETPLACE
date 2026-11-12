import { Search } from "lucide-react";
import RecordPicker from "./RecordPicker";

const fieldLabel = "flex min-w-0 flex-col gap-[7px] text-[9px] font-medium uppercase tracking-[0.7px] text-[#8a9c8e]";
const control = "h-[40px]! w-full! min-w-0 rounded-[7px] border border-[#dfe8e1] bg-white px-[11px] py-[8px] text-[11px]! font-normal normal-case tracking-normal text-[#526e5d] placeholder:text-[#a0afa4]";

export default function VendorFilters({
  query, onQueryChange, location, onLocationChange, status, statuses,
  onStatusChange, onCategoryChange, from, to, onFromChange, onToChange, children,
}) {
  return (
    <div className="ad-vendor-toolbar grid min-w-0 gap-[20px] border-b border-[#edf1ed] p-[20px] [@media(width<=600px)]:gap-[16px] [@media(width<=600px)]:p-[16px]">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-[12px]">
        <label className={`${fieldLabel} min-w-[220px] flex-1 [@media(width<=600px)]:min-w-0 [@media(width<=600px)]:basis-full`}>
          <span>Search vendors</span>
          <span className="flex min-w-0 items-center gap-[9px] rounded-[8px] border border-[#b5cebd] bg-[#f5f9f5] px-[12px] transition-colors focus-within:border-[#176b60] focus-within:bg-white focus-within:ring-[3px] focus-within:ring-[#176b6014]">
            <Search size={17} className="shrink-0 text-[#7a9d85]" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search vendors"
              placeholder="Business name, owner, email or phone"
              value={query}
              onChange={event => onQueryChange(event.target.value)}
              className="h-[40px]! min-w-0 flex-1 border-0! bg-transparent! px-0! py-[9px]! text-[12px]! font-normal normal-case tracking-normal text-[#385b46] outline-none! shadow-none! ring-0! placeholder:text-[#93a69a]"
            />
          </span>
        </label>
        <div className="flex shrink-0 flex-wrap items-center gap-[8px] [&_button]:min-h-[40px]">{children}</div>
      </div>
      <div className="grid min-w-0 grid-cols-[repeat(5,minmax(0,1fr))] gap-[12px] [@media(width<=1400px)]:grid-cols-[repeat(3,minmax(0,1fr))] [@media(width<=700px)]:grid-cols-[repeat(2,minmax(0,1fr))] [@media(width<=420px)]:grid-cols-[1fr]">
        <RecordPicker
          resource="categories" name="filterCategory" required={false}
          showSearch={false} selectLabel="Category" controlClassName={control}
          labelClassName={fieldLabel} onChange={onCategoryChange}
        />
        <label className={fieldLabel}>
          <span>Location</span>
          <input className={control} aria-label="Filter vendor location" placeholder="City or state" value={location} onChange={event => onLocationChange(event.target.value)} />
        </label>
        <label className={fieldLabel}>
          <span>Verification status</span>
          <select className={control} aria-label="Filter by status" value={status} onChange={event => onStatusChange(event.target.value)}>
            <option value="">All statuses</option>
            {statuses.map(value => <option key={value} value={value}>{value === "UnderReview" ? "Under Review" : value}</option>)}
          </select>
        </label>
        <label className={fieldLabel}>
          <span>Registered from</span>
          <input className={control} aria-label="Created from" type="date" value={from} max={to || undefined} onChange={event => onFromChange(event.target.value)} />
        </label>
        <label className={fieldLabel}>
          <span>Registered until</span>
          <input className={control} aria-label="Created until" type="date" value={to} min={from || undefined} onChange={event => onToChange(event.target.value)} />
        </label>
      </div>
    </div>
  );
}
