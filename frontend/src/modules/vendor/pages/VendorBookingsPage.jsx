import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, CircleCheck, ClipboardList,
  Clock3, History, LoaderCircle, Mail, MapPin, MessageSquare, Phone,
  ReceiptText, ShieldCheck, Users, X,
  CalendarCheck, Store, Wallet,
} from "lucide-react";
import { useVendorData, Loading, ErrorView } from "../components/WorkspaceUI";
import { vendorRequest, save, money, date, timestamp } from "../services/workspace.api";
import { BookingStatus } from "../../admin/components/BookingUI";
import BookingChanges from "../../bookings/BookingChanges";
import BookingItemDetails from "../../bookings/BookingItemDetails";
import useBookingCustomerChat from "../services/useBookingCustomerChat";
import VendorBookingActions from "../components/VendorBookingActions";

const card = "min-w-0 rounded-2xl border border-[#dfe8e2] bg-white shadow-[0_2px_8px_#244d3403]";
const caption = "text-[11px] font-medium uppercase tracking-[0.09em] text-[#61766a]";
const control = "w-full rounded-xl border border-[#d9e3dc] bg-white px-3.5 py-3 text-sm text-[#34564f] placeholder:text-[#687c70] disabled:opacity-60";

function SectionHeading({ icon: Icon, title, children }) {
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <h2 className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-[#2e4c40]">
      <Icon size={18} className="text-[#698675]" aria-hidden="true" />{title}
    </h2>
    {children}
  </div>;
}

function ServiceDetails({ description }) {
  let snapshot;
  try { snapshot = JSON.parse(description); } catch { /* Older items store plain text. */ }
  if (!snapshot || typeof snapshot !== "object") return <BookingItemDetails description={description} />;
  const period = (value) => {
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
    return match ? `${date(match[1])}, ${match[2]}` : value;
  };
  return <div className="mt-3 space-y-3 text-xs leading-relaxed text-[#6b8074]">
    {snapshot.description && <p className="whitespace-pre-wrap wrap-anywhere">{snapshot.description}</p>}
    {(snapshot.duration || snapshot.startsAt || snapshot.instructions) && <dl className="grid gap-2 rounded-xl bg-[#f6f8f5] p-3.5">
      {snapshot.duration && <div className="flex flex-wrap gap-x-2"><dt className="font-medium text-[#526f5e]">Duration:</dt><dd>{snapshot.duration}</dd></div>}
      {snapshot.startsAt && <div><dt className="mb-1 font-medium text-[#526f5e]">Booking window</dt><dd>{period(snapshot.startsAt)}{snapshot.endsAt && <> – {period(snapshot.endsAt)}</>}<span className="mt-0.5 block text-[11px] text-[#61776b]">India time (IST)</span></dd></div>}
      {snapshot.instructions && <div><dt className="mb-1 font-medium text-[#526f5e]">Booking instructions</dt><dd className="whitespace-pre-wrap wrap-anywhere">{snapshot.instructions}</dd></div>}
    </dl>}
    {snapshot.inclusions?.length > 0 && <details className="rounded-xl border border-[#e5ece6] p-3.5">
      <summary className="cursor-pointer font-medium text-[#38634e]">Package inclusions ({snapshot.inclusions.length})</summary>
      <ul className="mt-3 ml-4 list-disc space-y-2">{snapshot.inclusions.map((item, index) => <li key={index}>{item.name}{item.quantity ? ` × ${Number(item.quantity)}` : ""}{item.description ? ` — ${item.description}` : ""}</li>)}</ul>
    </details>}
  </div>;
}

export default function VendorBookingsPage() {
  const { id } = useParams();
  const { openCustomerChat, openingBookingId, chatError } = useBookingCustomerChat();
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState("Accept");
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState("");
  const r = useVendorData(`/bookings/${id}`, version);

  useEffect(() => {
    setAction("Accept");
    setNote("");
    setError("");
    setSuccess("");
  }, [id]);

  async function submitDecision(e) {
    e.preventDefault();
    if (action === "Reject" && !note.trim()) {
      setError("Please add a note explaining why you are rejecting this booking.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await save(`/bookings/${id}/decision`, "POST", { action, note: note.trim(), expectedUpdatedAt: new Date(r.data.booking.UpdatedAt).toISOString() });
      setSuccess(action === "Accept" ? "Booking accepted successfully." : "Booking rejected. Your decision has been saved.");
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (r.loading) return <Loading />;
  if (r.error) return <ErrorView error={r.error} retry={r.retry} />;
  const d = r.data;
  const b = d.booking;
  const event = JSON.parse(b.EventSnapshotJson || "{}");
  const pending = b.BookingStatus === "Pending";
  const customer = d.customer;
  const initials = (customer?.name || "Customer").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("");

  return <div className="min-w-0 space-y-6 font-sans text-sm leading-relaxed text-[#34564f] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-55 [&_svg]:shrink-0 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-[#27735a]">
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 text-xs text-[#657b6e]">
      <Link to="/vendor/bookings/all" className="inline-flex min-h-8 items-center gap-2 font-medium text-[#527260] transition-colors hover:text-[#176b60]"><ArrowLeft size={15} aria-hidden="true" />All bookings</Link>
      <span aria-hidden="true" className="text-[#bdc9c0]">/</span><span>Booking details</span>
    </nav>

    <header className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="mt-1 grid size-12 shrink-0 place-items-center rounded-xl bg-[#eaf3ed] text-[#176b60]"><CalendarCheck size={24} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className={`${caption} mb-1.5`}>Booking details</p>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight wrap-anywhere text-[#284b3d] sm:text-[30px]">{b.BookingNumber}</h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#63796b]">
              <span className="inline-flex items-center gap-1.5"><Clock3 size={14} aria-hidden="true" />Booked {date(b.CreatedAt)}</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} aria-hidden="true" />Event {date(b.BookingDate)}</span>
            </div>
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-3 rounded-xl bg-[#fafcfb] px-4 py-3">
          <div><dt className="mb-2 text-xs text-[#607768]">Booking status</dt><dd><BookingStatus value={b.BookingStatus} /></dd></div>
          <div><dt className="mb-2 text-xs text-[#607768]">Payment status</dt><dd><BookingStatus value={b.PaymentStatus} /></dd></div>
        </dl>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-[#e6ece5] bg-[#fcfdfc] px-5 py-3 sm:px-6">
        {[[Users, "View Customer", "#booking-customer"], [Store, "View Vendor", "/vendor/business/profile"], [CalendarDays, "View Event", "#booking-event"], [Wallet, "View Payment", "#booking-payment"]].map(([Icon, label, target]) => {
          const classes = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d9e3dc] bg-white px-3.5 py-2.5 text-xs font-medium text-[#527260] hover:bg-[#f0f5f2]";
          return target.startsWith("#") ? <a key={label} href={target} className={classes}><Icon size={15} aria-hidden="true" />{label}</a> : <Link key={label} to={target} className={classes}><Icon size={15} aria-hidden="true" />{label}</Link>;
        })}
        <div className="flex flex-wrap items-center gap-2 min-[1350px]:ml-auto">
          <VendorBookingActions key={id} data={d} disabled={busy} saved={(message) => { setSuccess(message); setError(""); setVersion((v) => v + 1); }} />
        </div>
      </div>
    </header>

    {b.CancellationReason && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><strong>Cancellation reason: </strong>{b.CancellationReason}</p>}
    {success && <p role="status" className="flex items-center gap-2.5 rounded-xl border border-[#cfe5d4] bg-[#eaf5ed] px-4 py-3 text-sm text-[#326548]"><CircleCheck size={18} aria-hidden="true" />{success}</p>}
    {chatError && <p role="alert" className="rounded-xl border border-[#efd2cd] bg-[#fff3f0] px-4 py-3 text-sm text-[#a24338]">{chatError}</p>}
    {error && !pending && <p role="alert" className="rounded-xl border border-[#efd2cd] bg-[#fff3f0] px-4 py-3 text-sm text-[#a24338]">{error}</p>}
    {pending && <div className="flex items-start gap-3 rounded-xl border border-[#e8ddbe] bg-[#fcf8ec] p-4 text-[#806b36]">
      <Clock3 size={19} className="mt-0.5" aria-hidden="true" />
      <div><p className="text-[13px] font-semibold">This booking is waiting for your response</p><p className="mt-1 text-xs leading-relaxed text-[#7a6b44]">Review the event details and services, then accept or reject the request below.</p></div>
    </div>}

    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,1fr)]">
      <div className="contents xl:block xl:min-w-0 xl:space-y-6">
        <section id="booking-event" className={`${card} scroll-mt-6 overflow-hidden`} aria-labelledby="event-overview-title">
          <div className="flex items-center gap-4 border-b border-[#e6ece5] bg-[#fbfcf9] p-5 sm:px-6">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#dce7d9] bg-[#edf3e9] text-[#658559]"><CalendarDays size={23} strokeWidth={1.6} aria-hidden="true" /></span>
            <div className="min-w-0"><p className={`${caption} mb-1`}>Event overview</p><h2 id="event-overview-title" className="text-lg font-semibold wrap-anywhere text-[#2f5140]">{event.name || "Event booking"}</h2></div>
          </div>
          <div className="p-5 sm:p-6">
            <dl className="grid gap-5 sm:grid-cols-3 sm:gap-3">
              {[
                [CalendarDays, "Event date", b.BookingDate ? date(b.BookingDate) : "To be confirmed"],
                [MapPin, "Location", event.city || event.location?.city || "Not specified"],
                [Users, "Guest count", event.guests != null && event.guests !== "" ? `${event.guests} ${Number(event.guests) === 1 ? "guest" : "guests"}` : "Not specified"],
              ].map(([Icon, title, value]) => <div key={title} className="flex min-w-0 items-start gap-2.5"><Icon size={17} className="mt-0.5 text-[#6b826b]" aria-hidden="true" /><div className="min-w-0"><dt className={caption}>{title}</dt><dd className="mt-1.5 text-[13px] font-medium wrap-anywhere text-[#3b5d48]">{value}</dd></div></div>)}
            </dl>
            <div className="mt-6 rounded-xl border border-[#e6ece2] bg-[#f8faf6] p-4">
              <h3 className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[#56704d]"><MessageSquare size={15} aria-hidden="true" />Customer requirements</h3>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap wrap-anywhere text-[#647659]">{event.requirements || "No special requirements specified."}</p>
            </div>
          </div>
        </section>

        <section className={`${card} p-5 sm:p-6`} aria-label="Booked services">
          <SectionHeading icon={ClipboardList} title="Services & packages"><span className="rounded-full bg-[#f0f4ed] px-2.5 py-1 text-[11px] font-medium text-[#607652]">{d.items.length} {d.items.length === 1 ? "item" : "items"}</span></SectionHeading>
          <div className="space-y-5">
            {d.items.map((item, index) => <article key={item.id} className="min-w-0 border-b border-[#e8ede6] pb-5 last:border-0 last:pb-0">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eef3eb] text-xs font-semibold text-[#769069]">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold wrap-anywhere text-[#36573f]">{item.name}</h3><p className="mt-1 text-xs text-[#657858]">Quantity: {Number(item.quantity)}</p></div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-[#36573f]">{money(item.total)}</p>
              </div>
              <ServiceDetails description={item.description} />
            </article>)}
            {!d.items.length && <p className="text-sm text-[#627969]">No services listed for this booking.</p>}
          </div>
        </section>

        <section className={`${card} order-2 p-5 sm:p-6`} aria-label="Booking history">
          <SectionHeading icon={History} title="Booking history"><span className="text-[11px] text-[#667a60]">India time (IST)</span></SectionHeading>
          <ol>
            {d.history.map((entry, index) => <li key={entry.id} className="relative flex gap-3.5 pb-6 last:pb-0">
              {index < d.history.length - 1 && <span className="absolute top-7 bottom-0 left-[13px] w-px bg-[#e2e9dc]" aria-hidden="true" />}
              <span className="relative z-1 grid size-7 shrink-0 place-items-center rounded-full border border-[#dce7d4] bg-[#f1f6ed] text-[#789661]"><Check size={13} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><h3 className="text-[13px] font-semibold wrap-anywhere text-[#446139]">{entry.action || entry.status}</h3><time dateTime={entry.createdAt} className="text-[11px] text-[#697c5e]">{timestamp(entry.createdAt)}</time></div>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#687c59]"><span>{entry.role || "System"}</span>{entry.status && <><span aria-hidden="true">·</span>{entry.previous && <>{entry.previous}<ArrowRight size={12} aria-label="changed to" /></>}{entry.status}</>}</p>
                {entry.note && <p className="mt-2 rounded-lg bg-[#f7f9f4] px-3 py-2 text-xs whitespace-pre-wrap wrap-anywhere text-[#647653]">{entry.note}</p>}
              </div>
            </li>)}
          </ol>
          {!d.history.length && <p className="text-sm text-[#627969]">Booking updates will appear here.</p>}
        </section>
      </div>

      <aside className="order-1 min-w-0 space-y-6 xl:order-none" aria-label="Booking summary and actions">
        <section id="booking-customer" className={`${card} scroll-mt-6 p-5 sm:p-6`} aria-label="Customer details">
          <SectionHeading icon={Users} title="Customer details" />
          {customer ? <>
            <div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eaf0e5] text-sm font-semibold text-[#66824f]" aria-hidden="true">{initials}</span><div className="min-w-0"><h3 className="text-sm font-semibold wrap-anywhere text-[#3f5e35]">{customer.name || "Customer"}</h3><p className="mt-0.5 text-xs text-[#697f5a]">Booking customer</p></div></div>
            <div className="mt-5 space-y-3 border-t border-[#e7ece3] pt-4 text-xs">
              {customer.email && <a href={`mailto:${customer.email}`} className="flex items-start gap-2.5 text-[#68815a] hover:text-[#176b60]"><Mail size={16} className="mt-0.5 text-[#718662]" aria-hidden="true" /><span className="wrap-anywhere">{customer.email}</span></a>}
              {customer.phone && <a href={`tel:${customer.phone}`} className="flex items-center gap-2.5 text-[#68815a] hover:text-[#176b60]"><Phone size={16} className="text-[#718662]" aria-hidden="true" /><span className="wrap-anywhere">{customer.phone}</span></a>}
              {!customer.email && !customer.phone && <p className="text-[#647b59]">Contact details not provided.</p>}
            </div>
          </> : <p className="text-sm text-[#627969]">Customer details are not available.</p>}
          <button type="button" disabled={openingBookingId != null} onClick={() => openCustomerChat(id)} aria-busy={openingBookingId === id} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#cbded3] bg-[#edf6f0] px-4 py-3 text-xs font-semibold text-[#397154] transition-colors hover:border-[#9cbea7] hover:bg-[#dfede2] disabled:opacity-55">
            {openingBookingId === id ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <MessageSquare size={17} aria-hidden="true" />}{openingBookingId === id ? "Opening conversation…" : "Message customer"}
          </button>
        </section>

        <section id="booking-payment" className={`${card} scroll-mt-6 overflow-hidden`} aria-label="Payment summary">
          <div className="p-5 sm:p-6">
            <SectionHeading icon={ReceiptText} title="Payment summary" />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7ece3] pb-4"><span className="text-xs text-[#647b58]">Payment status</span><BookingStatus value={b.PaymentStatus} /></div>
            <dl className="mt-4 space-y-3 text-xs text-[#5f7554]">
              <div className="flex justify-between gap-4"><dt>Services & packages</dt><dd className="font-medium text-[#526c45]">{d.items.length}</dd></div>
              {b.PaidAmount != null && <div className="flex justify-between gap-4"><dt>Amount paid</dt><dd className="font-medium tabular-nums text-[#526c45]">{money(b.PaidAmount)}</dd></div>}
              {b.RemainingAmount != null && <div className="flex justify-between gap-4"><dt>Remaining balance</dt><dd className="font-medium tabular-nums text-[#526c45]">{money(b.RemainingAmount)}</dd></div>}
            </dl>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#dfe8d8] bg-[#f1f6ec] px-5 py-5 sm:px-6"><p className="text-sm font-medium text-[#516d40]">Total booking value</p><p className="text-2xl leading-tight font-semibold tracking-tight tabular-nums text-[#345b30]">{money(b.TotalAmount)}</p></div>
        </section>

        {pending && <section className={`${card} overflow-hidden border-[#cbdcc7]`} aria-labelledby="booking-response-title">
          <div className="border-b border-[#dce7d6] bg-[#edf4e8] p-5 sm:px-6"><h2 id="booking-response-title" className="flex items-center gap-2.5 text-[15px] font-semibold text-[#3f6533]"><ShieldCheck size={19} aria-hidden="true" />Your response</h2><p className="mt-1.5 text-xs leading-relaxed text-[#617b50]">Ready to bring this event to life?</p></div>
          <form onSubmit={submitDecision} className="space-y-5 p-5 sm:p-6">
            <fieldset disabled={busy} className="min-w-0"><legend className="mb-2.5 text-xs font-medium text-[#58714b]">Booking decision</legend><div className="grid grid-cols-2 gap-2.5">
              {[["Accept", Check], ["Reject", X]].map(([value, Icon]) => <label key={value} className="min-w-0 cursor-pointer">
                <input type="radio" name="action" value={value} checked={action === value} onChange={() => { setAction(value); setError(""); }} className="peer sr-only" />
                <span className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-disabled:cursor-not-allowed ${action === value ? value === "Accept" ? "border-[#7ea169] bg-[#edf5e6] text-[#4e7737]" : "border-[#d4a29b] bg-[#fcf0ed] text-[#ab6356]" : "border-[#dfe7da] bg-white text-[#647b54] hover:bg-[#f6f8f3]"}`}><Icon size={16} aria-hidden="true" />{value}</span>
              </label>)}
            </div></fieldset>
            <div>
              <label htmlFor="booking-response-note" className="flex flex-wrap items-center justify-between gap-1 text-xs font-medium text-[#58714b]">{action === "Reject" ? "Reason for rejection" : "Add a note"}<span className="text-[10px] font-normal text-[#697e5c]">{action === "Reject" ? "Required" : "Optional"}</span></label>
              <textarea id="booking-response-note" name="note" value={note} onChange={(e) => setNote(e.target.value)} required={action === "Reject"} disabled={busy} maxLength={1000} rows={4} placeholder={action === "Reject" ? "Let the customer know why you cannot accept…" : "Add a message about this booking…"} className={`${control} mt-2 resize-y`} aria-describedby="booking-note-hint" />
              <p id="booking-note-hint" className="mt-1.5 text-right text-[10px] tabular-nums text-[#6b7f5e]">{note.length} / 1,000</p>
            </div>
            {error && <p role="alert" className="rounded-lg border border-[#efd2cd] bg-[#fff3f0] px-3 py-2.5 text-xs text-[#a24338]">{error}</p>}
            <button type="submit" disabled={busy} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold text-white shadow-sm transition-colors ${action === "Reject" ? "bg-[#a86457] hover:bg-[#945448]" : "bg-[#426d37] hover:bg-[#345b2a]"}`}>
              {busy ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}{busy ? "Saving decision…" : action === "Reject" ? "Reject booking" : "Accept booking"}
            </button>
            <p className="text-center text-[11px] leading-relaxed text-[#687d59]">Review all details before saving your decision.</p>
          </form>
        </section>}

      </aside>
    </div>

    <div className="[&>section]:my-0 [&>section]:rounded-2xl [&>section]:border-[#dfe8e2] [&>section]:p-5 [&>section]:text-[#527247] sm:[&>section]:p-6 [&_h2]:text-[15px] [&_h2]:text-[#3f6036] [&_p]:leading-relaxed [&_button]:min-h-10 [&_button]:border-[#dce6d5] [&_button]:text-xs [&_button]:transition-colors [&_button:enabled:hover]:bg-[#f0f5eb] [&_button:disabled]:cursor-not-allowed [&_textarea]:border-[#dce6d5] [&_select]:border-[#dce6d5]">
      <BookingChanges id={id} data={d} role="Vendor" showRequestActions={false} request={vendorRequest} saved={(message) => { setSuccess(message); setVersion((v) => v + 1); }} />
    </div>
  </div>;
}
