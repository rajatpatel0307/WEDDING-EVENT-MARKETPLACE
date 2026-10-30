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
import "../services-management.css";
import "../bookings-management.css";
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
    <div className="ab-price-summary">
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
      <form className="ad-form" onSubmit={submit}>
        <p>
          <strong>{data.booking.BookingNumber}</strong> · {data.customer.name} ·{" "}
          {data.vendor.name}
        </p>
        {(refund || cancel) && (
          <>
            <p className="ab-warning">
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
          <p role="alert" className="asm-alert">
            {f.refundBlockedReason}
          </p>
        )}
        {refund && (
          <p className="asm-muted">
            The server calculates the refundable balance. The original payment
            remains in the ledger. Completion requires payment-provider
            confirmation.
          </p>
        )}
        {review && (
          <>
            <p className="asm-muted">
              Record the applicable cancellation terms after reviewing the
              original agreement. Existing commission records remain unchanged.
            </p>
            {data.policies.map((p, i) => (
              <blockquote key={i} className="ab-policy">
                <strong>{p.service}</strong>
                <p>{p.cancellation}</p>
                <p>{p.refund}</p>
              </blockquote>
            ))}
            <div className="asm-form-grid">
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
                <blockquote className="ab-policy" key={i}>
                  <strong>{p.service}</strong>
                  <p>{p.cancellation}</p>
                  <p>{p.refund}</p>
                </blockquote>
              ),
            )}
            {!f.policy && (
              <p className="asm-muted">
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
          <p role="alert" className="asm-alert">
            {error}
          </p>
        )}
        <footer className="flex justify-end gap-2">
          <button
            type="button"
            className="ad-button"
            disabled={busy}
            onClick={close}
          >
            Close
          </button>
          <button
            className={`ad-button ${cancel ? "ab-danger" : "ad-primary"}`}
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
      <div className="asm-table-wrap">
        <table className="asm-table">
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
      <div className="asm-records">
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
      <div className="asm-records">
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
      <p className="asm-muted">
        Payouts are calculated after completion. Refunds, unresolved commission
        terms and unpaid balances place payouts on hold. This screen does not
        transfer funds.
      </p>
      {state.data.rows.map((p) => (
        <article className="ab-policy" key={p.PayoutId}>
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
      <div className="asm-panel">
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
    <div className="asm-page ab-page">
      <ChangeRequests
        id={bookingId}
        revision={revision}
        saved={() => setRevision((v) => v + 1)}
      />
      <Link className="asm-back" to="/admin/bookings">
        <ArrowLeft size={16} />
        All Bookings
      </Link>
      <header className="asm-detail-header ab-header">
        <div>
          <span className="ad-eyebrow">BOOKING DETAILS</span>
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
          <Link className="ad-button" to={`/admin/customers/${b.CustomerId}`}>
            <UserRound size={14} />
            View Customer
          </Link>
          <Link className="ad-button" to={`/admin/vendors/${b.VendorId}`}>
            <Store size={14} />
            View Vendor
          </Link>
          <button className="ad-button" onClick={() => changeTab("Overview")}>
            <CalendarDays size={14} />
            View Event
          </button>
          <button className="ad-button" onClick={() => changeTab("Payment")}>
            <Wallet size={14} />
            View Payment
          </button>
          {b.QuotationId && (
            <button
              className="ad-button"
              onClick={() => changeTab("Quotation")}
            >
              View Quotation
            </button>
          )}
          {d.actions
            .filter((a) => !["view", "cancel", "refund"].includes(a))
            .map((a) => (
              <button
                className="ad-button"
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
              className="ad-button asm-danger-text"
              onClick={() => setDialog("cancel")}
            >
              Cancel Booking
            </button>
          )}
          <button
            className="ad-button"
            disabled={!f.canRefund}
            title={f.refundBlockedReason || "Initiate eligible refund"}
            onClick={() => setDialog("refund")}
          >
            Refund
          </button>
        </div>
      </header>
      {b.CancellationReason && (
        <aside className="ab-warning">
          <strong>Cancellation reason: </strong>
          {b.CancellationReason}
          <p>{b.AdminNotes}</p>
        </aside>
      )}
      <nav className="asm-detail-tabs" aria-label="Booking details">
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
      <div className="ab-detail-grid">
        <section className="asm-panel">
          <h2>{tab}</h2>
          {tab === "Overview" && (
            <>
              <div className="ab-parties">
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
                    <div className="asm-identity">
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
                        <a className="ad-button" href={`mailto:${p.email}`}>
                          <Mail size={14} />
                          Contact{" "}
                          {title.startsWith("Customer") ? "Customer" : "Vendor"}
                        </a>
                      )}
                      {p.phone && (
                        <a className="ad-button" href={`tel:${p.phone}`}>
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
            <div className="asm-table-wrap">
              <table className="asm-table">
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
              <p className="asm-muted">
                Terms captured at booking time take precedence. Legacy bookings
                with only free-text terms require an audited review before
                refunding.
              </p>
              {(f.policyTerms.length ? f.policyTerms : d.policies).map(
                (p, i) => (
                  <blockquote className="ab-policy" key={i}>
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
                <p className="ab-warning">
                  <ShieldAlert size={16} />
                  Refund eligibility requires policy review.
                </p>
              )}
              {!f.refundPending && !f.refunded && (
                <button
                  className="ad-button ad-primary"
                  onClick={() => setDialog("policy")}
                >
                  Review cancellation policy
                </button>
              )}
            </>
          )}
          {tab === "Status History" && (
            <ol className="ab-timeline">
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
            <div className="asm-records">
              {d.audits.map((a) => (
                <details key={a.id} className="ab-audit">
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
                  className="ad-button"
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
            <section className="ab-refund-card">
              <h3>Refund eligibility</h3>
              <strong>{money(f.refundEligible)}</strong>
              <p>
                {f.refundBlockedReason ||
                  "Eligible under the reviewed cancellation policy."}
              </p>
              {!f.policy && (
                <button
                  className="ad-button"
                  onClick={() => changeTab("Policy")}
                >
                  Review policy
                </button>
              )}
              <button
                className="ad-button ad-primary"
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
