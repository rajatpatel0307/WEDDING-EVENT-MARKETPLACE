import {
  ArrowUpRight, BriefcaseBusiness, Check, ChevronLeft, ChevronRight,
  FileText, Home, MapPin, Pencil, Phone, Plus, Search, Star, Trash2, UserRound, X,
} from "lucide-react";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#873f52]";
const action = `inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${focus}`;
const primary = `${action} min-h-11 border-[#873f52] bg-[#873f52] px-4 text-white shadow-sm hover:bg-[#723247]`;

export function AddressHeader({ onAdd }) {
  return <header className="flex flex-wrap items-center justify-between gap-5">
    <div><p className="text-[9px] font-medium tracking-[1.7px] text-[#97765f] sm:text-[10px]">YOUR CELEBRATION, BEAUTIFULLY PLANNED</p><h1 className="mt-2 font-serif text-[38px] font-normal leading-tight tracking-tight text-[#49363e] sm:text-[44px]">My addresses<span className="text-[#b58c69]">.</span></h1><p className="mt-2 text-sm text-slate-500">Keep your contact details ready for every occasion.</p></div>
    <button type="button" className={primary} onClick={onAdd}><Plus size={17} aria-hidden="true" />Add address</button>
  </header>;
}

export function AddressSearch({ search, onSearch, total, loading }) {
  return <div className="flex flex-col gap-4 rounded-2xl border border-[#e3e6e0] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
    <div className="relative w-full sm:max-w-xl"><Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input type="search" aria-label="Search addresses" placeholder="Search by contact, city, postal code or street" value={search} maxLength={150} onChange={(event) => onSearch(event.target.value)} className={`min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-[#fafbf9] py-3 pr-11 pl-11 text-xs text-slate-700 placeholder:text-slate-400 hover:border-slate-300 ${focus}`} />{search && <button type="button" aria-label="Clear address search" onClick={() => onSearch("")} className={`absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 ${focus}`}><X size={14} aria-hidden="true" /></button>}</div>
    {!loading && <p className="shrink-0 text-xs text-slate-500" role="status">{total} {search.trim() ? "matching " : "saved "}{total === 1 ? "address" : "addresses"}</p>}
  </div>;
}

