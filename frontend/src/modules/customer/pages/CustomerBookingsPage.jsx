import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDownWideNarrow, ArrowRight, ArrowUpRight, CalendarDays, CalendarHeart,
  Check, CheckCheck, ChevronLeft, ChevronRight, Clock3, Heart,
  ReceiptText, ShoppingBag, Sparkles, Wallet,
} from "lucide-react";
import { ErrorView, useCustomerData } from "../components/WorkspaceUI";
import { date, money } from "../services/workspace.api";

const filters = ["", "Pending", "Confirmed", "Upcoming", "Completed", "Cancelled"];
const pageSize = 9;
const statusLabels = { PaymentPending: "Awaiting payment", InProgress: "In progress", PartiallyPaid: "Partially paid", UnderReview: "Under review" };

function BookingStatus({ value, payment = false }) {
  const positive = ["Confirmed", "Completed", "Paid", "Accepted", "Success"].includes(value);
  const closed = ["Cancelled", "Rejected", "Refunded", "Failed", "Expired"].includes(value);
  const Icon = positive ? Check : closed ? ReceiptText : Clock3;
  return <span className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-[5px] border px-[7px] py-1 text-[10px] font-medium leading-[1.4] whitespace-nowrap ${positive ? "border-[#dce6cd] bg-[#f0f5e9] text-[#728b54]" : closed ? "border-[#e6ddd7] bg-[#f6f1ed] text-[#9c8074]" : "border-[#e9dcb9] bg-[#fcf6e7] text-[#9a7d35]"}`} aria-label={`${payment ? "Payment" : "Booking"} status: ${statusLabels[value] || value || "Not available"}`}><Icon size={12} aria-hidden="true" />{statusLabels[value] || value || "Not available"}</span>;
}

function BookingRow({ booking }) {
  const currency = booking.currency || "INR";
  const amount = (value) => money(value, false, currency);
  const validDate = booking.bookingDate && Number.isFinite(new Date(booking.bookingDate).getTime());
  return <tr>
    <th scope="row"><div className="flex min-w-[192px] items-center gap-[10px]"><span className="grid h-[38px] w-[34px] shrink-0 place-items-center rounded-lg border border-[#ead6de] bg-[#faedf2] text-[#ac7c8d]"><ShoppingBag size={18} strokeWidth={1.4} aria-hidden="true" /></span><Link className="text-[11px] font-medium wrap-anywhere text-[#87566a] hover:text-[#873f52] hover:underline! hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#873f52]" to={`/customer/bookings/${booking.id}`}>{booking.number}</Link></div></th>
    <td><span className="text-[11px] font-medium wrap-anywhere text-[#8c6d77]">{booking.vendor || "Your vendor"}</span></td>
    <td><div className="min-w-[150px] max-w-[230px] text-[12px] leading-[1.7] wrap-anywhere text-[#7e5b69]">{booking.services || "Your celebration booking"}</div></td>
    <td><span className="block min-w-[95px] max-w-[160px] wrap-anywhere text-[#9a828c]">{booking.event || "Event not linked"}</span></td>
    <td><span className="inline-flex items-center gap-[6px] whitespace-nowrap text-[#927581]"><CalendarDays size={13} className="text-[#b09a8e]" aria-hidden="true" />{validDate ? <time dateTime={booking.bookingDate}>{date(booking.bookingDate)}</time> : "Date to be confirmed"}</span></td>
    <td className="text-right! whitespace-nowrap"><strong className="text-[13px] font-medium text-[#8c5066] tabular-nums">{amount(booking.amount)}</strong></td>
    <td><div className="min-w-[130px]"><BookingStatus value={booking.paymentStatus} payment /><p className="mt-[7px] text-[9px]! leading-[1.6]! whitespace-nowrap text-[#879574]!">{amount(booking.paid)} paid</p><p className="mt-[3px] text-[9px]! leading-[1.6]! whitespace-nowrap text-[#a0888b]!">{amount(booking.remaining)} remaining</p></div></td>
    <td><BookingStatus value={booking.status} /></td>
    <td className="text-right!"><Link className="inline-flex min-h-[38px] items-center justify-center gap-[9px] rounded-[7px] border border-[#e3ccd4] bg-white px-3 py-[9px] text-[10px] font-medium leading-[1.5] whitespace-nowrap text-[#925369] transition-colors hover:border-[#873f52] hover:bg-[#873f52] hover:text-white! focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#873f52] motion-reduce:transition-none" to={`/customer/bookings/${booking.id}`} aria-label={`View details for ${booking.number}`}>View details <ArrowUpRight size={14} aria-hidden="true" /></Link></td>
  </tr>;
}

function BookingsTable({ rows = [], loading = false }) {
  return <div className="max-w-full overflow-x-auto rounded-xl border border-[#ece2dc] bg-white shadow-[0_4px_18px_#593f3504] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#873f52]" role="region" aria-label="Bookings table" tabIndex={0}>
    {loading && <span className="sr-only" role="status">Loading your bookings</span>}
    <table className="w-full min-w-[1160px] border-collapse text-left [&_thead_th]:border-b! [&_thead_th]:border-[#eaded7]! [&_thead_th]:bg-[#faf5ef]! [&_thead_th]:px-4! [&_thead_th]:py-4! [&_thead_th]:text-[9px]! [&_thead_th]:font-medium! [&_thead_th]:tracking-[.8px]! [&_thead_th]:whitespace-nowrap [&_thead_th]:text-[#a08372]! [&_tbody_:is(th,td)]:max-w-none! [&_tbody_:is(th,td)]:border-t! [&_tbody_:is(th,td)]:border-[#f0e7e0]! [&_tbody_:is(th,td)]:bg-white! [&_tbody_:is(th,td)]:px-4! [&_tbody_:is(th,td)]:py-5! [&_tbody_:is(th,td)]:align-middle! [&_tbody_:is(th,td)]:text-[11px]! [&_tbody_:is(th,td)]:font-normal! [&_tbody_:is(th,td)]:text-[#937986]! [&_tbody_:is(th,td)]:transition-colors [&_tbody_th]:text-left! [&_tbody_th]:tracking-normal! [&_tbody_th]:whitespace-normal! [&_tbody_tr:first-child>:is(th,td)]:border-t-0! [&_tbody_tr:hover>:is(th,td)]:bg-[#fffcf8]! [&_tbody_tr:focus-within>:is(th,td)]:bg-[#fffcf8]! motion-reduce:[&_tbody_:is(th,td)]:transition-none" aria-busy={loading}>
      <caption className="sr-only">Bookings with vendors, services, events, event dates, amounts, payments, statuses and detail links</caption>
      <thead><tr>{["Booking", "Vendor", "Services", "Event", "Event date", "Amount", "Payment", "Status", "Actions"].map((heading) => <th scope="col" className={heading === "Amount" || heading === "Actions" ? "text-right!" : "text-left!"} key={heading}>{heading}</th>)}</tr></thead>
      <tbody>{loading ? [0, 1, 2].map((row) => <tr key={row} aria-hidden="true">{Array.from({ length: 9 }, (_, cell) => <td key={cell}><span className="block h-[14px] min-w-[65px] rounded bg-[#f3ece5]" /></td>)}</tr>) : rows.map((booking) => <BookingRow key={booking.id} booking={booking} />)}</tbody>
    </table>
  </div>;
}

function OverviewCard({ label, value, icon: Icon, tone, caption, loading }) {
  return <article className={`relative min-w-0 overflow-hidden rounded-[11px] border px-5 py-[18px] max-[1250px]:p-4 max-[600px]:p-[13px] ${tone === "sage" ? "border-[#e0e6d8] bg-[linear-gradient(110deg,#fcfdf8,#f0f4e9)]" : tone === "gold" ? "border-[#eee2c9] bg-[linear-gradient(110deg,#fffdf7,#fcf5e6)]" : tone === "sand" ? "border-[#e9dfd3] bg-[linear-gradient(110deg,#fffdfa,#f5eee5)]" : "border-[#eadde1] bg-[linear-gradient(110deg,#fffaf9,#fcf1f2)]"}`}>
    <div className="mb-1 flex items-center justify-between gap-[10px] max-[600px]:gap-[5px]"><span className={`text-[11px] max-[1250px]:text-[10px] ${tone === "sage" ? "text-[#788369]" : tone === "gold" ? "text-[#99814d]" : tone === "sand" ? "text-[#93775f]" : "text-[#8c6775]"}`}>{label}</span><span className={`grid size-[34px] shrink-0 place-items-center rounded-[9px] border max-[1250px]:size-7 max-[1250px]:rounded-[7px] max-[1250px]:[&_svg]:w-4 ${tone === "sage" ? "border-[#dbe4cb] bg-[#eaf0df] text-[#89996f]" : tone === "gold" ? "border-[#ebddbb] bg-[#f6edd6] text-[#b29552]" : tone === "sand" ? "border-[#e4d6c4] bg-[#f0e5d7] text-[#a68a69]" : "border-[#ead6dd] bg-[#f6e8ed] text-[#a07182]"}`}><Icon size={19} strokeWidth={1.5} aria-hidden="true" /></span></div>
    <strong className={`block font-serif text-[31px] font-normal leading-[1.25] tracking-[-.8px] wrap-anywhere tabular-nums max-[600px]:text-[29px] ${tone === "sage" ? "text-[#687d4e]" : tone === "gold" ? "text-[#a0813d]" : tone === "sand" ? "text-[clamp(22px,2vw,30px)] leading-[1.45] text-[#937353] [@media(801px<=width<=1050px)]:text-[26px] max-[700px]:text-[26px] max-[600px]:text-[clamp(19px,5.3vw,26px)]" : "text-[#7e4659]"}`}>{loading ? "—" : value}</strong>
    <p className={`mt-2 text-[9px]! max-[1250px]:text-[8px]! [@media(801px<=width<=1050px)]:text-[9px]! max-[700px]:text-[9px]! max-[600px]:text-[8px]! ${tone === "sage" ? "text-[#95a184]!" : tone === "gold" ? "text-[#ad9a70]!" : tone === "sand" ? "text-[#a48c76]!" : "text-[#a0868d]!"}`}>{caption}</p>
  </article>;
}

export function CustomerBookingsView({ data, loading, error, retry, status, onStatus, page, onPage }) {
  const rows = data?.rows || [];
  const total = Number(data?.total || 0);
  const size = Number(data?.pageSize || pageSize);
  const totalPages = Math.max(1, Math.ceil(total / size));
  const stats = [
    { label: "Bookings shown", value: String(rows.length).padStart(2, "0"), icon: ShoppingBag, tone: "rose", caption: "Every detail, in one place" },
    { label: "Confirmed", value: String(rows.filter((row) => row.status === "Confirmed").length).padStart(2, "0"), icon: CheckCheck, tone: "sage", caption: "A little closer to the big day" },
    { label: "Pending requests", value: String(rows.filter((row) => row.status === "Pending").length).padStart(2, "0"), icon: Clock3, tone: "gold", caption: "Awaiting your vendor’s reply" },
    { label: "Booking value", value: money(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)), icon: Wallet, tone: "sand", caption: "Total of the bookings shown" },
  ];
  return <div className="mx-auto w-full min-w-0 max-w-[1440px] font-[Inter,'Segoe_UI',sans-serif] text-[13px] leading-[1.6] text-[#49363e] [&_svg]:shrink-0 [&_button]:cursor-pointer [&_a]:no-underline">
    <header className="mt-1 mb-[30px] flex items-center justify-between gap-6 max-[600px]:mt-0 max-[600px]:mb-[26px] max-[600px]:flex-wrap max-[600px]:gap-[19px]">
      <div><p className="flex items-center gap-2 text-[9px]! font-medium tracking-[1.7px] text-[#a18066]! max-[600px]:text-[8px]! max-[600px]:tracking-[1.3px]"><span className="size-[5px] rounded-full bg-[#b48b62]" /> YOUR CELEBRATION, BEAUTIFULLY PLANNED</p><h1 className="mt-[7px]! mb-[9px]! font-serif! text-[44px]! font-normal! leading-[1.2]! tracking-[-1.8px]! text-[#49363e]! max-[600px]:text-[39px]!">My bookings<span className="text-[#b58c69]">.</span></h1><p className="text-[12px]! text-[#8c7a80]! max-[600px]:text-[11px]!">Your dream team, from the first request to the big day.</p></div>
      <Link className="inline-flex min-h-[45px] shrink-0 items-center justify-center gap-[10px] rounded-lg border border-[#873f52] bg-[#873f52] px-[19px] py-3 text-[11px] font-medium leading-[1.5] text-white shadow-[0_4px_12px_#74314712] transition-[background,box-shadow] hover:border-[#723247] hover:bg-[#723247] hover:text-white! hover:shadow-[0_5px_18px_#74314722] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#873f52] motion-reduce:transition-none max-[600px]:min-h-[41px] max-[600px]:px-[15px] max-[600px]:py-[10px] max-[600px]:text-[10px]" to="/customer/discover"><Sparkles size={16} strokeWidth={1.6} aria-hidden="true" /> Find services <ArrowUpRight size={16} aria-hidden="true" /></Link>
    </header>

    {!error && <section className="mb-8 max-[600px]:mb-[27px]" aria-label="Current page booking overview"><div className="mb-[10px] flex items-center justify-between gap-3 max-[600px]:items-start"><span className="text-[9px] tracking-[1.5px] text-[#9b7b68] max-[600px]:text-[8px]">AT A GLANCE</span><p className="text-[10px]! text-[#a08f88]! max-[600px]:max-w-[170px] max-[600px]:text-right max-[600px]:text-[9px]!">For the bookings shown on this page</p></div><div className="grid grid-cols-4 gap-4 max-[1250px]:gap-3 [@media(801px<=width<=1050px)]:grid-cols-2 max-[700px]:grid-cols-2 max-[600px]:gap-[10px]">{stats.map((stat) => <OverviewCard key={stat.label} {...stat} loading={loading} />)}</div></section>}

    <section aria-labelledby="cb-collection-title">
      <div className="mb-[19px] flex items-center justify-between gap-[15px]"><div><p className="text-[8px]! font-medium tracking-[1.5px] text-[#a18066]! max-[600px]:text-[7px]! max-[600px]:tracking-[1.3px]">PLANS WORTH LOOKING FORWARD TO</p><h2 id="cb-collection-title" className="mt-1! font-serif! text-[27px]! font-normal! leading-[1.3]! tracking-[-.6px]! text-[#49363e]! max-[600px]:text-[25px]!">Your booking collection</h2></div><span className="inline-flex items-center gap-[7px] text-[10px] whitespace-nowrap text-[#a08c83] [@media(801px<=width<=1050px)]:hidden max-[700px]:hidden"><ArrowDownWideNarrow size={14} aria-hidden="true" /> Latest bookings first</span></div>
      <div className="mb-6 flex items-center justify-between gap-[14px] rounded-[10px] border border-[#e9e0d8] bg-[#f2ede7] p-[7px] max-[600px]:mb-[19px] max-[600px]:p-[5px]"><nav className="flex min-w-0 gap-[5px] overflow-x-auto [scrollbar-width:thin] max-[600px]:gap-1 max-[600px]:p-[2px]" aria-label="Booking status">{filters.map((filter) => <button key={filter} type="button" className={`min-h-[37px] shrink-0 rounded-[7px] border px-[15px] py-2 text-[11px] leading-[1.6] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-3 focus-visible:outline-[#873f52] motion-reduce:transition-none max-[1250px]:px-3 max-[600px]:min-h-9 max-[600px]:px-[13px] max-[600px]:text-[10px] ${status === filter ? "border-[#e6d8d6] bg-white font-semibold text-[#88445a] shadow-[0_2px_5px_#65453508]" : "border-transparent bg-transparent text-[#8b7a74] hover:bg-[#ffffff80] hover:text-[#885369]"}`} aria-pressed={status === filter} onClick={() => onStatus(filter)}>{filter || "All bookings"}</button>)}</nav>{!loading && !error && <span className="shrink-0 pr-[10px] text-[10px] text-[#a38d7f] max-[1250px]:hidden">{total} {total === 1 ? "booking" : "bookings"}</span>}</div>

      {loading ? <BookingsTable loading /> : error ? <ErrorView error={error} retry={retry} /> : rows.length ? <BookingsTable rows={rows} /> : <div className="grid justify-items-center gap-[14px] rounded-[13px] border border-dashed border-[#ddcbc2] bg-[#fffdf9] px-6 py-[55px] text-center max-[600px]:px-5 max-[600px]:py-10"><span className="mb-2 grid size-[73px] place-items-center rounded-full border border-[#eadace] bg-[#f9f0e8] text-[#b18b6f]"><CalendarHeart size={35} strokeWidth={1.2} aria-hidden="true" /></span><p className="text-[8px]! font-medium tracking-[1.7px] text-[#a18066]!">MAKE ROOM FOR SOMETHING BEAUTIFUL</p><h3 className="m-0! font-serif! text-[29px]! font-normal! leading-[1.3]! tracking-[-.5px]! text-[#7a5360]!">{page > 1 ? "No bookings on this page" : status ? `No ${status.toLowerCase()} bookings yet` : "Your dream team is waiting"}</h3><p className="max-w-[350px] text-[12px]! text-[#9c8587]!">{page > 1 ? "Return to the first page to see your bookings." : status ? "Your bookings will appear here as their status changes." : "Find the services you love and bring your celebration to life."}</p>{page > 1 || status ? <button type="button" className="mt-[7px] inline-flex min-h-[45px] items-center justify-center gap-[10px] rounded-lg border border-[#873f52] bg-[#873f52] px-[19px] py-3 text-[11px] font-medium text-white transition-colors hover:bg-[#723247] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#873f52] motion-reduce:transition-none" onClick={() => page > 1 ? onPage(1) : onStatus("")}>{page > 1 ? "Back to first page" : "View all bookings"}<ArrowRight size={15} aria-hidden="true" /></button> : <Link className="mt-[7px] inline-flex min-h-[45px] items-center justify-center gap-[10px] rounded-lg border border-[#873f52] bg-[#873f52] px-[19px] py-3 text-[11px] font-medium text-white transition-colors hover:bg-[#723247] hover:text-white! focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#873f52] motion-reduce:transition-none" to="/customer/discover">Explore services <ArrowRight size={15} aria-hidden="true" /></Link>}</div>}

      {!loading && !error && rows.length > 0 && <div className="mt-6 flex flex-wrap items-center justify-between gap-[18px] border-t border-[#e9ded5] pt-[19px] pb-2 text-[10px] text-[#a18b80] max-[600px]:justify-center max-[600px]:text-center"><p className="text-[10px]! text-[#a18b80]!">Showing {(page - 1) * size + 1}–{Math.min((page - 1) * size + rows.length, total)} of {total} {total === 1 ? "booking" : "bookings"}</p>{totalPages > 1 && <nav className="flex items-center gap-3 text-[#9c7d7f] [&_button]:grid [&_button]:size-[33px] [&_button]:place-items-center [&_button]:rounded-md [&_button]:border [&_button]:border-[#e3d6d6] [&_button]:bg-white [&_button]:text-[#976376] [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-40 [&_button:enabled:hover]:bg-[#fbf0f3] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-3 [&_button:focus-visible]:outline-[#873f52]" aria-label="Booking pages"><button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} aria-hidden="true" /></button><span>Page <strong>{page}</strong> of {totalPages}</span><button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPage(page + 1)}><ChevronRight size={16} aria-hidden="true" /></button></nav>}<span className="inline-flex items-center gap-[7px] text-[9px] text-[#b09a8b] max-[600px]:w-full max-[600px]:justify-center max-[600px]:text-[8px]"><Heart size={13} strokeWidth={1.4} aria-hidden="true" /> Thoughtfully planned. Beautifully remembered.</span></div>}
    </section>
  </div>;
}

export default function CustomerBookingsPage() {
  const [params, setParams] = useSearchParams();
  const status = filters.includes(params.get("status")) ? params.get("status") : "";
  const requestedPage = Number(params.get("page") || 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage <= 10000 ? requestedPage : 1;
  const response = useCustomerData(`/records/bookings?${new URLSearchParams({ page, pageSize, status })}`);
  function changeStatus(nextStatus) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (nextStatus) next.set("status", nextStatus); else next.delete("status");
      next.delete("page");
      return next;
    });
  }
  function changePage(nextPage) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (nextPage > 1) next.set("page", String(nextPage)); else next.delete("page");
      return next;
    });
  }
  return <CustomerBookingsView {...response} status={status} onStatus={changeStatus} page={page} onPage={changePage} />;
}
