import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, CalendarDays, CalendarHeart, Camera, Check,
  ChevronDown, FileText, Flower2, Heart, MapPin, Music2, Plus,
  ShoppingBag, Sparkles, Users, Utensils, Wallet,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { QuotationOverview } from "../../quotations/QuotationPages";
import { Badge, ErrorView, useCustomerData } from "../components/WorkspaceUI";
import { ServiceCard } from "../components/ServiceCards";
import { date, money } from "../services/workspace.api";

const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#315642] bg-[#315642] px-4 py-2.5 text-xs font-semibold text-white transition hover:border-[#234331] hover:bg-[#234331] motion-reduce:transition-none";
const textLink = "inline-flex min-h-10 shrink-0 items-center gap-1.5 text-xs font-medium text-[#526d4d] transition hover:text-[#234331] motion-reduce:transition-none";
const eyebrow = "text-[9px] font-semibold uppercase tracking-[0.2em] text-[#7c876f]";
const panel = "min-w-0 overflow-hidden rounded-2xl border border-[#e1e7dd] bg-white shadow-[0_3px_16px_#263c2803]";

const categories = [
  ["Venues", "Popular venues", "Venue & Location", MapPin],
  ["Catering", "A menu to remember", "Catering & Food", Utensils],
  ["Decoration", "Set the scene", "Decoration", Flower2],
  ["Entertainment", "Set the mood", "DJ & Entertainment", Music2],
  ["Photography", "Capture every moment", "Photography & Videography", Camera],
  ["Makeup", "Your perfect makeup artist", "Makeup & Beauty", Sparkles],
  ["Mehndi", "Beautiful mehndi", "Mehndi", Heart],
  ["Transport", "Arrive in style", "Transportation", ShoppingBag],
];

const statistics = [
  ["Active events", "events", "Your celebrations", CalendarHeart, "bg-[#edf3e8] text-[#60804f]", "events"],
  ["Upcoming bookings", "bookings", "Getting closer to the day", ShoppingBag, "bg-[#f7f0e5] text-[#a57d42]", "bookings"],
  ["Pending quotations", "quotations", "Ready for your decision", FileText, "bg-[#edf1f7] text-[#6a819e]", "quotations"],
  ["Wishlist items", "wishlist", "Saved with love", Heart, "bg-[#f8edf0] text-[#b07688]", "wishlist"],
  ["Total spent", "spent", "Successful INR payments", Wallet, "bg-[#eff2ee] text-[#627e71]", "payments"],
];

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-[#e9ede4] motion-reduce:animate-none ${className}`} />;
}

function SectionHeading({ label, title, to, link = "View all" }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div><p className={eyebrow}>{label}</p><h2 className="mt-1.5 font-serif text-[25px] leading-tight tracking-[-0.5px] text-[#314735]">{title}</h2></div>
      {to && <Link to={to} className={textLink}>{link}<ArrowUpRight size={15} aria-hidden="true" /></Link>}
    </header>
  );
}

