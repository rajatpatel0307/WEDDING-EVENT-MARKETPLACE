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
  Definition,
  Field,
  BookingStatus,
} from "../components/BookingUI";
import AdminDialog from "../components/AdminDialog";
import { useAuth } from "../../../context/AuthContext";
import BookingChanges from "../../bookings/BookingChanges";
import BookingItemDetails from "../../bookings/BookingItemDetails";

function ChangeRequests({ id, revision, saved }) {
  const state = useAdminData(`/bookings/${id}/change-requests`, revision);
  if (state.loading) return <Loading />;
  if (state.error)
    return <ErrorState error={state.error} retry={state.retry} />;
  return (
    <BookingChanges
      id={id}
      role="Admin"
      data={{ requests: state.data }}
      request={adminRequest}
      saved={saved}
    />
  );
}

function PriceSummary({ f }) {
  return (
    <div className="ab-price-summary p-[24px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dee8e1] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dee8e1] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dee8e1] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dee8e1] rounded-[14px] [&_h3]:text-[18px] [&_h3]:font-[600] [&_h3]:mb-[18px] [&_>_div]:flex [&_>_div]:justify-between [&_>_div]:items-center [&_>_div]:gap-[12px] [&_>_div]:[padding:11px_0] [&_>_div]:[border-bottom-width:1px] [&_>_div]:[border-bottom-style:solid] [&_>_div]:[border-bottom-color:#edf1ec] [&_>_div]:text-[12px] [&_>_div:nth-of-type(6)]:text-[16px] [&_>_div:nth-of-type(6)]:text-[#226c55] [&_>_div:nth-of-type(6)]:[padding:18px_0] [&_span]:text-[#839489] [&_p]:text-[11px] [&_p]:text-[#8d9d91] [&_p]:mt-[18px] [&_p]:leading-[1.7]">
      <h3>Price Summary</h3>
      {[
        ["Subtotal", f.subtotal],
        ["Discount", f.discount],
        ["Tax", f.tax],
        ["Platform fees", f.platformFees],
        ["Separately recorded travel charges", f.travelCharges],
        ["Total amount", f.total],
        ["Paid amount", f.paid],
        ["Remaining amount", f.remaining],
        ["Refunded amount", f.refunded],
        ["Refund pending", f.refundPending],
        ["Platform commission", f.commission],
        ["Vendor payable", f.vendorPayable],
      ].map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{money(value)}</strong>
        </div>
      ))}
      <p>
        Amounts come from the booking and payment ledgers. Item prices may
        already include travel charges.
      </p>
      {!f.commissionRecorded && (
        <p>
          Commission has not been recorded. A new payout will remain on hold
          until financial terms are established.
        </p>
      )}
      {Math.abs(f.paid - f.recordedPaid) > 0.005 && (
        <p role="alert">
          Recorded booking payments differ from captured payments.
          Reconciliation is required.
        </p>
      )}
    </div>
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
      <form className="ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]" onSubmit={submit}>
        <p>
          <strong>{data.booking.BookingNumber}</strong> · {data.customer.name} ·{" "}
          {data.vendor.name}
        </p>
        {(refund || cancel) && (
          <>
            <p className="ab-warning [padding:16px_18px] [background:#fff5e0] [border-top-width:1px] [border-top-style:solid] [border-top-color:#efdfbd] [border-right-width:1px] [border-right-style:solid] [border-right-color:#efdfbd] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#efdfbd] [border-left-width:1px] [border-left-style:solid] [border-left-color:#efdfbd] text-[#9b7942] rounded-[10px] text-[12px] leading-[1.7]">
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
          <p role="alert" className="asm-alert [padding:15px_18px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edd3d5] [border-right-width:1px] [border-right-style:solid] [border-right-color:#edd3d5] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#edd3d5] [border-left-width:1px] [border-left-style:solid] [border-left-color:#edd3d5] [background:#fff5f4] rounded-[9px] text-[#a8555b] text-[13px]">
            {f.refundBlockedReason}
          </p>
        )}
        {refund && (
          <p className="asm-muted text-[12px] text-[#87958d] [margin:12px_0] leading-[1.7]">
            The server calculates the refundable balance. The original payment
            remains in the ledger. Completion requires payment-provider
            confirmation.
          </p>
        )}
        {review && (
          <>
            <p className="asm-muted text-[12px] text-[#87958d] [margin:12px_0] leading-[1.7]">
              Record the applicable cancellation terms after reviewing the
              original agreement. Existing commission records remain unchanged.
            </p>
            {data.policies.map((p, i) => (
              <blockquote key={i} className="ab-policy p-[18px] [margin:15px_0] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e1e9e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e1e9e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e1e9e2] [border-left-width:3px] [border-left-style:solid] [border-left-color:#729e85] rounded-[8px] text-[13px] leading-[1.8] [&_strong]:block [&_strong]:mb-[8px]">
                <strong>{p.service}</strong>
                <p>{p.cancellation}</p>
                <p>{p.refund}</p>
              </blockquote>
            ))}
            <div className="asm-form-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] gap-[16px]">
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
                <blockquote className="ab-policy p-[18px] [margin:15px_0] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e1e9e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e1e9e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e1e9e2] [border-left-width:3px] [border-left-style:solid] [border-left-color:#729e85] rounded-[8px] text-[13px] leading-[1.8] [&_strong]:block [&_strong]:mb-[8px]" key={i}>
                  <strong>{p.service}</strong>
                  <p>{p.cancellation}</p>
                  <p>{p.refund}</p>
                </blockquote>
              ),
            )}
            {!f.policy && (
              <p className="asm-muted text-[12px] text-[#87958d] [margin:12px_0] leading-[1.7]">
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
          <p role="alert" className="asm-alert [padding:15px_18px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edd3d5] [border-right-width:1px] [border-right-style:solid] [border-right-color:#edd3d5] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#edd3d5] [border-left-width:1px] [border-left-style:solid] [border-left-color:#edd3d5] [background:#fff5f4] rounded-[9px] text-[#a8555b] text-[13px]">
            {error}
          </p>
        )}
        <footer className="flex justify-end gap-2">
          <button
            type="button"
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            disabled={busy}
            onClick={close}
          >
            Close
          </button>
          <button
            className={`ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3] ${cancel ? "ab-danger [&.ab-danger]:[background:#b46c65]! [&.ab-danger]:[border-top-color:#b46c65]! [&.ab-danger]:[border-right-color:#b46c65]! [&.ab-danger]:[border-bottom-color:#b46c65]! [&.ab-danger]:[border-left-color:#b46c65]! [&.ab-danger]:text-[#fff]!" : "ad-primary"}`}
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
      <div className="asm-table-wrap [overflow-x:auto] overflow-y-auto pb-[8px]">
        <table className="asm-table w-full border-collapse text-left text-[12px] [&_th]:font-[600] [&_th]:text-[10px] [&_th]:tracking-[0.6px] [&_th]:uppercase [&_th]:whitespace-nowrap [&_th]:[padding:13px_14px] [&_th]:[background:#f6f9f6] [&_th]:text-[#7b8b80] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#e5ebe6] [&_td]:[border-bottom-width:1px] [&_td]:[border-bottom-style:solid] [&_td]:[border-bottom-color:#edf1ed] [&_td]:[padding:16px_14px] [&_td]:[vertical-align:middle] [&_tbody_tr:hover]:[background:#fbfcfa] [@media(width<=1200px)]:[&_.asm-id]:max-w-[75px]">
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
      <div className="asm-records grid gap-[12px] [margin:18px_0] [&_article]:p-[18px] [&_article]:[border-top-width:1px] [&_article]:[border-top-style:solid] [&_article]:[border-top-color:#e4ebe4] [&_article]:[border-right-width:1px] [&_article]:[border-right-style:solid] [&_article]:[border-right-color:#e4ebe4] [&_article]:[border-bottom-width:1px] [&_article]:[border-bottom-style:solid] [&_article]:[border-bottom-color:#e4ebe4] [&_article]:[border-left-width:1px] [&_article]:[border-left-style:solid] [&_article]:[border-left-color:#e4ebe4] [&_article]:rounded-[10px] [&_article]:grid [&_article]:gap-[10px] [&_article]:text-[13px] [&_small]:text-[#8b9b90]">
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
      <div className="asm-records grid gap-[12px] [margin:18px_0] [&_article]:p-[18px] [&_article]:[border-top-width:1px] [&_article]:[border-top-style:solid] [&_article]:[border-top-color:#e4ebe4] [&_article]:[border-right-width:1px] [&_article]:[border-right-style:solid] [&_article]:[border-right-color:#e4ebe4] [&_article]:[border-bottom-width:1px] [&_article]:[border-bottom-style:solid] [&_article]:[border-bottom-color:#e4ebe4] [&_article]:[border-left-width:1px] [&_article]:[border-left-style:solid] [&_article]:[border-left-color:#e4ebe4] [&_article]:rounded-[10px] [&_article]:grid [&_article]:gap-[10px] [&_article]:text-[13px] [&_small]:text-[#8b9b90]">
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
      <p className="asm-muted text-[12px] text-[#87958d] [margin:12px_0] leading-[1.7]">
        Payouts are calculated after completion. Refunds, unresolved commission
        terms and unpaid balances place payouts on hold. This screen does not
        transfer funds.
      </p>
      {state.data.rows.map((p) => (
        <article className="ab-policy p-[18px] [margin:15px_0] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e1e9e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e1e9e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e1e9e2] [border-left-width:3px] [border-left-style:solid] [border-left-color:#729e85] rounded-[8px] text-[13px] leading-[1.8] [&_strong]:block [&_strong]:mb-[8px]" key={p.PayoutId}>
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
      <div className="asm-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e8e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e8e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e8e2] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e8e2] rounded-[14px] p-[24px] [@media(width<=1200px)]:p-[18px] min-w-0 [&_h2]:text-[19px] [&_h2]:font-[650] [&_h2]:mb-[20px] [&_h3]:text-[15px] [&_h3]:font-[600] [&_h3]:[margin:18px_0_12px]">
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
    <div className="asm-page ab-page grid gap-[24px] text-[#253f3a] [&_select]:[padding:9px_12px] [&_select]:text-[12px] [&_select]:[border-top-width:1px] [&_select]:[border-top-style:solid] [&_select]:[border-top-color:#dce5df] [&_select]:[border-right-width:1px] [&_select]:[border-right-style:solid] [&_select]:[border-right-color:#dce5df] [&_select]:[border-bottom-width:1px] [&_select]:[border-bottom-style:solid] [&_select]:[border-bottom-color:#dce5df] [&_select]:[border-left-width:1px] [&_select]:[border-left-style:solid] [&_select]:[border-left-color:#dce5df] [&_select]:rounded-[7px] [&_select]:[background:#fff]">
      <ChangeRequests
        id={bookingId}
        revision={revision}
        saved={() => setRevision((v) => v + 1)}
      />
      <Link className="asm-back flex items-center gap-[8px] text-[13px] text-[#698c7d]" to="/admin/bookings">
        <ArrowLeft size={16} />
        All Bookings
      </Link>
      <header className="asm-detail-header ab-header [&_h1]:text-[30px] [@media(width<=767px)]:[&_h1]:text-[25px] [&_h1]:leading-[1.2] [&_h1]:[margin:8px_0_10px] [&_h1]:font-[650] [&_h1]:tracking-[-0.7px] [&_p]:text-[14px] [&_p]:text-[#7b8a83] flex gap-[18px] items-center flex-wrap [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7e1] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7e1] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7e1] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7e1] [background:#fff] rounded-[14px] p-[26px] [@media(width<=767px)]:p-[18px] [&_>_.asm-identity]:flex-1 [&_>_.asm-identity]:min-w-[280px] [@media(width<=767px)]:[&_>_.asm-identity]:min-w-0 [&_.asm-identity_>_img]:w-[100px] [@media(width<=767px)]:[&_.asm-identity_>_img]:w-[70px] [&_.asm-identity_>_img]:h-[100px] [@media(width<=767px)]:[&_.asm-identity_>_img]:h-[70px] [&_.asm-image-placeholder]:w-[100px] [@media(width<=767px)]:[&_.asm-image-placeholder]:w-[70px] [&_.asm-image-placeholder]:h-[100px] [@media(width<=767px)]:[&_.asm-image-placeholder]:h-[70px] [&_small]:text-[11px] [&_small]:text-[#87978d] [&_small]:block [&_small]:mt-[10px] [&_small]:max-w-[none] [&_.asm-identity_p]:mb-[10px] [@media(width<=767px)]:[&_>_.asm-identity]:[flex-basis:100%] justify-between [&_>_div:first-child]:min-w-[230px]">
        <div>
          <span className="ad-eyebrow text-[8px] [@media(width<=767px)]:text-[7px] tracking-[1.7px] text-[#7d9183] flex items-center gap-[6px] [&_>_span]:w-[5px] [&_>_span]:h-[5px] [&_>_span]:[background:#bfa471] [&_>_span]:rounded-[50%]">BOOKING DETAILS</span>
          <h1>{b.BookingNumber}</h1>
          <div className="flex flex-wrap gap-2">
            <BookingStatus value={b.BookingStatus} />
            <BookingStatus value={b.PaymentStatus} />
          </div>
          <small>
            Booked {date(b.CreatedAt)} · Event {date(d.event.date)}
          </small>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" to={`/admin/customers/${b.CustomerId}`}>
            <UserRound size={14} />
            View Customer
          </Link>
          <Link className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" to={`/admin/vendors/${b.VendorId}`}>
            <Store size={14} />
            View Vendor
          </Link>
          <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={() => changeTab("Overview")}>
            <CalendarDays size={14} />
            View Event
          </button>
          <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={() => changeTab("Payment")}>
            <Wallet size={14} />
            View Payment
          </button>
          {b.QuotationId && (
            <button
              className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
              onClick={() => changeTab("Quotation")}
            >
              View Quotation
            </button>
          )}
          {d.actions
            .filter((a) => !["view", "cancel", "refund"].includes(a))
            .map((a) => (
              <button
                className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
              className="ad-button asm-danger-text inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3] [&.asm-danger-text]:text-[#b14b52]!"
              onClick={() => setDialog("cancel")}
            >
              Cancel Booking
            </button>
          )}
          <button
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            disabled={!f.canRefund}
            title={f.refundBlockedReason || "Initiate eligible refund"}
            onClick={() => setDialog("refund")}
          >
            Refund
          </button>
        </div>
      </header>
      {b.CancellationReason && (
        <aside className="ab-warning [padding:16px_18px] [background:#fff5e0] [border-top-width:1px] [border-top-style:solid] [border-top-color:#efdfbd] [border-right-width:1px] [border-right-style:solid] [border-right-color:#efdfbd] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#efdfbd] [border-left-width:1px] [border-left-style:solid] [border-left-color:#efdfbd] text-[#9b7942] rounded-[10px] text-[12px] leading-[1.7]">
          <strong>Cancellation reason: </strong>
          {b.CancellationReason}
          <p>{b.AdminNotes}</p>
        </aside>
      )}
      <nav className="asm-detail-tabs flex gap-[7px] [overflow-x:auto] pb-[3px] [&_button]:text-[13px] [&_button]:[padding:10px_16px] [&_button]:rounded-[8px] [&_button]:whitespace-nowrap [&_button]:text-[#74817c] [&_button[aria-current]]:[background:#e5efea] [&_button[aria-current]]:text-[#185b4d] [&_button[aria-current]]:font-[650]" aria-label="Booking details">
        {tabs
          .filter((t) => t !== "Quotation" || b.QuotationId)
          .map((t) => (
            <button
              key={t}
              aria-current={tab === t ? "page" : undefined}
              onClick={() => changeTab(t)}
            >
              {t}
            </button>
          ))}
      </nav>
      <div className="ab-detail-grid grid grid-cols-[minmax(0,_1fr)_305px] [@media(width<=1200px)]:grid-cols-[1fr] gap-[22px] [@media(width<=767px)]:gap-[16px] [align-items:start] [@media(width<=1200px)]:[&_>_aside]:grid [@media(width<=767px)]:[&_>_aside]:grid-cols-[1fr] [@media(767px<width<=1200px)]:[&_>_aside]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=1200px)]:[&_>_aside]:gap-[18px]">
        <section className="asm-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e8e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e8e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e8e2] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e8e2] rounded-[14px] p-[24px] [@media(width<=1200px)]:p-[18px] min-w-0 [&_h2]:text-[19px] [&_h2]:font-[650] [&_h2]:mb-[20px] [&_h3]:text-[15px] [&_h3]:font-[600] [&_h3]:[margin:18px_0_12px]">
          <h2>{tab}</h2>
          {tab === "Overview" && (
            <>
              <div className="ab-parties grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] gap-[18px] [&_article]:p-[18px] [&_article]:[border-top-width:1px] [&_article]:[border-top-style:solid] [&_article]:[border-top-color:#e2ebe4] [&_article]:[border-right-width:1px] [&_article]:[border-right-style:solid] [&_article]:[border-right-color:#e2ebe4] [&_article]:[border-bottom-width:1px] [&_article]:[border-bottom-style:solid] [&_article]:[border-bottom-color:#e2ebe4] [&_article]:[border-left-width:1px] [&_article]:[border-left-style:solid] [&_article]:[border-left-color:#e2ebe4] [&_article]:rounded-[10px] [&_article]:min-w-0 [&_.asm-definition]:grid-cols-[1fr] [&_.asm-identity]:min-w-0 [&_h3]:[margin:5px_0] [&_small]:text-[#8b9d91] [&_small]:text-[11px]">
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
                    <div className="asm-identity flex gap-[11px] items-center min-w-[180px] [&_img]:w-[48px] [&_img]:h-[48px] [&_img]:object-cover [&_img]:shrink-0 [&_img]:rounded-[9px] [&_img]:[background:#edf3ed] [&_img]:grid [&_img]:place-items-center [&_img]:text-[#77988b] [&_strong]:block [&_strong]:font-[600] [&_strong]:text-[13px] [&_small]:block [&_small]:text-[11px] [&_small]:text-[#88938c] [&_small]:mt-[4px] [&_small]:max-w-[190px] [&_small]:[overflow-x:hidden] [&_small]:[overflow-y:hidden] [&_small]:[text-overflow:ellipsis] [&_small]:whitespace-nowrap">
                      {p.image && <img src={p.image} alt="" />}
                      <div>
                        <small>{title}</small>
                        <h3>
                          <Link to={path}>{p.name}</Link>
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
                        <a className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" href={`mailto:${p.email}`}>
                          <Mail size={14} />
                          Contact{" "}
                          {title.startsWith("Customer") ? "Customer" : "Vendor"}
                        </a>
                      )}
                      {p.phone && (
                        <a className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" href={`tel:${p.phone}`}>
                          <Phone size={14} />
                          Call
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <h3>Event Information</h3>
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
              <h3>Booking Notes</h3>
              <Definition
                values={{
                  "Customer notes": b.CustomerNotes,
                  "Vendor notes": b.VendorNotes,
                  "Admin notes": b.AdminNotes,
                }}
              />
            </>
          )}
          {tab === "Items" && (
            <div className="asm-table-wrap [overflow-x:auto] overflow-y-auto pb-[8px]">
              <table className="asm-table w-full border-collapse text-left text-[12px] [&_th]:font-[600] [&_th]:text-[10px] [&_th]:tracking-[0.6px] [&_th]:uppercase [&_th]:whitespace-nowrap [&_th]:[padding:13px_14px] [&_th]:[background:#f6f9f6] [&_th]:text-[#7b8b80] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#e5ebe6] [&_td]:[border-bottom-width:1px] [&_td]:[border-bottom-style:solid] [&_td]:[border-bottom-color:#edf1ed] [&_td]:[padding:16px_14px] [&_td]:[vertical-align:middle] [&_tbody_tr:hover]:[background:#fbfcfa] [@media(width<=1200px)]:[&_.asm-id]:max-w-[75px]">
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
              <p className="asm-muted text-[12px] text-[#87958d] [margin:12px_0] leading-[1.7]">
                Terms captured at booking time take precedence. Legacy bookings
                with only free-text terms require an audited review before
                refunding.
              </p>
              {(f.policyTerms.length ? f.policyTerms : d.policies).map(
                (p, i) => (
                  <blockquote className="ab-policy p-[18px] [margin:15px_0] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e1e9e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e1e9e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e1e9e2] [border-left-width:3px] [border-left-style:solid] [border-left-color:#729e85] rounded-[8px] text-[13px] leading-[1.8] [&_strong]:block [&_strong]:mb-[8px]" key={i}>
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
                <p className="ab-warning [padding:16px_18px] [background:#fff5e0] [border-top-width:1px] [border-top-style:solid] [border-top-color:#efdfbd] [border-right-width:1px] [border-right-style:solid] [border-right-color:#efdfbd] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#efdfbd] [border-left-width:1px] [border-left-style:solid] [border-left-color:#efdfbd] text-[#9b7942] rounded-[10px] text-[12px] leading-[1.7]">
                  <ShieldAlert size={16} />
                  Refund eligibility requires policy review.
                </p>
              )}
              {!f.refundPending && !f.refunded && (
                <button
                  className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                  onClick={() => setDialog("policy")}
                >
                  Review cancellation policy
                </button>
              )}
            </>
          )}
          {tab === "Status History" && (
            <ol className="ab-timeline [list-style:none] pl-[12px] [&_li]:relative [&_li]:[border-left-width:2px] [&_li]:[border-left-style:solid] [&_li]:[border-left-color:#dfece2] [&_li]:[padding:0_0_26px_24px] [&_li]:text-[13px] [&_li:before]:[content:''] [&_li:before]:absolute [&_li:before]:w-[10px] [&_li:before]:h-[10px] [&_li:before]:[background:#699b7d] [&_li:before]:rounded-[50%] [&_li:before]:left-[-6px] [&_li:before]:top-[3px] [&_p]:[margin:8px_0] [&_p]:text-[#7d9384] [&_p]:whitespace-pre-wrap [&_small]:text-[11px] [&_small]:text-[#98a99b]">
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
            <div className="asm-records grid gap-[12px] [margin:18px_0] [&_article]:p-[18px] [&_article]:[border-top-width:1px] [&_article]:[border-top-style:solid] [&_article]:[border-top-color:#e4ebe4] [&_article]:[border-right-width:1px] [&_article]:[border-right-style:solid] [&_article]:[border-right-color:#e4ebe4] [&_article]:[border-bottom-width:1px] [&_article]:[border-bottom-style:solid] [&_article]:[border-bottom-color:#e4ebe4] [&_article]:[border-left-width:1px] [&_article]:[border-left-style:solid] [&_article]:[border-left-color:#e4ebe4] [&_article]:rounded-[10px] [&_article]:grid [&_article]:gap-[10px] [&_article]:text-[13px] [&_small]:text-[#8b9b90]">
              {d.audits.map((a) => (
                <details key={a.id} className="ab-audit p-[16px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e9e1] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e9e1] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e9e1] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e9e1] rounded-[8px] text-[12px] [&_summary]:cursor-pointer [&_summary]:font-[600] [&_p]:[margin:14px_0] [&_p]:text-[#82978b] [&_pre]:max-w-full [&_pre]:[overflow-x:auto] [&_pre]:overflow-y-auto [&_pre]:max-h-[350px] [&_pre]:p-[14px] [&_pre]:[background:#f6f9f5] [&_pre]:[margin:10px_0] [&_pre]:whitespace-pre-wrap [&_pre]:[overflow-wrap:anywhere]">
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
                  className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                  to={`/admin/quotations?q=${encodeURIComponent(d.quotation.QuotationNumber)}`}
                >
                  View quotation record
                </Link>
              </>
            ) : (
              <p>No quotation linked.</p>
            ))}
        </section>
        <aside>
          <PriceSummary f={f} />
          {["Cancelled", "Rejected"].includes(b.BookingStatus) && (
            <section className="ab-refund-card p-[22px] [background:#edf4ef] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dce7dd] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dce7dd] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dce7dd] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dce7dd] rounded-[12px] mt-[18px] [@media(width<=1200px)]:mt-[0] grid gap-[15px] [&_h3]:text-[15px] [&_h3]:font-[600] [&_>_strong]:text-[25px] [&_p]:text-[12px] [&_p]:text-[#7d9381] [&_p]:leading-[1.7]">
              <h3>Refund eligibility</h3>
              <strong>{money(f.refundEligible)}</strong>
              <p>
                {f.refundBlockedReason ||
                  "Eligible under the reviewed cancellation policy."}
              </p>
              {!f.policy && (
                <button
                  className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                  onClick={() => changeTab("Policy")}
                >
                  Review policy
                </button>
              )}
              <button
                className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
