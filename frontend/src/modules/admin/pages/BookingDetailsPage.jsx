import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  UserRound,
  Store,
  Mail,
  Phone,
  ShieldAlert,
  Wallet,
  CalendarDays,
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Package,
  FileText,
  History,
  ScrollText,
  IndianRupee,
} from "lucide-react";
import {
  adminRequest,
  useAdminData,
  money,
  date,
  number,
} from "../services-management.api";
import {
  Loading,
  ErrorState,
  Field,
} from "../components/BookingUI";
import AdminDialog from "../components/AdminDialog";
import { useAuth } from "../../../context/AuthContext";
import BookingChanges from "../../bookings/BookingChanges";
import BookingItemDetails from "../../bookings/BookingItemDetails";


const button = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#dce6df] bg-white px-3 py-2 text-[11px] font-medium text-[#557160] transition-colors hover:border-[#afccba] hover:bg-[#f0f6f2] disabled:cursor-not-allowed disabled:opacity-40";
const primaryButton = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#176b60] bg-[#176b60] px-3 py-2 text-[11px] font-medium text-white transition-colors hover:bg-[#12574e] disabled:cursor-not-allowed disabled:opacity-40";
const dangerButton = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40";
const tableClass = "w-full border-collapse text-left text-xs [&_th]:border-b [&_th]:border-[#e5ece7] [&_th]:bg-[#f5f8f6] [&_th]:px-3 [&_th]:py-3 [&_th]:text-[10px] [&_th]:font-medium [&_th]:tracking-wide [&_th]:whitespace-nowrap [&_th]:text-[#7b9081] [&_th]:uppercase [&_td]:border-b [&_td]:border-[#edf2ee] [&_td]:px-3 [&_td]:py-3.5 [&_td]:align-top [&_tbody_tr:last-child_td]:border-0 [&_tbody_tr:hover]:bg-[#fafcfb]";
const pageClass = "grid w-full min-w-0 gap-5 text-[#2b4638] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-3 [&_:focus-visible]:outline-[#176b60] [&_select]:rounded-lg [&_select]:border [&_select]:border-[#dce6df] [&_select]:bg-white [&_select]:px-3 [&_select]:py-2 [&_select]:text-xs";
const tabIcons = { Overview: LayoutDashboard, Items: Package, Payment: Wallet, Payout: IndianRupee, Policy: ShieldAlert, "Status History": History, "Audit Logs": ScrollText, Quotation: FileText };

function BookingStatus({ value }) {
  const tone = ["Confirmed", "Paid", "Completed", "Success"].includes(value)
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10"
    : ["Pending", "Accepted", "PaymentPending", "PartiallyPaid", "RefundPending", "Processing"].includes(value)
      ? "bg-amber-50 text-amber-800 ring-amber-600/10"
      : ["Cancelled", "Rejected", "Failed", "Disputed"].includes(value)
        ? "bg-rose-50 text-rose-700 ring-rose-600/10"
        : value === "InProgress" ? "bg-blue-50 text-blue-700 ring-blue-600/10"
          : ["Refunded", "PartiallyRefunded"].includes(value) ? "bg-violet-50 text-violet-700 ring-violet-600/10"
            : "bg-slate-50 text-slate-600 ring-slate-500/10";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-normal font-medium whitespace-nowrap ring-1 ring-inset ${tone}`}>
    <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
    {value === "Accepted" ? "Vendor accepted" : String(value || "Not recorded").replace(/([a-z])([A-Z])/g, "$1 $2")}
  </span>;
}

function Definition({ values }) {
  return <dl className="grid min-w-0 gap-x-6 sm:grid-cols-2">
    {Object.entries(values).map(([label, value]) => <div key={label} className="min-w-0 border-b border-[#edf2ee] py-3">
      <dt className="mb-1 text-[10px] text-[#819486]">{label}</dt>
      <dd className={`text-xs leading-relaxed text-[#3d5948] whitespace-pre-wrap [overflow-wrap:anywhere] ${label === "ID" ? "font-mono text-[10px]" : ""}`}>{value === null || value === undefined || value === "" ? "Not provided" : typeof value === "boolean" ? value ? "Yes" : "No" : String(value)}</dd>
    </div>)}
  </dl>;
}

