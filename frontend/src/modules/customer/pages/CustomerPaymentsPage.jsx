import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight,
  CircleCheck, Clock3, CreditCard, LockKeyhole, ReceiptText,
  Eye, RotateCcw, Search, SlidersHorizontal, Wallet, X,
} from "lucide-react";
import { ErrorView, useCustomerData } from "../components/WorkspaceUI";
import { date, money } from "../services/workspace.api";

const pageSize = 12;
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#873f52]";
const button = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none ${focus}`;
const successful = (status) => ["success", "paid", "captured"].includes(String(status).toLowerCase());
const pending = (status) => ["pending", "processing", "created", "initiated"].includes(String(status).toLowerCase());
const statuses = ["Pending", "Processing", "Success", "Failed", "Refunded"];
const methods = [["upi", "UPI"], ["card", "Card"], ["wallet", "Wallet"], ["netbanking", "Net banking"], ["bank_transfer", "Bank transfer"], ["emi", "EMI"], ["cardless_emi", "Cardless EMI"], ["paylater", "Pay later"], ["cash", "Cash"], ["ach", "ACH"]];
const emptyFilters = { q: "", status: "", method: "", from: "", to: "" };

function PaymentFilters({ filters, onFilters }) {
  const [draft, setDraft] = useState(filters);
  const active = Object.values(filters).some(Boolean);
  const control = `min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 transition-colors hover:border-slate-300 ${focus}`;
  function change(event) {
    setDraft((current) => ({ ...current, [event.target.name]: event.target.value }));
  }
  return (
    <form role="search" aria-label="Search and filter payments" className="space-y-4 border-b border-slate-100 bg-[#fdfdfb] px-5 py-5 sm:px-6" onSubmit={(event) => { event.preventDefault(); onFilters({ ...draft, q: draft.q.trim() }); }}>
      <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_160px_170px_auto]">
        <label className="block min-w-0 text-[11px] font-medium text-slate-500 sm:col-span-2 xl:col-span-1">Search payments
          <span className="relative mt-2 block"><Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" /><input type="search" name="q" value={draft.q} onChange={change} maxLength={150} placeholder="Reference, booking or gateway…" className={`${control} pl-10`} /></span>
        </label>
        <label className="block text-[11px] font-medium text-slate-500">Status<select name="status" value={draft.status} onChange={change} className={`${control} mt-2`}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label className="block text-[11px] font-medium text-slate-500">Payment method<select name="method" value={draft.method} onChange={change} className={`${control} mt-2`}><option value="">All methods</option>{methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="submit" className={`${button} border-[#873f52] bg-[#873f52] text-white hover:bg-[#723247] sm:col-span-2 xl:col-span-1`}><Search size={15} aria-hidden="true" />Search</button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium text-slate-500" title="Uses the created date for payments awaiting confirmation"><SlidersHorizontal size={14} aria-hidden="true" />Transaction date</span>
        <label className="block min-w-0 flex-1 text-[11px] font-medium text-slate-500 sm:max-w-44">From<input type="date" name="from" value={draft.from} max={draft.to || undefined} onChange={change} className={`${control} mt-2`} /></label>
        <label className="block min-w-0 flex-1 text-[11px] font-medium text-slate-500 sm:max-w-44">To<input type="date" name="to" value={draft.to} min={draft.from || undefined} onChange={change} className={`${control} mt-2`} /></label>
        <button type="button" onClick={() => { setDraft(emptyFilters); onFilters(emptyFilters); }} disabled={!active && !Object.values(draft).some(Boolean)} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[#873f52] hover:bg-[#faf3f5] disabled:cursor-not-allowed disabled:opacity-40 ${focus}`}><X size={14} aria-hidden="true" />Clear filters</button>
        {active && <span className="mb-3 text-[11px] text-[#873f52]">Filters applied</span>}
      </div>
    </form>
  );
}

