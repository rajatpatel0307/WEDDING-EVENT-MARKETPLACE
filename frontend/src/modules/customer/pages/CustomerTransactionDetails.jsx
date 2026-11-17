import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, Clock3,
  CreditCard, Download, FileText, History, LoaderCircle, LockKeyhole,
  ReceiptText, RotateCcw, ShieldCheck, Wallet, X,
} from "lucide-react";
import { ErrorView } from "../components/WorkspaceUI";
import { date, money } from "../services/workspace.api";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#873f52]";
const action = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none ${focus}`;
const card = "min-w-0 rounded-2xl border border-[#e3e6e0] bg-white shadow-sm";

function Status({ value }) {
  const status = String(value || "Unknown");
  const positive = ["success", "paid", "captured", "completed"].includes(status.toLowerCase());
  const failed = ["failed", "cancelled", "rejected"].includes(status.toLowerCase());
  const refunded = status.toLowerCase() === "refunded";
  const Icon = positive ? Check : failed ? X : refunded ? RotateCcw : Clock3;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${positive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : failed ? "border-rose-200 bg-rose-50 text-rose-800" : refunded ? "border-slate-200 bg-slate-100 text-slate-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}><Icon size={12} aria-hidden="true" />{status}</span>;
}

function Detail({ label, children, icon: Icon }) {
  return <div className="min-w-0"><dt className="mb-2 flex items-center gap-2 text-xs text-slate-500">{Icon && <Icon size={14} aria-hidden="true" />}{label}</dt><dd className="break-words text-sm font-medium text-[#35483d]">{children || "—"}</dd></div>;
}

export default function CustomerTransactionDetails({ data, loading, error, retry, downloading = false, receiptError, onDownload, children }) {
  const p = data?.payment;
  const currency = p?.currency || "INR";
  const transactions = data?.transactions || [];
  const refunds = data?.refunds || [];
  const canDownload = ["Success", "Refunded"].includes(p?.status);
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-6 text-sm text-slate-700 [&_svg]:shrink-0">
      <Link to="/customer/payments" className={`inline-flex min-h-9 items-center gap-2 rounded-md text-xs font-medium text-[#8c6573] hover:text-[#723247] ${focus}`}><ArrowLeft size={15} aria-hidden="true" />Back to payments</Link>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-[9px] font-medium tracking-[1.7px] text-[#97765f] sm:text-[10px]">YOUR CELEBRATION, BEAUTIFULLY PLANNED</p>
          <h1 className="mt-2 font-serif text-4xl font-normal leading-tight tracking-tight text-[#49363e] sm:text-[44px]">Transaction details<span className="text-[#b58c69]">.</span></h1>
          <p className="mt-2 text-sm text-slate-500">Your payment, from confirmation to receipt.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#dfe7dc] bg-[#f0f5ee] px-3 py-2 text-[11px] font-medium text-[#526c55]"><ShieldCheck size={15} aria-hidden="true" />Payment record</span>
      </header>

      {loading && !p ? <div className={`${card} space-y-5 p-6 sm:p-8`} role="status"><span className="sr-only">Loading transaction details</span><div className="h-10 w-40 rounded-lg bg-slate-100 motion-safe:animate-pulse" /><div className="h-28 rounded-xl bg-slate-100 motion-safe:animate-pulse" /><div className="h-40 rounded-xl bg-slate-100 motion-safe:animate-pulse" /></div>
        : error ? <div className={card}><ErrorView error={error} retry={retry} /></div>
          : !p ? <div className={`${card} p-8 text-center`}><ReceiptText size={32} className="mx-auto mb-4 text-[#a3836a]" aria-hidden="true" /><h2 className="text-lg font-semibold">Transaction unavailable</h2><p className="mt-2 text-slate-500">Return to your payment history to choose a transaction.</p></div>
            : <>
              <section className={`${card} overflow-hidden`} aria-label="Payment summary">
                <div className="flex flex-col justify-between gap-6 bg-gradient-to-r from-[#f4f7f1] via-[#fcfcf8] to-white p-5 sm:p-7 lg:flex-row lg:items-center">
                  <div className="flex items-start gap-4 sm:gap-5">
                    <span className="grid size-12 place-items-center rounded-2xl border border-[#dbe6d9] bg-white text-[#55735b] sm:size-16"><Wallet size={27} strokeWidth={1.5} aria-hidden="true" /></span>
                    <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#6d7d6b]">Transaction amount</p><p className="mt-1 break-all text-3xl font-semibold leading-tight tracking-tight text-[#2e4439] tabular-nums sm:text-[40px]">{money(p.amount, false, currency)}</p><div className="mt-3 flex flex-wrap items-center gap-3"><Status value={p.status} /><span className="text-xs text-slate-500">{p.paidAt ? `Paid on ${date(p.paidAt)}` : `Created on ${date(p.createdAt)}`}</span></div></div>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    {canDownload && <button type="button" className={`${action} w-full border-[#873f52] bg-[#873f52] text-white shadow-sm hover:bg-[#723247] disabled:cursor-wait disabled:opacity-60 sm:w-auto`} onClick={onDownload} disabled={downloading}>{downloading ? <LoaderCircle size={16} className="motion-safe:animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}{downloading ? "Downloading…" : "Download receipt"}</button>}
                    <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><LockKeyhole size={12} aria-hidden="true" />{canDownload ? "Receipt for your recorded payment" : "Receipt available after payment confirmation"}</p>
                  </div>
                </div>
                {receiptError && <p className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-xs text-rose-800 sm:px-7" role="alert">{receiptError}</p>}
              </section>

              <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
                <div className="min-w-0 space-y-6">
                  <section className={card} aria-labelledby="payment-info-title">
                    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6"><span className="grid size-9 place-items-center rounded-xl bg-[#f7f2ee] text-[#9b7a62]"><FileText size={18} aria-hidden="true" /></span><h2 id="payment-info-title" className="text-base font-semibold text-[#37463d]">Payment information</h2></div>
                    <dl className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2 sm:p-6">
                      <div className="min-w-0 sm:col-span-2"><dt className="mb-2 text-xs text-slate-500">Payment reference</dt><dd className="break-all rounded-lg border border-[#e9e4df] bg-[#faf8f5] px-3 py-2.5 font-mono text-xs text-[#735563]">{p.reference || "—"}</dd></div>
                      <Detail label="Booking" icon={ReceiptText}>{p.bookingId ? <Link to={`/customer/bookings/${p.bookingId}`} className={`inline-flex items-center gap-2 rounded-sm text-[#873f52] hover:underline ${focus}`}>{p.booking || "View booking"}<ArrowUpRight size={14} aria-hidden="true" /></Link> : p.booking}</Detail>
                      <Detail label="Payment date" icon={CalendarDays}>{p.paidAt ? date(p.paidAt) : "Not yet confirmed"}</Detail>
                      <Detail label="Payment method" icon={CreditCard}><span className={String(p.method).toLowerCase() === "upi" ? "uppercase" : "capitalize"}>{p.method || "—"}</span></Detail>
                      <Detail label="Payment gateway" icon={ShieldCheck}>{p.gateway}</Detail>
                    </dl>
                    {p.bookingId && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6"><p className="text-xs text-slate-500">View your booking’s payment status and remaining balance.</p><Link to={`/customer/bookings/${p.bookingId}/checkout`} className={`inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-semibold text-[#873f52] hover:underline ${focus}`}>Payment status and retry<ArrowRight size={15} aria-hidden="true" /></Link></div>}
                  </section>

                  <section className={card} aria-labelledby="transaction-history-title">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6"><div className="flex items-center gap-3"><History size={19} className="text-[#9b7a62]" aria-hidden="true" /><h2 id="transaction-history-title" className="text-base font-semibold text-[#37463d]">Transaction history</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">{transactions.length} {transactions.length === 1 ? "event" : "events"}</span></div>
                    {transactions.length ? <ol className="p-5 sm:p-6">{transactions.map((t, index) => <li key={t.id || index} className="relative flex gap-4 pb-6 last:pb-0">
                      {index < transactions.length - 1 && <span className="absolute top-9 bottom-0 left-[17px] w-px bg-[#e3e8df]" aria-hidden="true" />}
                      <span className="relative z-10 grid size-9 place-items-center rounded-full border border-[#e3e8df] bg-[#f6f8f3] text-[#678064]"><History size={15} aria-hidden="true" /></span>
                      <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3 pt-1"><div><p className="font-medium text-[#37463d]">{t.type || "Payment event"}</p><p className="mt-1 text-xs text-slate-500">{date(t.createdAt)}</p></div><div className="flex flex-wrap items-center gap-3"><span className="font-semibold text-[#35483d] tabular-nums">{money(t.amount, false, currency)}</span><Status value={t.status} /></div></div>
                    </li>)}</ol> : <p className="px-5 py-7 text-sm text-slate-500 sm:px-6">No transaction events recorded yet.</p>}
                  </section>

                  <section className={card} aria-labelledby="refund-history-title">
                    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6"><RotateCcw size={19} className="text-[#9b7a62]" aria-hidden="true" /><h2 id="refund-history-title" className="text-base font-semibold text-[#37463d]">Refund history</h2></div>
                    {refunds.length ? <ul className="divide-y divide-slate-100">{refunds.map((refund, index) => <li key={index} className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6"><div><p className="font-semibold text-[#35483d] tabular-nums">{money(refund.amount, false, currency)}</p>{refund.createdAt && <p className="mt-1 text-xs text-slate-500">{date(refund.createdAt)}</p>}</div><Status value={refund.status} /></li>)}</ul>
                      : <div className="flex items-start gap-3 px-5 py-6 sm:px-6"><span className="grid size-9 place-items-center rounded-xl bg-[#f7f4ef] text-[#a18c75]"><RotateCcw size={17} aria-hidden="true" /></span><div><p className="text-sm font-medium text-[#536353]">No refunds recorded</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Refunds for this payment will appear here when recorded.</p></div></div>}
                  </section>
                </div>
                <aside className="min-w-0 space-y-4" aria-label="Refund options">
                  {children}
                  <div className="flex items-start gap-3 rounded-xl border border-[#dfe7dc] bg-[#f0f5ee] p-4 text-xs leading-relaxed text-[#5a725e]"><ShieldCheck size={19} aria-hidden="true" /><p>Payment confirmation and vendor booking acceptance are separate. Your booking page shows the latest booking status.</p></div>
                </aside>
              </div>
            </>}
    </div>
  );
}