function ChangeRequests({ id, revision, saved }) {
  const state = useAdminData(`/bookings/${id}/change-requests`, revision);
  if (state.loading) return <div role="status" className="rounded-xl border border-[#e0e9e3] bg-white px-4 py-3 text-xs text-[#819486]">Loading change requests…</div>;
  if (state.error)
    return <ErrorState error={state.error} retry={state.retry} />;
  const requests = Array.isArray(state.data) ? state.data : [];
  const pending = requests.filter((request) => request.status === "Pending").length;
  if (!requests.length) return (
    <div className="flex items-center gap-2 rounded-xl border border-[#e0e9e3] bg-white px-4 py-3 text-[11px] text-[#7c9182]">
      <CheckCircle2 size={15} className="text-[#7fa48c]" aria-hidden="true" />No booking change requests
    </div>
  );
  return (
    <details key={pending > 0 ? "pending" : "history"} open={pending > 0} className="group overflow-hidden rounded-xl border border-[#e0e9e3] bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-medium [&::-webkit-details-marker]:hidden">
        <ClipboardList size={15} className="text-[#6e927b]" aria-hidden="true" />Booking change requests
        <span className={`rounded-full px-2 py-0.5 text-[10px] ${pending ? "bg-amber-50 text-amber-800" : "bg-[#edf4ef] text-[#66816e]"}`}>{pending ? `${pending} pending` : `${requests.length} recorded`}</span>
        <ChevronDown size={14} className="ml-auto text-[#8ca193] transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-[#edf2ee] [&>section]:m-0 [&>section]:rounded-none [&>section]:border-0 [&>section]:p-4 [&_h2]:hidden [&_article]:border-[#e3ebe5] [&_label]:text-xs [&_button]:text-xs [&_p]:text-xs!">
        <BookingChanges id={id} role="Admin" data={{ requests }} request={adminRequest} saved={saved} />
      </div>
    </details>
  );
}