function PaymentAction({ row }) {
  return row.id ? <Link to={`/customer/payments/${row.id}`} aria-label={`View payment ${row.reference || row.id}`} title="View payment details" className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#e3ccd4] bg-white text-[#925369] transition-colors hover:border-[#873f52] hover:bg-[#873f52] hover:text-white motion-reduce:transition-none ${focus}`}><Eye size={16} aria-hidden="true" /></Link> : null;
}

function PaymentStatus({ status }) {
  const value = String(status || "Unknown");
  const failed = ["failed", "cancelled"].includes(value.toLowerCase());
  const refunded = value.toLowerCase() === "refunded";
  const Icon = successful(value) ? Check : failed ? X : refunded ? RotateCcw : Clock3;
  const tone = successful(value)
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : failed ? "border-rose-200 bg-rose-50 text-rose-800"
      : refunded ? "border-slate-200 bg-slate-100 text-slate-700"
        : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone}`}>
      <Icon size={12} aria-hidden="true" />{value}
    </span>
  );
}

function PaymentReference({ row }) {
  const label = row.reference || "View payment";
  return row.id ? (
    <Link to={`/customer/payments/${row.id}`} className={`inline-flex max-w-full items-center gap-2 rounded-sm font-medium text-[#873f52] hover:underline ${focus}`}>
      <span className="break-all">{label}</span><ArrowUpRight size={14} aria-hidden="true" />
    </Link>
  ) : <span className="break-all font-medium text-slate-700">{label}</span>;
}

function SummaryCard({ label, value, caption, icon: Icon, tone, loading }) {
  return (
    <article className="flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-[#e5e5df] bg-white p-5 shadow-sm sm:p-6">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {loading ? <div className="mt-3 h-8 w-24 rounded bg-slate-100 motion-safe:animate-pulse" /> :
          <p className="mt-2 break-words text-2xl font-semibold leading-snug tracking-tight text-[#2e4439] tabular-nums sm:text-[28px]">{value}</p>}
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{caption}</p>
      </div>
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={21} strokeWidth={1.6} aria-hidden="true" /></span>
    </article>
  );
}

