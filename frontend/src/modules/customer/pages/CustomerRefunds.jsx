import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Clock3, Eye, LoaderCircle, ReceiptText, RotateCcw, X } from "lucide-react";
import {
  useCustomerData,
  ErrorView,
} from "../components/WorkspaceUI";
import { save, money, date } from "../services/workspace.api";
import { useAuth } from "../../../context/AuthContext";
const refundFocus = "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#873f52]";

export function RefundRequestView({ data, loading, error, retry, busy, submitError, onSubmit }) {
  const control = "mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:border-[#873f52] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#873f52] disabled:bg-slate-50 disabled:opacity-60";
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e3e6e0] bg-white shadow-sm" aria-label="Booking refund options" aria-busy={loading}>
      <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
        <span className="grid size-9 place-items-center rounded-xl bg-[#f4edf0] text-[#966075]"><RotateCcw size={18} aria-hidden="true" /></span>
        <div><h2 className="text-base font-semibold text-[#37463d]">Refund options</h2><p className="mt-0.5 text-[11px] text-slate-500">Based on your booking policy</p></div>
      </header>
      {loading ? <div className="space-y-3 p-5" role="status"><span className="sr-only">Checking refund eligibility</span><div className="h-20 rounded-xl bg-slate-100 motion-safe:animate-pulse" /><div className="h-10 rounded-lg bg-slate-100 motion-safe:animate-pulse" /></div>
        : error ? <ErrorView error={error} retry={retry} />
          : data && <div className="space-y-5 p-5">
            <div className="rounded-xl border border-[#e9e3db] bg-[#faf8f5] p-4"><p className="text-[11px] font-medium text-[#8b7666]">Eligible refund for this booking</p><p className="mt-2 break-all text-2xl font-semibold tracking-tight text-[#49363e] tabular-nums">{money(data.amount)}</p><p className="mt-1 text-[11px] text-slate-500">{data.booking || "Across eligible captured payments"}</p></div>
            {!data.eligible ? <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600"><Clock3 size={16} className="mt-0.5 text-slate-400" aria-hidden="true" /><p>{data.reason || "Refund eligibility is determined by your booking policy."}</p></div> : (
              <form onSubmit={onSubmit} className="space-y-4">
                <label className="block text-xs font-medium text-slate-600">Requested refund (INR)<input className={control} name="amount" type="number" min="0.01" max={data.amount} step="0.01" defaultValue={data.amount} required disabled={busy} /></label>
                <label className="block text-xs font-medium text-slate-600">Reason for your request<textarea className={`${control} min-h-28 resize-y`} name="reason" minLength={3} maxLength={1000} placeholder="Tell us why you are requesting a refund" required disabled={busy} /></label>
                <p className="text-[11px] leading-relaxed text-slate-500">Requests are reviewed against your booking policy. Refund completion follows confirmation from the payment provider.</p>
                <button type="submit" className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#873f52] bg-[#873f52] px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#723247] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none ${refundFocus}`} disabled={busy}>{busy ? <LoaderCircle size={15} className="motion-safe:animate-spin" aria-hidden="true" /> : <RotateCcw size={15} aria-hidden="true" />}{busy ? "Submitting..." : "Request refund"}</button>
              </form>
            )}
            {submitError && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-800" role="alert">{submitError}</p>}
            <Link to="/customer/refunds" className={`inline-flex min-h-10 items-center gap-2 rounded-md text-xs font-semibold text-[#873f52] hover:underline ${refundFocus}`}>View refund requests and progress<ArrowUpRight size={14} aria-hidden="true" /></Link>
          </div>}
    </section>
  );
}

export default function RefundRequest({ bookingId }) {
  const [version, setVersion] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [key, setKey] = useState(() => crypto.randomUUID());
  const state = useCustomerData(`/bookings/${bookingId}/refund-eligibility`, version);
  const { notify } = useAuth();
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await save("/refund-requests", "POST", {
        bookingId,
        amount: Number(values.get("amount")),
        reason: values.get("reason"),
        idempotencyKey: key,
      });
      notify(result.message);
      setVersion((v) => v + 1);
      setKey(crypto.randomUUID());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <RefundRequestView {...state} busy={busy} submitError={error} onSubmit={submit} />;
}
export function RefundHistory() {
  const [page, setPage] = useState(1);
  const state = useCustomerData(`/refund-requests?page=${page}&pageSize=20`);
  return <RefundHistoryView {...state} page={page} onPage={setPage} />;
}