function AddressCard({ address: a, busy, onEdit, onRemove, onDefault }) {
  const Icon = { Home, Work: BriefcaseBusiness, Billing: FileText }[a.type] || MapPin;
  const latitude = Number(a.latitude), longitude = Number(a.longitude);
  const hasCoordinates = a.latitude !== null && a.latitude !== undefined && a.latitude !== "" && a.longitude !== null && a.longitude !== undefined && a.longitude !== "" && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  return <article aria-label={`${a.type || "Saved"} address for ${a.fullName || a.city || "your account"}`} className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${a.isDefault ? "border-[#cddfce]" : "border-[#e3e6e0]"}`}>
    <div className={`flex items-center justify-between gap-3 border-b p-5 ${a.isDefault ? "border-[#e4ece0] bg-[#f7faf4]" : "border-slate-100"}`}>
      <div className="flex min-w-0 items-center gap-3"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${a.isDefault ? "bg-[#e8f0e2] text-[#5b7856]" : "bg-[#f7f0f2] text-[#986778]"}`}><Icon size={21} strokeWidth={1.6} aria-hidden="true" /></span><h2 className="break-words text-base font-semibold text-[#37463d]">{a.type || "Address"}</h2></div>
      {a.isDefault && <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#d4e3ca] bg-[#eaf3e2] px-2.5 py-1 text-[10px] font-semibold text-[#527046]"><Check size={12} aria-hidden="true" />Default</span>}
    </div>
    <div className="flex-1 space-y-5 p-5">
      <div className="space-y-2.5">
        {a.fullName && <p className="flex items-start gap-2.5 text-sm font-semibold text-[#37463d]"><UserRound size={15} className="mt-0.5 text-slate-400" aria-hidden="true" /><span className="min-w-0 break-words">{a.fullName}</span></p>}
        {a.phone && <p className="flex items-center gap-2.5 text-xs text-slate-500"><Phone size={14} className="text-slate-400" aria-hidden="true" /><span className="break-all">{a.phone}</span></p>}
      </div>
      <div className="flex items-start gap-2.5"><MapPin size={16} className="mt-0.5 text-[#a68b76]" aria-hidden="true" /><address className="min-w-0 space-y-1 break-words text-sm leading-relaxed not-italic text-slate-600">
        {a.line1 && <p>{a.line1}</p>}{a.line2 && <p>{a.line2}</p>}{a.landmark && <p className="text-xs text-slate-500">{a.landmark}</p>}
        <p>{[a.city, a.district && a.district !== a.city ? a.district : null, a.state].filter(Boolean).join(", ")}{a.postalCode ? ` ${a.postalCode}` : ""}</p>
        {a.country && <p>{a.country}</p>}
      </address></div>
      {hasCoordinates && <a className={`ml-6 inline-flex min-h-8 items-center gap-1.5 rounded-md text-xs font-medium text-[#873f52] hover:underline ${focus}`} href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(a.latitude)}&mlon=${encodeURIComponent(a.longitude)}#map=16/${encodeURIComponent(a.latitude)}/${encodeURIComponent(a.longitude)}`} target="_blank" rel="noopener noreferrer">View on map<ArrowUpRight size={13} aria-hidden="true" /></a>}
    </div>
    <footer className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-[#fdfdfb] px-5 py-4">
      <button type="button" onClick={() => onEdit(a)} disabled={busy} aria-label={`Edit ${a.type || "saved"} address for ${a.fullName || a.city || "your account"}`} className={`${action} border-[#e3d5d8] bg-white text-[#873f52] hover:border-[#c6a6b0] hover:bg-[#faf3f5]`}><Pencil size={14} aria-hidden="true" />Edit</button>
      {!a.isDefault && <button type="button" disabled={busy} onClick={() => onDefault(a)} className={`${action} border-slate-200 bg-white text-slate-600 hover:border-[#cddfce] hover:bg-[#f1f6ed] hover:text-[#527046]`}><Star size={13} aria-hidden="true" />Set as default</button>}
      <button type="button" onClick={() => onRemove(a)} disabled={busy} aria-label={`Remove ${a.type || "saved"} address for ${a.fullName || a.city || "your account"}`} title="Remove address" className={`ml-auto grid size-10 place-items-center rounded-xl border border-transparent text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`}><Trash2 size={16} aria-hidden="true" /></button>
    </footer>
  </article>;
}

export function AddressGrid({ rows, ...actions }) {
  return <section aria-label="Saved addresses" className="grid min-w-0 grid-cols-1 items-stretch gap-5 md:grid-cols-2 2xl:grid-cols-3">{rows.map((a) => <AddressCard key={a.id} address={a} {...actions} />)}</section>;
}

export function AddressLoading() {
  return <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3" role="status"><span className="sr-only">Loading addresses</span>{[0, 1, 2].map((key) => <div key={key} className="space-y-5 rounded-2xl border border-[#e3e6e0] bg-white p-5"><div className="h-11 w-32 rounded-lg bg-slate-100 motion-safe:animate-pulse" /><div className="h-28 rounded-xl bg-slate-100 motion-safe:animate-pulse" /><div className="h-10 w-24 rounded-lg bg-slate-100 motion-safe:animate-pulse" /></div>)}</div>;
}

export function AddressEmpty({ filtered, onClear, onAdd }) {
  return <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#ddd7ce] bg-white px-5 py-14 text-center"><span className="mb-5 grid size-16 place-items-center rounded-2xl bg-[#f7f2ee] text-[#a3836a]"><MapPin size={30} strokeWidth={1.4} aria-hidden="true" /></span><h2 className="font-serif text-2xl text-[#49363e]">{filtered ? "No matching addresses" : "Make yourself at home"}</h2><p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{filtered ? "Try a different contact, city, postal code or street." : "Add an address to keep your contact and location details ready."}</p><button type="button" className={`${primary} mt-6`} onClick={filtered ? onClear : onAdd}>{filtered ? <X size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}{filtered ? "Clear search" : "Add address"}</button></div>;
}

export function AddressPagination({ page, pageSize, total, loading, onPage }) {
  const pages = Math.ceil(total / pageSize);
  return <nav aria-label="Address pages" className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e3e6e0] pt-5 text-xs text-slate-500"><p>Page {page} of {pages}</p><div className="flex items-center gap-3"><button type="button" className={`${action} border-slate-200 bg-white hover:bg-slate-50`} disabled={page <= 1 || loading} onClick={() => onPage(page - 1)}><ChevronLeft size={14} aria-hidden="true" />Previous</button><button type="button" className={`${action} border-slate-200 bg-white hover:bg-slate-50`} disabled={page >= pages || loading} onClick={() => onPage(page + 1)}>Next<ChevronRight size={14} aria-hidden="true" /></button></div></nav>;
}