function PriceSummary({ f }) {
  return (
    <section aria-labelledby="price-summary-heading" className="overflow-hidden rounded-2xl border border-[#dfe8e1] bg-white shadow-sm shadow-[#254c3810]">
      <div className="flex items-center gap-2 border-b border-[#e8eeea] px-5 py-4"><Wallet size={16} className="text-[#71937e]" aria-hidden="true" /><h3 id="price-summary-heading" className="text-sm font-semibold">Price summary</h3></div>
      <div className="mx-4 mt-4 rounded-xl bg-[#edf5ef] px-4 py-3.5">
        <span className="text-[10px] font-medium tracking-wide text-[#6f8e79] uppercase">Total booking amount</span>
        <strong className="mt-1 block text-[26px] leading-tight font-semibold tracking-tight text-[#176b60] tabular-nums [overflow-wrap:anywhere]">{money(f.total)}</strong>
      </div>
      <dl className="px-5 py-3">
      {[
        ["Subtotal", f.subtotal],
        ["Discount", f.discount],
        ["Tax", f.tax],
        ["Platform fees", f.platformFees],
        ["Separately recorded travel charges", f.travelCharges],
        ["Paid amount", f.paid],
        ["Remaining amount", f.remaining],
        ["Refunded amount", f.refunded],
        ["Refund pending", f.refundPending],
        ["Platform commission", f.commission],
        ["Vendor payable", f.vendorPayable],
      ].map(([label, value]) => (
        <div key={label} className={`flex items-start justify-between gap-3 py-2.5 text-[11px] ${label === "Paid amount" || label === "Refunded amount" || label === "Platform commission" ? "mt-1 border-t border-[#e8eeea] pt-3.5" : ""}`}>
          <dt className="max-w-[65%] leading-relaxed text-[#7c9183]">{label}</dt>
          <dd className={`min-w-0 text-right font-semibold tabular-nums [overflow-wrap:anywhere] ${label === "Paid amount" ? "text-[#176b60]" : label === "Remaining amount" && Number(value) > 0 ? "text-amber-700" : "text-[#395746]"}`}>{money(value)}</dd>
        </div>
      ))}
      </dl>
      <div className="space-y-3 border-t border-[#e8eeea] bg-[#fafcfb] px-5 py-4">
      <p className="text-[10px]! leading-relaxed text-[#86998b]!">
        Amounts come from the booking and payment ledgers. Item prices may
        already include travel charges.
      </p>
      {!f.commissionRecorded && (
        <p className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-[10px]! leading-relaxed text-amber-800!">
          Commission has not been recorded. A new payout will remain on hold
          until financial terms are established.
        </p>
      )}
      {Math.abs(f.paid - f.recordedPaid) > 0.005 && (
        <p role="alert" className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-[10px]! leading-relaxed text-rose-700!">
          Recorded booking payments differ from captured payments.
          Reconciliation is required.
        </p>
      )}
      </div>
    </section>
  );
}
function ActionDialog({ action, data, close, saved }) {
  const [reason, setReason] = useState(""),
    [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [key] = useState(() => crypto.randomUUID()),
    [policy, setPolicy] = useState({
      refundPercent: "",
      cancellationFeePercent: "",
      minimumNoticeHours: "",
    });
  const review = action === "policy",
    refund = action === "refund",
    cancel = action === "cancel";
  const label = review
    ? "Review cancellation policy"
    : refund
      ? "Initiate Refund"
      : cancel
        ? "Cancel Booking"
        : {
            Confirmed: "Confirm Booking",
            InProgress: "Start Event",
            Completed: "Complete Booking",
            Disputed: "Mark Disputed",
          }[action];
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        expectedUpdatedAt: new Date(data.booking.UpdatedAt).toISOString(),
        reason,
        notes,
        ...(review
          ? {
              policy: Object.fromEntries(
                Object.entries(policy).map(([k, v]) => [k, Number(v)]),
              ),
            }
          : refund
            ? { idempotencyKey: key }
            : cancel
              ? {}
              : { status: action }),
      };
      const result = await adminRequest(
        `/bookings/${data.booking.BookingId}/${review ? "policy-review" : refund ? "refund" : cancel ? "cancel" : "status"}`,
        { method: "POST", body: JSON.stringify(body) },
      );
      saved(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const f = data.financial;
  return (
    <AdminDialog title={label} close={close} busy={busy}>
      <form className="grid gap-4 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-xs [&_label]:text-[#60766a] [&_input]:w-full [&_textarea]:min-h-24 [&_textarea]:w-full [&_p]:text-xs! [&_p]:leading-relaxed" onSubmit={submit}>
        <p>
          <strong>{data.booking.BookingNumber}</strong> · {data.customer.name} ·{" "}
          {data.vendor.name}
        </p>
        {(refund || cancel) && (
          <>
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 [&_p]:text-amber-800!">
              This action may trigger refund and vendor payout changes.
            </p>
            <Definition
              values={{
                "Booking amount": money(f.total),
                "Paid amount": money(f.paid),
                "Refund eligible amount": money(f.refundEligible),
                "Cancellation charges": money(f.cancellationCharges),
                ...(refund ? { "Refund amount": money(f.refundEligible) } : {}),
              }}
            />
          </>
        )}
        {refund && !f.canRefund && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs leading-relaxed text-rose-700">
            {f.refundBlockedReason}
          </p>
        )}
        {refund && (
          <p className="my-3 text-xs! leading-relaxed text-[#75897b]!">
            The server calculates the refundable balance. The original payment
            remains in the ledger. Completion requires payment-provider
            confirmation.
          </p>
        )}
        {review && (
          <>
            <p className="my-3 text-xs! leading-relaxed text-[#75897b]!">
              Record the applicable cancellation terms after reviewing the
              original agreement. Existing commission records remain unchanged.
            </p>
            {data.policies.map((p, i) => (
              <blockquote key={i} className="my-4 rounded-xl border border-[#e2eae4] border-l-[3px] border-l-[#80a88f] bg-[#fafcfb] p-4 text-xs leading-relaxed [&_strong]:mb-2 [&_strong]:block [&_p]:mt-1 [&_p]:text-xs!">
                <strong>{p.service}</strong>
                <p>{p.cancellation}</p>
                <p>{p.refund}</p>
              </blockquote>
            ))}
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["refundPercent", "Refundable payment %", 100],
                [
                  "cancellationFeePercent",
                  "Cancellation charge % of booking total",
                  100,
                ],
                ["minimumNoticeHours", "Minimum notice (hours)", 8760],
              ].map(([k, label, max]) => (
                <Field
                  key={k}
                  label={label}
                  required
                  type="number"
                  min={0}
                  max={max}
                  step={k === "minimumNoticeHours" ? 1 : 0.01}
                  value={policy[k]}
                  onChange={(e) =>
                    setPolicy((v) => ({ ...v, [k]: e.target.value }))
                  }
                />
              ))}
            </div>
          </>
        )}
        {cancel && (
          <>
            <h3>Cancellation policy</h3>
            {(f.policyTerms.length ? f.policyTerms : data.policies).map(
              (p, i) => (
                <blockquote className="my-4 rounded-xl border border-[#e2eae4] border-l-[3px] border-l-[#80a88f] bg-[#fafcfb] p-4 text-xs leading-relaxed [&_strong]:mb-2 [&_strong]:block [&_p]:mt-1 [&_p]:text-xs!" key={i}>
                  <strong>{p.service}</strong>
                  <p>{p.cancellation}</p>
                  <p>{p.refund}</p>
                </blockquote>
              ),
            )}
            {!f.policy && (
              <p className="my-3 text-xs! leading-relaxed text-[#75897b]!">
                Refund eligibility requires an audited policy review.
                Cancellation does not initiate a refund.
              </p>
            )}
          </>
        )}
        <Field
          label={
            review
              ? "Policy review reason"
              : cancel
                ? "Cancellation Reason"
                : "Reason"
          }
        >
          <textarea
            required
            minLength={review ? 10 : 3}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy}
          />
        </Field>
        <Field label="Admin Notes (optional)">
          <textarea
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={busy}
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs leading-relaxed text-rose-700">
            {error}
          </p>
        )}
        <footer className="flex justify-end gap-2">
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={close}
          >
            Close
          </button>
          <button
            className={cancel ? `${dangerButton} border-rose-700! bg-rose-700! text-white! hover:bg-rose-800!` : primaryButton}
            disabled={busy || (refund && !f.canRefund)}
          >
            {busy ? "Saving…" : label}
          </button>
        </footer>
      </form>
    </AdminDialog>
  );
}
function Payments({ id, revision }) {
  const [retry, setRetry] = useState(0),
    state = useAdminData(`/bookings/${id}/payment`, `${revision}:${retry}`);
  if (state.loading) return <Loading />;
  if (state.error)
    return (
      <ErrorState error={state.error} retry={() => setRetry((v) => v + 1)} />
    );
  const d = state.data;
  return (
    <>
      <div className="min-w-0 overflow-x-auto rounded-xl border border-[#e6ece7]">
        <table className={tableClass}>
          <thead>
            <tr>
              {[
                "Payment",
                "Method",
                "Provider",
                "Amount",
                "Status",
                "Date",
              ].map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.payments.map((p) => (
              <tr key={p.PaymentId}>
                <td>{p.PaymentReference}</td>
                <td>{p.PaymentMethod}</td>
                <td>{p.GatewayName}</td>
                <td>
                  {p.Currency === "INR"
                    ? money(p.Amount)
                    : `${p.Currency} ${Number(p.Amount).toFixed(2)}`}
                </td>
                <td>
                  <BookingStatus value={p.PaymentStatus} />
                </td>
                <td>{date(p.PaidAt || p.CreatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!d.payments.length && <p>No payment transactions recorded.</p>}
      <h3>Refunds</h3>
      {!d.refunds.length && <p className="rounded-lg bg-[#f7faf8] px-4 py-3 text-xs! text-[#819486]!">No refunds recorded for this booking.</p>}
      <div className="my-4 grid gap-3 [&_article]:grid [&_article]:gap-2 [&_article]:rounded-xl [&_article]:border [&_article]:border-[#e3ebe5] [&_article]:p-4 [&_article]:text-xs [&_small]:text-[#829589]">
        {d.refunds.map((r) => (
          <article key={r.RefundId}>
            <strong>
              {r.RefundReference} · {money(r.RefundAmount)}
            </strong>
            <BookingStatus value={r.RefundStatus} />
            <p>{r.Reason}</p>
            <small>
              {r.GatewayRefundId || "Awaiting provider confirmation"} ·{" "}
              {date(r.CreatedAt)}
            </small>
            {r.LastError && <p role="alert">{r.LastError}</p>}
          </article>
        ))}
      </div>
      <h3>Transaction Ledger</h3>
      {!d.transactions.length && <p className="rounded-lg bg-[#f7faf8] px-4 py-3 text-xs! text-[#819486]!">No ledger transactions recorded.</p>}
      <div className="my-4 grid gap-3 [&_article]:grid [&_article]:gap-2 [&_article]:rounded-xl [&_article]:border [&_article]:border-[#e3ebe5] [&_article]:p-4 [&_article]:text-xs [&_small]:text-[#829589]">
        {d.transactions.map((t) => (
          <article key={t.id}>
            <strong>
              {t.TransactionType} · {money(t.Amount)}
            </strong>
            <p>{t.TransactionStatus}</p>
            <small>{date(t.CreatedAt)}</small>
          </article>
        ))}
      </div>
    </>
  );
}
function Payout({ id, revision }) {
  const [retry, setRetry] = useState(0),
    state = useAdminData(`/bookings/${id}/payout`, `${revision}:${retry}`);
  if (state.loading) return <Loading />;
  if (state.error)
    return (
      <ErrorState error={state.error} retry={() => setRetry((v) => v + 1)} />
    );
  return (
    <>
      <p className="my-3 text-xs! leading-relaxed text-[#75897b]!">
        Payouts are calculated after completion. Refunds, unresolved commission
        terms and unpaid balances place payouts on hold. This screen does not
        transfer funds.
      </p>
      {state.data.rows.map((p) => (
        <article className="my-4 rounded-xl border border-[#e2eae4] border-l-[3px] border-l-[#80a88f] bg-[#fafcfb] p-4 text-xs leading-relaxed [&_strong]:mb-2 [&_strong]:block [&_p]:mt-1 [&_p]:text-xs!" key={p.PayoutId}>
          <BookingStatus value={p.PayoutStatus} />
          <Definition
            values={{
              "Gross amount": money(p.GrossAmount),
              "Platform commission": money(p.PlatformCommission),
              "Refund deduction": money(p.RefundDeduction),
              "Applicable fees": money(p.ApplicableFees),
              "Tax deduction": money(p.TaxDeduction),
              "Net vendor amount": money(p.NetAmount),
              "Paid at": p.PaidAt ? date(p.PaidAt) : "Not paid",
            }}
          />
        </article>
      ))}
      {!state.data.rows.length && (
        <p>No payout has been generated for this booking.</p>
      )}
    </>
  );
}
const time = (value) =>
  !value
    ? "Not recorded"
    : /^\d{2}:/.test(String(value))
      ? String(value).slice(0, 5)
      : new Date(value).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        });
export default function BookingDetailsPage() {
  const { bookingId } = useParams(),
    [params, setParams] = useSearchParams(),
    [revision, setRevision] = useState(0),
    [dialog, setDialog] = useState(() =>
      ["cancel", "refund"].includes(params.get("action"))
        ? params.get("action")
        : null,
    ),
    { notify } = useAuth();
  const state = useAdminData(`/bookings/${bookingId}`, revision),
    tabs = [
      "Overview",
      "Items",
      "Payment",
      "Payout",
      "Policy",
      "Status History",
      "Audit Logs",
      "Quotation",
    ],
    tab = tabs.includes(params.get("tab")) ? params.get("tab") : "Overview";
  const awaitingRefund = Number(state.data?.financial?.refundPending || 0) > 0;
  useEffect(() => {
    if (!awaitingRefund) return;
    const timer = setInterval(() => setRevision((v) => v + 1), 30000);
    return () => clearInterval(timer);
  }, [awaitingRefund]);
  useEffect(() => {
    const refresh = () => setRevision((v) => v + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  const changeTab = (t) => setParams({ tab: t });
  const saved = (message) => {
    setDialog(null);
    notify(message);
    setRevision((v) => v + 1);
  };
  if (state.loading)
    return (
      <div className="min-w-0 rounded-2xl border border-[#dfe8e1] bg-white p-4 shadow-sm shadow-[#254c3810] sm:p-5 [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-sm [&_h3]:font-semibold">
        <Loading />
      </div>
    );
  if (state.error)
    return (
      <ErrorState error={state.error} retry={() => setRevision((v) => v + 1)} />
    );
  const d = state.data,
    b = d.booking,
    f = d.financial;
  return (
    <div className={pageClass}>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#91a095]">
        <Link className="inline-flex items-center gap-2 font-medium text-[#678372] transition-colors hover:text-[#176b60]" to="/admin/bookings"><ArrowLeft size={14} aria-hidden="true" />All bookings</Link>
        <ChevronRight size={12} aria-hidden="true" /><span>Booking details</span>
      </div>
      <header className="overflow-hidden rounded-2xl border border-[#dfe8e1] bg-white shadow-sm shadow-[#254c3810]">
        <div className="flex flex-wrap items-center justify-between gap-5 p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-1 hidden size-11 shrink-0 place-items-center rounded-xl bg-[#eaf3ed] text-[#176b60] sm:grid"><CalendarCheck size={21} strokeWidth={1.6} aria-hidden="true" /></span>
            <div className="min-w-0">
              <span className="text-[9px] font-medium tracking-[1.5px] text-[#84988a] uppercase">Booking details</span>
              <h1 className="mt-1! mb-2! text-xl! leading-tight! font-semibold! tracking-tight! [overflow-wrap:anywhere] sm:text-[26px]!">{b.BookingNumber}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-[#829589]">
                <span className="flex items-center gap-1.5"><Clock size={12} aria-hidden="true" />Booked {date(b.CreatedAt)}</span>
                <span className="flex items-center gap-1.5"><CalendarDays size={12} aria-hidden="true" />Event {date(d.event.date)}</span>
              </div>
            </div>
          </div>
          <dl className="flex flex-wrap gap-x-5 gap-y-3 rounded-xl bg-[#fafcfb] px-4 py-3">
            <div><dt className="mb-1.5 text-[9px] tracking-wide text-[#829589] uppercase">Booking status</dt><dd><BookingStatus value={b.BookingStatus} /></dd></div>
            <div><dt className="mb-1.5 text-[9px] tracking-wide text-[#829589] uppercase">Payment status</dt><dd><BookingStatus value={b.PaymentStatus} /></dd></div>
          </dl>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-[#e8eeea] bg-[#fcfdfc] px-4 py-3 sm:px-5">
          <Link className={button} to={`/admin/customers/${b.CustomerId}`}>
            <UserRound size={14} />
            View Customer
          </Link>
          <Link className={button} to={`/admin/vendors/${b.VendorId}`}>
            <Store size={14} />
            View Vendor
          </Link>
          <button className={button} onClick={() => changeTab("Overview")}>
            <CalendarDays size={14} />
            View Event
          </button>
          <button className={button} onClick={() => changeTab("Payment")}>
            <Wallet size={14} />
            View Payment
          </button>
          {b.QuotationId && (
            <button
              className={button}
              onClick={() => changeTab("Quotation")}
            >
              <FileText size={14} aria-hidden="true" />
              View Quotation
            </button>
          )}
          <div className="flex flex-wrap items-center gap-2 min-[1350px]:ml-auto">
          {d.actions
            .filter((a) => !["view", "cancel", "refund"].includes(a))
            .map((a) => (
              <button
                className={primaryButton}
                key={a}
                onClick={() => setDialog(a)}
              >
                {
                  {
                    Confirmed: "Confirm Booking",
                    InProgress: "Start Event",
                    Completed: "Complete Booking",
                    Disputed: "Mark Disputed",
                  }[a]
                }
              </button>
            ))}
          {d.actions.includes("cancel") && (
            <button
              className={dangerButton}
              onClick={() => setDialog("cancel")}
            >
              <XCircle size={14} aria-hidden="true" />
              Cancel Booking
            </button>
          )}
          <button
            className={button}
            disabled={!f.canRefund}
            title={f.refundBlockedReason || "Initiate eligible refund"}
            onClick={() => setDialog("refund")}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Refund
          </button>
          </div>
        </div>
      </header>
      {b.CancellationReason && (
        <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 [&_p]:text-amber-800!">
          <strong>Cancellation reason: </strong>
          {b.CancellationReason}
          <p>{b.AdminNotes}</p>
        </aside>
      )}
      <nav className="flex min-w-0 gap-1 overflow-x-auto rounded-xl border border-[#e0e9e3] bg-white px-3 py-1 [&_button]:flex [&_button]:min-h-11 [&_button]:shrink-0 [&_button]:items-center [&_button]:gap-2 [&_button]:border-b-2 [&_button]:border-transparent [&_button]:px-3 [&_button]:text-xs [&_button]:whitespace-nowrap [&_button]:text-[#7b8e81] [&_button]:transition-colors [&_button:hover]:text-[#176b60] [&_button[aria-current]]:border-[#176b60] [&_button[aria-current]]:font-semibold! [&_button[aria-current]]:text-[#176b60]" aria-label="Booking details">
        {tabs
          .filter((t) => t !== "Quotation" || b.QuotationId)
          .map((t) => {
            const Icon = tabIcons[t];
            return (
            <button
              key={t}
              type="button"
              aria-current={tab === t ? "page" : undefined}
              onClick={() => changeTab(t)}
            >
              <Icon size={14} aria-hidden="true" />
              {t}
            </button>
            );
          })}
      </nav>
      <ChangeRequests id={bookingId} revision={revision} saved={() => setRevision((v) => v + 1)} />
      <div className="grid min-w-0 items-start gap-5 min-[1250px]:grid-cols-[minmax(0,1fr)_310px] min-[1600px]:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 rounded-2xl border border-[#dfe8e1] bg-white p-4 shadow-sm shadow-[#254c3810] sm:p-5 [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-sm [&_h3]:font-semibold">
          <div className="mb-5 flex items-center gap-2 border-b border-[#edf2ee] pb-4"><span className="size-1.5 rounded-full bg-[#176b60]" aria-hidden="true" /><h2 className="text-sm! font-semibold!">{tab === "Overview" ? "Booking overview" : tab}</h2></div>
          {tab === "Overview" && (
            <>
              <div className="grid gap-4 min-[700px]:grid-cols-2 [&_article]:min-w-0 [&_article]:rounded-xl [&_article]:border [&_article]:border-[#e2eae4] [&_article]:p-4 [&_dl]:grid-cols-1 [&_h3]:m-0!">
                {[
                  [
                    "Customer Information",
                    d.customer,
                    `/admin/customers/${b.CustomerId}`,
                  ],
                  [
                    "Vendor Information",
                    d.vendor,
                    `/admin/vendors/${b.VendorId}`,
                  ],
                ].map(([title, p, path]) => (
                  <article key={title}>
                    <div className="mb-3 flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#edf4ef] text-[#6a8d76]">{title.startsWith("Customer") ? <UserRound size={17} aria-hidden="true" /> : <Store size={17} aria-hidden="true" />}</span>
                      <div className="min-w-0">
                        <small className="mb-1 block text-[10px] text-[#84998b]">{title}</small>
                        <h3>
                          <Link className="block text-sm font-semibold [overflow-wrap:anywhere]" to={path}>{p.name}</Link>
                        </h3>
                      </div>
                    </div>
                    <Definition
                      values={{
                        ID: p.id,
                        Email: p.email,
                        Phone: p.phone,
                        ...(p.owner
                          ? {
                              Owner: p.owner,
                              "Verification status": p.verificationStatus,
                              Rating: p.rating,
                            }
                          : {}),
                      }}
                    />
                    <div className="flex flex-wrap gap-2 mt-4">
                      {p.email && (
                        <a className={button} href={`mailto:${p.email}`}>
                          <Mail size={14} />
                          Contact{" "}
                          {title.startsWith("Customer") ? "Customer" : "Vendor"}
                        </a>
                      )}
                      {p.phone && (
                        <a className={button} href={`tel:${p.phone}`}>
                          <Phone size={14} />
                          Call
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <section aria-labelledby="event-information-heading" className="mt-5 rounded-xl border border-[#e2eae4] p-4">
              <h3 id="event-information-heading" className="mt-0! flex items-center gap-2"><CalendarDays size={16} className="text-[#71937e]" aria-hidden="true" />Event information</h3>
              <Definition
                values={{
                  "Event name": d.event.name,
                  "Event type": d.event.type,
                  "Event date": date(d.event.date),
                  "Start time": time(d.event.startTime),
                  "End time": time(d.event.endTime),
                  Location: [d.event.city, d.event.state]
                    .filter(Boolean)
                    .join(", "),
                  "Guest count": number(d.event.guests),
                  Budget:
                    d.event.budget == null
                      ? "Not recorded"
                      : money(d.event.budget),
                  Description: d.event.description,
                }}
              />
              </section>
              <section aria-labelledby="booking-notes-heading" className="mt-5 rounded-xl border border-[#e2eae4] bg-[#fafcfb] p-4">
              <h3 id="booking-notes-heading" className="mt-0! flex items-center gap-2"><FileText size={16} className="text-[#71937e]" aria-hidden="true" />Booking notes</h3>
              <Definition
                values={{
                  "Customer notes": b.CustomerNotes,
                  "Vendor notes": b.VendorNotes,
                  "Admin notes": b.AdminNotes,
                }}
              />
              </section>
            </>
          )}
          {tab === "Items" && (
            <div className="min-w-0 overflow-x-auto rounded-xl border border-[#e6ece7]">
              <table className={tableClass}>
                <thead>
                  <tr>
                    {[
                      "Service / Package",
                      "Category",
                      "Vendor",
                      "Quantity",
                      "Unit Price",
                      "Discount",
                      "Tax",
                      "Total",
                    ].map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!d.items.length && <tr><td colSpan={8} className="py-10! text-center text-[#819486]">No services recorded for this booking.</td></tr>}
                  {d.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <Link to={`/admin/services/${i.serviceId}`}>
                          {i.name}
                        </Link>
                        <BookingItemDetails description={i.description} />
                        {i.package && (
                          <small className="block">Package: {i.package}</small>
                        )}
                      </td>
                      <td>{i.category || "Historical item"}</td>
                      <td>{i.vendor || d.vendor.name}</td>
                      <td>{i.quantity}</td>
                      <td>{money(i.unitPrice)}</td>
                      <td>{money(i.discount)}</td>
                      <td>{money(i.tax)}</td>
                      <td className="font-semibold">{money(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === "Payment" && <Payments id={bookingId} revision={revision} />}
          {tab === "Payout" && <Payout id={bookingId} revision={revision} />}
          {tab === "Policy" && (
            <>
              <p className="my-3 text-xs! leading-relaxed text-[#75897b]!">
                Terms captured at booking time take precedence. Legacy bookings
                with only free-text terms require an audited review before
                refunding.
              </p>
              {(f.policyTerms.length ? f.policyTerms : d.policies).map(
                (p, i) => (
                  <blockquote className="my-4 rounded-xl border border-[#e2eae4] border-l-[3px] border-l-[#80a88f] bg-[#fafcfb] p-4 text-xs leading-relaxed [&_strong]:mb-2 [&_strong]:block [&_p]:mt-1 [&_p]:text-xs!" key={i}>
                    <strong>{p.service}</strong>
                    <p>Cancellation: {p.cancellation}</p>
                    <p>Refund: {p.refund}</p>
                  </blockquote>
                ),
              )}
              {f.policy ? (
                <Definition
                  values={{
                    "Refundable payment %": f.policy.refundPercent,
                    "Cancellation charge %": f.policy.cancellationFeePercent,
                    "Minimum notice (hours)": f.policy.minimumNoticeHours,
                    "Reviewed by": f.policyReview?.by,
                    "Review reason": f.policyReview?.reason,
                    "Review notes": f.policyReview?.notes,
                  }}
                />
              ) : (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 [&_p]:text-amber-800!">
                  <ShieldAlert size={16} />
                  Refund eligibility requires policy review.
                </p>
              )}
              {!f.refundPending && !f.refunded && (
                <button
                  className={primaryButton}
                  onClick={() => setDialog("policy")}
                >
                  Review cancellation policy
                </button>
              )}
            </>
          )}
          {tab === "Status History" && (
            <ol className="mt-5 pl-2 [&_li]:relative [&_li]:border-l [&_li]:border-[#dbe7df] [&_li]:pb-6 [&_li]:pl-6 [&_li]:text-xs [&_li]:before:absolute [&_li]:before:top-1 [&_li]:before:-left-[4.5px] [&_li]:before:size-2 [&_li]:before:rounded-full [&_li]:before:bg-[#176b60] [&_li]:before:ring-4 [&_li]:before:ring-[#edf5ef] [&_li:last-child]:border-transparent [&_p]:my-2 [&_p]:text-xs! [&_p]:whitespace-pre-wrap [&_small]:text-[11px] [&_small]:text-[#8a9c8f]">
              {!d.history.length && <li>No status changes recorded.</li>}
              {d.history.map((h) => (
                <li key={h.id}>
                  <strong>
                    {{
                      Pending: "Booking Created",
                      PaymentReceived: "Payment Received",
                      Accepted: "Vendor Accepted",
                      Confirmed: "Booking Confirmed",
                      InProgress: "Event Started",
                      Completed: "Event Completed",
                    }[h.status] || h.status.replace(/([a-z])([A-Z])/g, "$1 $2")}
                  </strong>
                  <p>
                    {h.role} · {h.actor?.trim() || "System"}
                  </p>
                  {h.reason && <p>Reason: {h.reason}</p>}
                  {h.notes && <p>Notes: {h.notes}</p>}
                  <small>
                    {new Date(h.timestamp).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </small>
                </li>
              ))}
            </ol>
          )}
          {tab === "Audit Logs" && (
            <div className="my-4 grid gap-3 [&_article]:grid [&_article]:gap-2 [&_article]:rounded-xl [&_article]:border [&_article]:border-[#e3ebe5] [&_article]:p-4 [&_article]:text-xs [&_small]:text-[#829589]">
              {d.audits.map((a) => (
                <details key={a.id} className="rounded-xl border border-[#e2eae4] p-4 text-xs [&_summary]:cursor-pointer [&_summary]:leading-relaxed [&_summary]:font-medium [&_p]:my-3 [&_p]:text-xs! [&_pre]:my-2 [&_pre]:max-h-80 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-[#f5f8f5] [&_pre]:p-3 [&_pre]:text-[11px] [&_pre]:whitespace-pre-wrap [&_pre]:[overflow-wrap:anywhere]">
                  <summary>
                    {a.action.replaceAll("_", " ")} ·{" "}
                    {a.actor?.trim() || "System"} · {date(a.timestamp)}
                  </summary>
                  <p>
                    IP: {a.ip} · User agent: {a.userAgent || "Not recorded"}
                  </p>
                  <h4>Before</h4>
                  <pre>{formatJson(a.previous)}</pre>
                  <h4>After</h4>
                  <pre>{formatJson(a.details)}</pre>
                </details>
              ))}
              {!d.audits.length && <p>No audit entries.</p>}
            </div>
          )}
          {tab === "Quotation" &&
            (d.quotation ? (
              <>
                <Definition
                  values={{
                    Number: d.quotation.QuotationNumber,
                    Status: d.quotation.Status,
                    Subtotal: money(d.quotation.SubTotal),
                    Discount: money(d.quotation.DiscountAmount),
                    Tax: money(d.quotation.TaxAmount),
                    Total: money(d.quotation.TotalAmount),
                    "Valid until": date(d.quotation.ValidUntil),
                    "Vendor message": d.quotation.VendorMessage,
                  }}
                />
                <Link
                  className={button}
                  to={`/admin/quotations?q=${encodeURIComponent(d.quotation.QuotationNumber)}`}
                >
                  View quotation record
                </Link>
              </>
            ) : (
              <p>No quotation linked.</p>
            ))}
        </section>
        <aside className="grid min-w-0 gap-4">
          <PriceSummary f={f} />
          {["Cancelled", "Rejected"].includes(b.BookingStatus) && (
            <section className="grid gap-3 rounded-2xl border border-[#d7e5dc] bg-[#edf5ef] p-5 [&_h3]:text-sm [&_h3]:font-semibold [&_strong]:text-2xl [&_p]:text-xs! [&_p]:leading-relaxed">
              <h3>Refund eligibility</h3>
              <strong>{money(f.refundEligible)}</strong>
              <p>
                {f.refundBlockedReason ||
                  "Eligible under the reviewed cancellation policy."}
              </p>
              {!f.policy && (
                <button
                  className={button}
                  onClick={() => changeTab("Policy")}
                >
                  Review policy
                </button>
              )}
              <button
                className={primaryButton}
                disabled={!f.canRefund}
                onClick={() => setDialog("refund")}
              >
                Initiate Refund
              </button>
            </section>
          )}
        </aside>
      </div>
      {dialog && (
        <ActionDialog
          key={dialog}
          action={dialog}
          data={d}
          close={() => setDialog(null)}
          saved={saved}
        />
      )}
    </div>
  );
}
function formatJson(value) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value || "None";
  }
}