function Recommendation({ category }) {
  const state = useCustomerData(`/discover?category=${encodeURIComponent(category.id)}&pageSize=4`);
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  return (
    <div aria-busy={state.loading}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h3 className="font-serif text-xl text-[#40533c]">{category.title}</h3>
        <Link className={textLink} to={`/customer/discover?category=${encodeURIComponent(category.id)}`}>View all {category.label.toLowerCase()}<ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
      {state.loading ? (
        <div role="status" aria-label={`Loading ${category.label.toLowerCase()}`} className="grid grid-cols-1 gap-4 min-[540px]:grid-cols-2 min-[1400px]:grid-cols-4">
          {[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-72 rounded-2xl" />)}
        </div>
      ) : state.data?.rows?.length ? (
        <div className="grid grid-cols-1 gap-4 min-[540px]:grid-cols-2 min-[1400px]:grid-cols-4">{state.data.rows.map((item) => <ServiceCard key={item.id} item={item} />)}</div>
      ) : (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-[#d9e2d1] bg-[#f2f5ed] p-6">
          <Sparkles size={24} className="shrink-0 text-[#8d9e77]" aria-hidden="true" />
          <div className="min-w-0 flex-1 basis-52"><h3 className="text-sm font-medium text-[#435b3e]">Beautiful possibilities are on their way</h3><p className="mt-1 text-xs leading-relaxed text-[#74806d]">New {category.label.toLowerCase()} will appear here as vendors are approved.</p></div>
          <Link to="/customer/discover" className={textLink}>Explore services<ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      )}
    </div>
  );
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const dashboard = useCustomerData("/dashboard");
  const catalog = useCustomerData("/catalog");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [now] = useState(() => Date.now());
  const [showQuotations, setShowQuotations] = useState(false);

  if (dashboard.error) return <ErrorView error={dashboard.error} retry={dashboard.retry} />;

  const data = dashboard.data;
  const event = data?.event;
  const bookings = data?.bookings || [];
  const loading = dashboard.loading;
  const today = new Date(now).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const eventTimestamp = event?.eventDate ? new Date(`${String(event.eventDate).slice(0, 10)}T00:00:00+05:30`).getTime() : NaN;
  const days = Number.isFinite(eventTimestamp) ? Math.max(0, Math.round((eventTimestamp - new Date(`${today}T00:00:00+05:30`).getTime()) / 86400000)) : null;
  const checklist = [
    ["Create your event", "A date for your diary", !!event, event ? `/customer/events/${event.id}` : "/customer/events?create=1"],
    ["Find your dream team", "Choose the people who get you", Number(event?.bookedServices) > 0, "/customer/discover"],
    ["Confirm your bookings", "Bring the details together", bookings.some((booking) => ["Confirmed", "Completed", "InProgress"].includes(booking.status)), "/customer/bookings"],
    ["Make it official", "Keep your payments in one place", Number(data?.stats?.spent) > 0, "/customer/payments"],
  ];
  const completed = checklist.filter((step) => step[2]).length;
  const progress = Math.round(completed / checklist.length * 100);
  const nextStep = checklist.find((step) => !step[2]);
  const availableCategories = categories.flatMap(([label, title, name, Icon]) => {
    const match = catalog.data?.categories?.find((category) => category.name === name);
    return match ? [{ id: match.id, label, title, Icon }] : [];
  });
  const activeCategory = availableCategories.find((category) => category.id === selectedCategory) || availableCategories[0];

  return (
    <div className="min-w-0 space-y-7 text-[#354b3b] sm:space-y-8 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#597a47] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#597a47]">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className={eyebrow}>A beautiful beginning</p>
          <h1 className="mt-2 font-serif text-[30px] leading-tight tracking-[-1px] text-[#2f4636] sm:text-[36px] min-[1400px]:text-[40px]">Your celebration starts here<span className="text-[#b48a79]">.</span></h1>
          <p className="mt-2.5 text-xs leading-relaxed text-[#77816f] sm:text-[13px]">Welcome back, {user?.firstName || "there"}. Let’s bring your vision to life.</p>
        </div>
        <Link to="/customer/events?create=1" className={`${primaryButton} shadow-sm`}><Plus size={16} aria-hidden="true" />Create an event</Link>
      </header>

      <section aria-labelledby="planning-hero-title" className="relative isolate flex min-h-[330px] items-center overflow-hidden rounded-2xl bg-[#36432e] sm:min-h-[350px]">
        <img src="/images/wedding-garden-1024.webp" alt="" fetchPriority="high" className="absolute inset-0 -z-20 size-full object-cover object-[center_49%]" />
        <div className="absolute inset-0 -z-10 bg-linear-to-r from-[#202c1e]/95 via-[#303b25]/75 to-[#2d3523]/10 max-sm:to-[#2d3523]/35" />
        <div className="max-w-[600px] px-6 py-9 sm:px-10 sm:py-10 min-[1400px]:px-12">
          <p className="flex items-center gap-2 text-[8px] font-medium uppercase tracking-[0.2em] text-[#ebd8b6] sm:text-[9px]"><Sparkles size={15} className="shrink-0" aria-hidden="true" />Every little detail, beautifully yours</p>
          <h2 id="planning-hero-title" className="mt-5 font-serif text-[40px] leading-[1.08] tracking-[-1px] text-[#fffaf1] sm:text-[50px]">Plan your<br /><em className="font-normal text-[#e8d2b5]">perfect wedding.</em></h2>
          <p className="mt-4 max-w-80 text-xs leading-7 text-[#ede6d7]">Your people. Your vision. One unforgettable celebration.<br className="max-sm:hidden" /> Bring it all together, one beautiful detail at a time.</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link to="/customer/discover" className="inline-flex min-h-11 items-center gap-3 rounded-xl bg-[#fbf6ec] px-5 py-3 text-xs font-semibold text-[#4c513b] transition hover:bg-white motion-reduce:transition-none">Find your dream team<ArrowUpRight size={17} aria-hidden="true" /></Link>
            <Link to="/customer/wishlist" className="inline-flex min-h-11 items-center gap-2 text-xs text-[#f6eddf] underline-offset-4 hover:underline"><Heart size={15} aria-hidden="true" />Your saved inspiration</Link>
          </div>
        </div>
        <div className="absolute right-8 bottom-8 hidden text-right xl:block"><p className="text-[8px] uppercase tracking-[0.3em] text-[#fff8eb]/85">The beginning of forever</p><p className="mt-2 font-serif text-xl italic text-[#fff8eb]">A day as extraordinary as your story.</p></div>
      </section>

      <section aria-label="Your celebration at a glance" aria-busy={loading} className="grid grid-cols-2 gap-3 min-[700px]:grid-cols-3 min-[1280px]:grid-cols-5 sm:gap-4">
        {statistics.map(([label, key, description, Icon, tone, path], index) => (
          <Link key={key} to={`/customer/${path}`} className={`group min-w-0 rounded-2xl border border-[#e1e7dc] bg-white p-4 shadow-[0_3px_16px_#263c2803] transition hover:-translate-y-0.5 hover:border-[#bdcdb0] hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none sm:p-5 ${index === 4 ? "max-[700px]:col-span-2" : ""}`}>
            <div className="flex items-center justify-between gap-3"><span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={18} strokeWidth={1.7} aria-hidden="true" /></span><ArrowUpRight size={15} className="text-[#a9b09e] transition group-hover:text-[#426637] motion-reduce:transition-none" aria-hidden="true" /></div>
            <p className="mt-3 text-[11px] font-medium text-[#737e6b]">{label}</p>
            {loading ? <Skeleton className="mt-2 h-9 w-20" /> : <p className="mt-1 break-words text-[28px] leading-tight font-semibold tracking-[-1px] text-[#344e39] tabular-nums">{key === "spent" ? money(data?.stats?.[key], true) : data?.stats?.[key] ?? 0}</p>}
            <p className="mt-2 text-[10px] leading-relaxed text-[#87907f]">{description}</p>
          </Link>
        ))}
      </section>

      <div className="grid items-stretch gap-5 min-[1200px]:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section aria-labelledby="upcoming-event-title" className={panel}>
          <div className="border-b border-[#edf0e8] p-5 sm:px-6"><SectionHeading label="A date to look forward to" title={<span id="upcoming-event-title">Your upcoming event</span>} to="/customer/events" link="All events" /></div>
          {loading ? <div role="status" aria-label="Loading your upcoming event" className="space-y-5 p-6"><Skeleton className="h-20" /><Skeleton className="h-16" /><Skeleton className="h-10" /></div> : event ? (
            <>
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <div aria-hidden="true" className="flex size-16 shrink-0 flex-col items-center justify-center rounded-xl border border-[#e0e7d5] bg-[#f2f5ec] text-[#526b43]"><span className="text-[9px] font-semibold uppercase tracking-[0.13em]">{Number.isFinite(eventTimestamp) ? new Date(eventTimestamp).toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" }) : "Event"}</span><span className="font-serif text-[29px] leading-tight">{Number.isFinite(eventTimestamp) ? new Date(eventTimestamp).toLocaleDateString("en-IN", { day: "2-digit", timeZone: "Asia/Kolkata" }) : <CalendarHeart size={25} />}</span></div>
                  <div className="min-w-0 flex-1"><span className="inline-flex rounded-full bg-[#f5eee5] px-2.5 py-1 text-[9px] font-medium text-[#997752]">{event.type}</span><h3 className="mt-2 break-words font-serif text-[24px] leading-tight text-[#354d3c]">{event.name}</h3><p className="mt-2 flex items-start gap-1 text-[11px] text-[#7e8775]"><MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" />{[event.city, event.state].filter(Boolean).join(", ") || "Location to be decided"}</p></div>
                  {days !== null && <div className="shrink-0 text-center max-[380px]:hidden"><strong className="block font-serif text-[34px] leading-none text-[#a5875b]">{days === 0 ? "Today" : days}</strong><span className="mt-2 block text-[8px] uppercase tracking-[0.12em] text-[#9a8e74]">{days === 0 ? "Your day is here" : days === 1 ? "Day to go" : "Days to go"}</span></div>}
                </div>
                <dl className="mt-6 grid grid-cols-1 gap-4 rounded-xl bg-[#f8f9f5] p-4 min-[480px]:grid-cols-3">
                  {[[CalendarDays, "Event date", date(event.eventDate)], [Users, "Guest count", `${event.guests ?? 0} guests`], [Wallet, "Your budget", money(event.budget)]].map(([Icon, label, value]) => <div key={label} className="min-w-0"><dt className="flex items-center gap-1.5 text-[10px] text-[#87907b]"><Icon size={13} aria-hidden="true" />{label}</dt><dd className="mt-2 break-words text-xs font-medium text-[#4c6044]">{value}</dd></div>)}
                </dl>
              </div>
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0e8] px-5 py-4 sm:px-6"><div><p className="text-xs text-[#65765b]"><strong className="font-semibold">{event.bookedServices ?? 0}</strong> booked services</p><p className="mt-1 text-[10px] text-[#8b9483]">{money(event.committed)} committed</p></div><Link to={`/customer/events/${event.id}`} className={primaryButton}>Manage event<ArrowRight size={15} aria-hidden="true" /></Link></footer>
            </>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-8 text-center"><span className="flex size-12 items-center justify-center rounded-2xl bg-[#f1f4e9] text-[#81956c]"><CalendarHeart size={24} aria-hidden="true" /></span><h3 className="mt-4 font-serif text-2xl text-[#3e543b]">Your story starts with a date</h3><p className="mt-2 max-w-72 text-xs leading-6 text-[#7c8771]">Create your first event to keep your budget, guests and vendors together.</p><Link to="/customer/events?create=1" className={`${primaryButton} mt-5`}><Plus size={15} aria-hidden="true" />Plan my event</Link></div>
          )}
        </section>

        <section aria-labelledby="planning-journey-title" aria-busy={loading} className="min-w-0 rounded-2xl border border-[#dfe6d4] bg-[#edf2e6] p-5 sm:p-6">
          <p className={eyebrow}>One step closer</p>
          <div className="mt-1.5 flex items-center justify-between gap-3"><h2 id="planning-journey-title" className="font-serif text-[25px] leading-tight tracking-[-0.5px] text-[#455b3c]">Your planning journey</h2><Sparkles size={20} className="shrink-0 text-[#99a581]" aria-hidden="true" /></div>
          {loading ? <div role="status" aria-label="Loading your planning progress" className="mt-6 space-y-5"><Skeleton className="h-10" /><Skeleton className="h-36" /></div> : (
            <>
              <div className="mt-4 flex items-end justify-between gap-3"><p className="font-serif text-[38px] leading-none text-[#617a4e]">{progress}<span className="ml-0.5 text-xl">%</span></p><p className="pb-1 text-[10px] text-[#7d8b6e]">{completed} of {checklist.length} milestones complete</p></div>
              <progress value={progress} max="100" aria-label="Planning milestones complete" className="mt-3 block h-1.5 w-full overflow-hidden rounded-full border-0 bg-[#dbe3cf] [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-[#dbe3cf] [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[#809b65] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-[#809b65]" />
              <ol className="mt-4 divide-y divide-[#dfe6d5]">
                {checklist.map(([label, description, done, to], index) => <li key={label}><Link to={to} aria-label={`${label}${done ? ", complete" : ""}`} className="group flex items-center gap-3 rounded-lg py-3"><span aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${done ? "border-[#859e70] bg-[#859e70] text-white" : "border-[#c1cfb2] text-[#7f9270]"}`}>{done ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className={`block text-xs font-medium ${done ? "text-[#657e50]" : "text-[#4e6342]"}`}>{label}</span><span className="mt-0.5 block text-[10px] text-[#829174]">{description}</span></span><ArrowUpRight size={14} className="shrink-0 text-[#a1ae93] group-hover:text-[#4a6b37]" aria-hidden="true" /></Link></li>)}
              </ol>
              <Link to={nextStep?.[3] || "/customer/events"} className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[#526d40] hover:text-[#304c24]">{nextStep ? "Take the next step" : "Keep planning"}<ArrowRight size={15} aria-hidden="true" /></Link>
            </>
          )}
        </section>
      </div>

      <section aria-labelledby="latest-bookings-title" className={panel}>
        <div className="border-b border-[#edf0e8] p-5 sm:px-6"><SectionHeading label="Coming together" title={<span id="latest-bookings-title">Your latest bookings</span>} to="/customer/bookings" /></div>
        {loading ? <div role="status" aria-label="Loading your bookings" className="space-y-3 p-6">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-12" />)}</div> : bookings.length ? (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[610px] border-collapse text-left text-xs">
              <caption className="sr-only">Your latest vendor bookings, dates, amounts and status</caption>
              <thead className="bg-[#f9faf7] text-[10px] uppercase tracking-wider text-[#88927d]"><tr>{["Vendor / service", "Event date", "Amount", "Status", ""].map((label, i) => <th key={i} scope="col" className="px-5 py-3.5 font-medium sm:px-6">{label || <span className="sr-only">Details</span>}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#edf0e8]">{bookings.map((booking) => <tr key={booking.id} className="transition hover:bg-[#fafbf8] motion-reduce:transition-none"><td className="max-w-64 px-5 py-4 sm:px-6"><strong className="block break-words font-medium text-[#44573d]">{booking.vendor}</strong><span className="mt-1 block break-words text-[10px] text-[#8a9480]">{booking.services}</span></td><td className="whitespace-nowrap px-5 py-4 text-[#728066] sm:px-6">{date(booking.bookingDate)}</td><td className="whitespace-nowrap px-5 py-4 font-medium text-[#4e6245] sm:px-6">{money(booking.amount)}</td><td className="px-5 py-4 sm:px-6"><Badge>{booking.status}</Badge></td><td className="px-5 py-4 sm:px-6"><Link to={`/customer/bookings/${booking.id}`} aria-label={`View booking from ${booking.vendor}`} className={textLink}>View<ArrowUpRight size={14} aria-hidden="true" /></Link></td></tr>)}</tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 p-6"><span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#f2f5ec] text-[#8a9b74]"><ShoppingBag size={22} aria-hidden="true" /></span><div className="min-w-0 flex-1 basis-52"><h3 className="font-serif text-xl text-[#455b3c]">Your dream team is waiting</h3><p className="mt-1 text-xs leading-6 text-[#7b8870]">Your booking requests and confirmations will appear here.</p></div><Link to="/customer/discover" className={primaryButton}>Discover services<ArrowRight size={15} aria-hidden="true" /></Link></div>
        )}
      </section>

      <section aria-labelledby="discover-services-title" className="space-y-5">
        <SectionHeading label="The people behind your perfect day" title={<span id="discover-services-title">Find your kind of extraordinary</span>} to="/customer/discover" link="All services" />
        {catalog.error ? <ErrorView error={catalog.error} retry={catalog.retry} /> : catalog.loading ? <div role="status" aria-label="Loading service categories" className="space-y-4"><Skeleton className="h-16" /><Skeleton className="h-56" /></div> : availableCategories.length ? (
          <>
            <div role="group" aria-label="Browse service categories" className="flex gap-2 overflow-x-auto p-1 pb-3 [scrollbar-width:thin]">
              {availableCategories.map(({ id, label, Icon }) => <button type="button" key={id} onClick={() => setSelectedCategory(id)} aria-pressed={activeCategory?.id === id} aria-controls="dashboard-category-results" className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-[11px] font-medium transition motion-reduce:transition-none ${activeCategory?.id === id ? "border-[#436039] bg-[#436039] text-white shadow-sm" : "border-[#e0e6d8] bg-white text-[#7a876e] hover:border-[#a8bb95] hover:text-[#4c6c3b]"}`}><Icon size={15} aria-hidden="true" />{label}</button>)}
            </div>
            <div id="dashboard-category-results"><Recommendation key={activeCategory.id} category={activeCategory} /></div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[#e6dfd0] bg-[#f7f2e9] p-6"><div><h3 className="font-serif text-2xl text-[#766849]">A dream team for your dream day</h3><p className="mt-2 text-xs leading-6 text-[#8e8470]">From the perfect venue to the final flourish, explore the possibilities.</p></div><Link to="/customer/discover" className={textLink}>Explore all services<ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        )}
      </section>

      <section className={panel} aria-label="Quotation details">
        <button type="button" aria-expanded={showQuotations} aria-controls="dashboard-quotations" onClick={() => setShowQuotations((value) => !value)} className="flex min-h-20 w-full cursor-pointer items-center gap-3 p-5 text-left transition hover:bg-[#fafbf8] motion-reduce:transition-none sm:px-6"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f3f0e8] text-[#a48d65]"><FileText size={18} aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block font-serif text-xl text-[#43583d]">Your quotations, in one place</span><span className="mt-1 block text-[11px] text-[#87917b]">Requests, conversations and the details that matter.</span></span><ChevronDown size={18} className={`shrink-0 text-[#8c9b7c] transition motion-reduce:transition-none ${showQuotations ? "rotate-180" : ""}`} aria-hidden="true" /></button>
        <div id="dashboard-quotations" hidden={!showQuotations} className="border-t border-[#edf0e8] p-5 sm:px-6">{showQuotations && <QuotationOverview role="Customer" />}</div>
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-[#e3e8db] pt-6 pb-2 text-center"><span className="font-serif text-lg text-[#849274]">MarryNest</span><span className="text-[10px] tracking-wide text-[#929d88]">Thoughtfully planned. Wholeheartedly celebrated.</span><Heart size={11} className="text-[#b9a48e]" aria-hidden="true" /></footer>
    </div>
  );
}