export function CustomerPaymentsView({ data, loading, error, retry, page = 1, onPage, filters = emptyFilters, onFilters = () => {} }) {
  const rows = data?.rows || [];
  const size = data?.pageSize || pageSize;
  const total = data?.total ?? rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const paid = rows.filter((row) => successful(row.status));
  const filtered = Object.values(filters).some(Boolean);
  // Keep different currencies separate and scope all summaries to this page.
  const amounts = paid.reduce((totals, row) => {
    const currency = row.currency || "INR";
    totals.set(currency, (totals.get(currency) || 0) + Number(row.amount || 0));
    return totals;
  }, new Map());
  const paidAmount = amounts.size
    ? [...amounts].map(([currency, amount]) => money(amount, false, currency)).join(" · ")
    : "—";

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-7 text-sm text-slate-700 [&_svg]:shrink-0">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="flex items-center gap-2 text-[9px] font-medium tracking-[1.7px] text-[#97765f] sm:text-[10px]">
            <span className="size-1.5 rounded-full bg-[#b48b62]" />YOUR CELEBRATION, BEAUTIFULLY PLANNED
          </p>
          <h1 className="mt-2 font-serif text-[38px] font-normal leading-tight tracking-tight text-[#49363e] sm:text-[44px]">Payments<span className="text-[#b58c69]">.</span></h1>
          <p className="mt-2 text-sm text-slate-500">Every payment, clearly accounted for.</p>
        </div>
        <Link to="/customer/bookings" className={`${button} border-[#873f52] bg-[#873f52] text-white shadow-sm hover:bg-[#723247]`}>
          My bookings<ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </header>

      {!error && <section aria-label="Payment overview for this page" aria-busy={loading}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[10px] font-semibold tracking-[1.6px] text-[#97765f]">AT A GLANCE</h2>
          <p className="text-[11px] text-slate-500">For the payments shown on this page</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:gap-4">
          <SummaryCard label="Paid successfully" value={paidAmount} caption="Successful transactions on this page" icon={Wallet} tone="bg-[#edf4ee] text-[#476b55]" loading={loading} />
          <SummaryCard label="Successful payments" value={paid.length} caption="Confirmed by your payment provider" icon={CircleCheck} tone="bg-[#f4edf0] text-[#966075]" loading={loading} />
          <SummaryCard label="Awaiting confirmation" value={rows.filter((row) => pending(row.status)).length} caption="Pending or processing transactions" icon={Clock3} tone="bg-[#fbf3e5] text-[#a4803e]" loading={loading} />
        </div>
      </section>}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e3e6e0] bg-white shadow-sm" aria-labelledby="payment-history-title" aria-busy={loading}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#f7f2ee] text-[#9b7a62]"><ReceiptText size={20} strokeWidth={1.6} aria-hidden="true" /></span>
            <h2 id="payment-history-title" className="text-base font-semibold tracking-tight text-[#37463d]">Payment history</h2>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/customer/refunds" className={`inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-semibold text-[#365440] hover:underline ${focus}`}><RotateCcw size={14} aria-hidden="true" />Refund requests<ArrowRight size={14} aria-hidden="true" /></Link>
            {!loading && !error && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600">{total} {total === 1 ? "transaction" : "transactions"}</span>}
          </div>
        </div>

        <PaymentFilters key={JSON.stringify(filters)} filters={filters} onFilters={onFilters} />

        {loading ? <div className="space-y-4 p-6" role="status"><span className="sr-only">Loading payment history</span>{[0, 1, 2].map((key) => <div key={key} className="h-14 rounded-xl bg-slate-100 motion-safe:animate-pulse" />)}</div>
          : error ? <ErrorView error={error} retry={retry} />
            : !rows.length ? <div className="flex flex-col items-center px-5 py-14 text-center">
              <span className="mb-5 grid size-16 place-items-center rounded-2xl bg-[#f7f2ee] text-[#a3836a]"><ReceiptText size={30} strokeWidth={1.3} aria-hidden="true" /></span>
              <h3 className="font-serif text-2xl text-[#49363e]">{page > 1 ? "No payments on this page" : filtered ? "No matching payments" : "Your payment history starts here"}</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{page > 1 ? "Return to the first page to see your transactions." : filtered ? "Try a different reference, booking, status, method or date range." : "Once you pay for an accepted booking, your transaction details will appear here."}</p>
              {page > 1 ? <button type="button" className={`${button} mt-6 border-[#e3d5d8] text-[#873f52] hover:bg-[#faf3f5]`} onClick={() => onPage(1)}>Back to first page<ArrowRight size={15} aria-hidden="true" /></button>
                : filtered ? <button type="button" className={`${button} mt-6 border-[#e3d5d8] text-[#873f52] hover:bg-[#faf3f5]`} onClick={() => onFilters(emptyFilters)}>Clear filters<RotateCcw size={15} aria-hidden="true" /></button>
                : <Link to="/customer/bookings" className={`${button} mt-6 border-[#e3d5d8] text-[#873f52] hover:bg-[#faf3f5]`}>Go to my bookings<ArrowRight size={15} aria-hidden="true" /></Link>}
            </div> : <>
              <div className="hidden overflow-x-auto md:block" role="region" aria-label="Payment transactions" tabIndex={0}>
                <table className="w-full min-w-[960px] border-collapse text-left text-xs">
                  <caption className="sr-only">Payment references, bookings, amounts, methods, gateways, statuses and payment dates</caption>
                  <thead className="border-b border-slate-100 bg-[#fafbf9] text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>{["Reference", "Booking", "Amount", "Method", "Gateway", "Status", "Payment date", "Action"].map((label) => <th key={label} scope="col" className={`px-5 py-4 whitespace-nowrap ${label === "Amount" ? "text-right" : label === "Action" ? "text-center" : ""}`}>{label}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => <tr key={row.id} className="transition-colors hover:bg-[#fcfaf8] motion-reduce:transition-none">
                      <td className="max-w-[280px] px-5 py-5"><PaymentReference row={row} /></td>
                      <td className="px-5 py-5 font-medium whitespace-nowrap text-slate-600">{row.booking || "—"}</td>
                      <td className="px-5 py-5 text-right text-sm font-semibold whitespace-nowrap text-[#2e4439] tabular-nums">{money(row.amount, false, row.currency || "INR")}</td>
                      <td className="px-5 py-5"><span className="inline-flex items-center gap-2 whitespace-nowrap"><CreditCard size={14} className="text-slate-400" aria-hidden="true" /><span className={String(row.method).toLowerCase() === "upi" ? "uppercase" : "capitalize"}>{row.method || "—"}</span></span></td>
                      <td className="px-5 py-5 whitespace-nowrap text-slate-500">{row.gateway || "—"}</td>
                      <td className="px-5 py-5"><PaymentStatus status={row.status} /></td>
                      <td className="px-5 py-5 whitespace-nowrap text-slate-500">{row.paidAt ? date(row.paidAt) : "—"}</td>
                      <td className="px-5 py-5 text-center"><PaymentAction row={row} /></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {rows.map((row) => <article key={row.id} className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xl font-semibold text-[#2e4439] tabular-nums">{money(row.amount, false, row.currency || "INR")}</p><PaymentStatus status={row.status} /></div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div><dt className="text-slate-500">Booking</dt><dd className="mt-1 break-all font-medium">{row.booking || "—"}</dd></div>
                    <div><dt className="text-slate-500">Payment date</dt><dd className="mt-1">{row.paidAt ? date(row.paidAt) : "—"}</dd></div>
                    <div><dt className="text-slate-500">Method</dt><dd className={`mt-1 ${String(row.method).toLowerCase() === "upi" ? "uppercase" : "capitalize"}`}>{row.method || "—"}</dd></div>
                    <div><dt className="text-slate-500">Gateway</dt><dd className="mt-1">{row.gateway || "—"}</dd></div>
                  </dl>
                  <div className="flex items-center justify-between gap-3 border-t border-dashed border-slate-200 pt-3 text-xs"><PaymentReference row={row} /><PaymentAction row={row} /></div>
                </article>)}
              </div>
            </>}

        {!loading && !error && rows.length > 0 && <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-[#fdfdfb] px-5 py-4 text-xs text-slate-500 sm:px-6">
          <p role="status">Showing {(page - 1) * size + 1}–{Math.min((page - 1) * size + rows.length, total)} of {total} {total === 1 ? "payment" : "payments"}</p>
          {pages > 1 && <nav className="flex items-center gap-3" aria-label="Payment history pages">
            <button type="button" className={`${button} min-h-9 border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`} aria-label="Previous payment page" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={15} aria-hidden="true" /></button>
            <span>Page {page} of {pages}</span>
            <button type="button" className={`${button} min-h-9 border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`} aria-label="Next payment page" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight size={15} aria-hidden="true" /></button>
          </nav>}
        </footer>}
      </section>
      <p className="flex items-center justify-center gap-2 pb-2 text-center text-[11px] leading-relaxed text-slate-500"><LockKeyhole size={13} aria-hidden="true" />Open a payment reference to view its full details.</p>
    </div>
  );
}

export default function CustomerPaymentsPage() {
  const [params, setParams] = useSearchParams();
  const requestedPage = Number(params.get("page") || 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage <= 10000 ? requestedPage : 1;
  const filters = {
    q: (params.get("q") || "").slice(0, 150),
    status: statuses.includes(params.get("status")) ? params.get("status") : "",
    method: methods.some(([value]) => value === params.get("method")) ? params.get("method") : "",
    from: params.get("from") || "",
    to: params.get("to") || "",
  };
  const response = useCustomerData(`/records/payments?${new URLSearchParams({ page, pageSize, ...filters })}`);
  function changeFilters(values) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const key of Object.keys(emptyFilters)) {
        if (values[key]) next.set(key, values[key]); else next.delete(key);
      }
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
  return <CustomerPaymentsView {...response} page={page} onPage={changePage} filters={filters} onFilters={changeFilters} />;
}