const refundAction = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${refundFocus}`;

function RefundStatus({ status }) {
  const value = status || "Unknown";
  const completed = value === "Completed";
  const approved = value === "Approved";
  const failed = ["Rejected", "Failed"].includes(value);
  const waiting = ["Requested", "Pending", "Processing", "UnderReview"].includes(value);
  const Icon = completed || approved ? Check : failed ? X : Clock3;
  const tone = completed ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : approved ? "border-sky-200 bg-sky-50 text-sky-800"
      : failed ? "border-rose-200 bg-rose-50 text-rose-800"
        : waiting ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-slate-200 bg-slate-100 text-slate-700";
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone}`}><Icon size={12} aria-hidden="true" />{["Requested", "UnderReview"].includes(value) ? "Under review" : value}</span>;
}

function RefundBooking({ row }) {
  return row.bookingId ? <Link to={`/customer/bookings/${row.bookingId}/checkout`} className={`inline-flex items-center gap-2 rounded-sm font-medium text-[#873f52] hover:underline ${refundFocus}`}><span className="break-all">{row.booking || "View booking"}</span><ArrowUpRight size={13} aria-hidden="true" /></Link> : <span>{row.booking || "—"}</span>;
}

function RefundReason({ row }) {
  return <div className="space-y-2 break-words text-xs leading-relaxed"><p className="whitespace-pre-line text-slate-600">{row.reason || "No reason provided"}</p>{row.decisionReason && <div className="rounded-lg border border-[#e8e4de] bg-[#faf8f5] px-3 py-2"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#927564]">Review decision</p><p className="whitespace-pre-line text-slate-600">{row.decisionReason}</p></div>}</div>;
}

function RefundAction({ row }) {
  return row.bookingId ? <Link to={`/customer/bookings/${row.bookingId}/checkout`} aria-label={`View payment details for booking ${row.booking || row.bookingId}`} title="View booking payment details" className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#e3ccd4] bg-white text-[#925369] transition-colors hover:border-[#873f52] hover:bg-[#873f52] hover:text-white motion-reduce:transition-none ${refundFocus}`}><Eye size={16} aria-hidden="true" /></Link> : null;
}

export function RefundHistoryView({ data, loading, error, retry, page = 1, onPage }) {
  const rows = data?.rows || [];
  const total = data?.total ?? rows.length;
  const size = data?.pageSize || 20;
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-6 text-sm text-slate-700 [&_svg]:shrink-0">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div><p className="text-[9px] font-medium tracking-[1.7px] text-[#97765f] sm:text-[10px]">YOUR CELEBRATION, BEAUTIFULLY PLANNED</p><h1 className="mt-2 font-serif text-[38px] font-normal leading-tight tracking-tight text-[#49363e] sm:text-[44px]">Refund requests<span className="text-[#b58c69]">.</span></h1><p className="mt-2 text-sm text-slate-500">Track review decisions and payment provider progress.</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/customer/payments" className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-medium text-[#873f52] hover:underline ${refundFocus}`}><ArrowLeft size={14} aria-hidden="true" />Payments</Link>
          <button type="button" onClick={retry} disabled={loading} className={`${refundAction} border-[#e3d5d8] bg-white text-[#873f52] hover:border-[#c6a6b0] hover:bg-[#faf3f5]`}><RotateCcw size={15} className={loading ? "motion-safe:animate-spin" : ""} aria-hidden="true" />{loading ? "Refreshing…" : "Refresh status"}</button>
        </div>
      </header>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e3e6e0] bg-white shadow-sm" aria-labelledby="refund-history-title" aria-busy={loading}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#f7f0f2] text-[#986778]"><ReceiptText size={20} strokeWidth={1.6} aria-hidden="true" /></span><h2 id="refund-history-title" className="text-base font-semibold tracking-tight text-[#37463d]">Request history</h2></div>
          {!loading && !error && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600">{total} {total === 1 ? "request" : "requests"}</span>}
        </div>

        {loading ? <div className="space-y-4 p-6" role="status"><span className="sr-only">Loading refund requests</span>{[0, 1, 2].map((key) => <div key={key} className="h-16 rounded-xl bg-slate-100 motion-safe:animate-pulse" />)}</div>
          : error ? <ErrorView error={error} retry={retry} />
            : !rows.length ? <div className="flex flex-col items-center px-5 py-14 text-center sm:py-16">
              <span className="mb-5 grid size-16 place-items-center rounded-2xl border border-[#eaded4] bg-[#faf5ee] text-[#a3836a]"><RotateCcw size={29} strokeWidth={1.4} aria-hidden="true" /></span>
              <h3 className="font-serif text-[27px] text-[#49363e]">{page > 1 ? "No requests on this page" : "No refund requests yet"}</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{page > 1 ? "Return to the first page to see your refund requests." : "Refund requests and their progress will appear here. You can request an eligible refund from a booking’s payment page."}</p>
              {page > 1 ? <button type="button" onClick={() => onPage(1)} className={`${refundAction} mt-6 border-[#e3d5d8] bg-white text-[#873f52] hover:bg-[#faf3f5]`}>Back to first page<ArrowRight size={15} aria-hidden="true" /></button>
                : <Link to="/customer/bookings" className={`${refundAction} mt-6 border-[#873f52] bg-[#873f52] text-white shadow-sm hover:bg-[#723247]`}>View my bookings<ArrowRight size={15} aria-hidden="true" /></Link>}
            </div> : <>
              <div className="hidden overflow-x-auto md:block" role="region" aria-label="Refund requests table" tabIndex={0}>
                <table className="w-full min-w-[900px] border-collapse text-left text-xs">
                  <caption className="sr-only">Refund requests with booking, amount, status, reason, review decision and request date</caption>
                  <thead className="border-b border-slate-100 bg-[#fafbf9] text-[10px] font-semibold uppercase tracking-wider text-slate-500"><tr>{["Booking", "Amount", "Status", "Reason / decision", "Requested", "Action"].map((label) => <th key={label} scope="col" className={`px-5 py-4 whitespace-nowrap ${label === "Amount" ? "text-right" : label === "Action" ? "text-center" : ""}`}>{label}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="transition-colors hover:bg-[#fcfaf8] motion-reduce:transition-none">
                    <td className="px-5 py-5"><RefundBooking row={row} /></td>
                    <td className="px-5 py-5 text-right text-sm font-semibold whitespace-nowrap text-[#2e4439] tabular-nums">{money(row.amount, false, row.currency || "INR")}</td>
                    <td className="px-5 py-5"><RefundStatus status={row.status} /></td>
                    <td className="min-w-[240px] max-w-[420px] px-5 py-5"><RefundReason row={row} /></td>
                    <td className="px-5 py-5 whitespace-nowrap text-slate-500">{date(row.createdAt)}</td>
                    <td className="px-5 py-5 text-center"><RefundAction row={row} /></td>
                  </tr>)}</tbody>
                </table>
              </div>
              <div className="divide-y divide-slate-100 md:hidden">{rows.map((row) => <article key={row.id} className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xl font-semibold text-[#2e4439] tabular-nums">{money(row.amount, false, row.currency || "INR")}</p><RefundStatus status={row.status} /></div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs"><RefundBooking row={row} /><span className="text-slate-500">Requested {date(row.createdAt)}</span></div>
                <RefundReason row={row} />
                <div className="flex justify-end border-t border-dashed border-slate-200 pt-3"><RefundAction row={row} /></div>
              </article>)}</div>
            </>}

        {!loading && !error && rows.length > 0 && <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-[#fdfdfb] px-5 py-4 text-xs text-slate-500 sm:px-6">
          <p role="status">Showing {(page - 1) * size + 1}–{Math.min((page - 1) * size + rows.length, total)} of {total} {total === 1 ? "request" : "requests"}</p>
          {pages > 1 && <nav aria-label="Refund request pages" className="flex items-center gap-3"><button type="button" className={`${refundAction} min-h-9 border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50`} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous refund page"><ChevronLeft size={15} aria-hidden="true" /></button><span>Page {page} of {pages}</span><button type="button" className={`${refundAction} min-h-9 border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50`} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next refund page"><ChevronRight size={15} aria-hidden="true" /></button></nav>}
        </footer>}
      </section>
    </div>
  );
}
