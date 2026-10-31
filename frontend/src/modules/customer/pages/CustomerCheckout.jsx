import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ShieldCheck, Clock3, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  useCustomerData,
  Loading,
  ErrorView,
  Heading,
  Badge,
} from "../components/WorkspaceUI";
import {
  money,
  date,
  save,
  customerRequest,
  download,
} from "../services/workspace.api";
import RefundRequest from "./CustomerRefunds";
import { checkout } from "../services/checkout";
import { paymentScreen } from "../services/checkout-state";
export default function CustomerCheckout({ transaction = false }) {
  const { id } = useParams();
  return (
    <CheckoutContent
      key={`${transaction ? "payment" : "booking"}:${id}`}
      transaction={transaction}
    />
  );
}
function CheckoutContent({ transaction }) {
  const { id } = useParams(),
    { user } = useAuth(),
    [version, setVersion] = useState(0),
    [stage, setStage] = useState("review"),
    [termsAccepted, setTermsAccepted] = useState(false),
    [mode, setMode] = useState("balance"),
    [checkoutKey, setCheckoutKey] = useState(() => crypto.randomUUID()),
    [paidBefore, setPaidBefore] = useState(null),
    [error, setError] = useState("");
  const r = useCustomerData(
      transaction ? `/payments/${id}` : `/bookings/${id}`,
      version,
    ),
    config = useCustomerData("/payments/config");
  useEffect(() => {
    if (stage !== "pending" || r.data?.booking?.PaymentStatus === "Paid")
      return;
    const interval = setInterval(() => setVersion((v) => v + 1), 5000);
    return () => clearInterval(interval);
  }, [stage, r.data?.booking?.PaymentStatus]);
  useEffect(() => {
    if (
      stage === "pending" &&
      paidBefore !== null &&
      Number(r.data?.booking?.PaidAmount) > paidBefore
    ) {
      setStage("verified");
      setMode("balance");
      setCheckoutKey(crypto.randomUUID());
    }
  }, [stage, paidBefore, r.data?.booking?.PaidAmount]);
  if (r.loading && !r.data) return <Loading />;
  if (r.error) return <ErrorView error={r.error} retry={r.retry} />;
  if (transaction) {
    const p = r.data.payment;
    return (
      <>
        <Heading
          title="Transaction details"
          description="Recorded securely on the server."
        />
        <section className="cw-panel cw-prose">
          <h2>{p.reference}</h2>
          <Badge>{p.status}</Badge>
          <p>
            {money(p.amount, false, p.currency)} · {p.method} · {p.gateway}
          </p>
          <p>{date(p.paidAt || p.createdAt)}</p>
          <Link to={`/customer/bookings/${p.bookingId}`}>
            Booking {p.booking}
          </Link>
          {["Success", "Refunded"].includes(p.status) && (
            <button
              className="cw-button"
              onClick={async () => {
                try {
                  download(
                    await customerRequest(`/payments/${id}/receipt`, {
                      download: true,
                    }),
                    "payment-receipt.txt",
                  );
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              Download receipt
            </button>
          )}
          <Link
            className="cw-button"
            to={`/customer/bookings/${p.bookingId}/checkout`}
          >
            Payment status and retry
          </Link>
          <h3>Transaction history</h3>
          {r.data.transactions.map((t) => (
            <p key={t.id}>
              {t.type} · {t.status} · {money(t.amount)} · {date(t.createdAt)}
            </p>
          ))}
          <h3>Refunds</h3>
          {r.data.refunds.length ? (
            r.data.refunds.map((f, i) => (
              <p key={i}>
                {money(f.amount)} · {f.status}
              </p>
            ))
          ) : (
            <p>No refunds recorded.</p>
          )}
        </section>
        <RefundRequest bookingId={p.bookingId} />
        {error && <p role="alert">{error}</p>}
      </>
    );
  }
  const b = r.data.booking,
    paid = b.PaymentStatus === "Paid",
    eligible =
      ["Accepted", "PaymentPending", "Confirmed", "InProgress"].includes(
        b.BookingStatus,
      ) && Number(b.RemainingAmount) > 0;
  const screen = paymentScreen(b, stage);
  async function pay() {
    setPaidBefore(Number(b.PaidAmount));
    setStage("processing");
    setError("");
    try {
      const result = await checkout(id, user, {
        mode,
        idempotencyKey: checkoutKey,
        termsAccepted,
      });
      setStage(
        result.closed
          ? "review"
          : result.verified || result.alreadyPaid
            ? "verified"
            : "pending",
      );
      if (result.verified || result.alreadyPaid) {
        setMode("balance");
        setCheckoutKey(crypto.randomUUID());
      }
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e.message);
      setStage(e.paymentFailed ? "failed" : "pending");
      setVersion((v) => v + 1);
    }
  }
  return (
    <>
      <Link className="cw-back" to={`/customer/bookings/${id}`}>
        ← Booking details
      </Link>
      <Heading
        title={
          screen === "success"
            ? "Payment verified"
            : screen === "processing"
              ? "Processing payment"
              : screen === "pending"
                ? "Checking payment status"
                : screen === "failed"
                  ? "Payment attempt failed"
                  : "Secure checkout"
        }
        description={b.BookingNumber}
      />
      {r.data.checkout?.event?.location && (
        <section className="cw-panel cw-prose">
          <h2>Agreed event location</h2>
          <p>
            {[
              r.data.checkout.event.location.venue,
              r.data.checkout.event.location.line1,
              r.data.checkout.event.location.city,
              r.data.checkout.event.location.state,
              r.data.checkout.event.location.postalCode,
              r.data.checkout.event.location.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
          <p>{r.data.checkout.event.location.instructions}</p>
          <p>This is the location agreed when this booking was created.</p>
          {r.data.checkout.event.billingAddress && (
            <>
              <h3>Billing address</h3>
              <p>
                {[
                  r.data.checkout.event.billingAddress.line1,
                  r.data.checkout.event.billingAddress.city,
                  r.data.checkout.event.billingAddress.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </>
          )}
        </section>
      )}
      <section className="cw-panel cw-prose">
        <div className="cw-detail-actions">
          {paid ? (
            <CheckCircle2 />
          ) : stage === "pending" ? (
            <Clock3 />
          ) : (
            <ShieldCheck />
          )}
          <Badge>{b.BookingStatus}</Badge>
          <Badge>{b.PaymentStatus}</Badge>
        </div>
        {paid ? (
          <p>
            Your payment has been verified by the server. Your booking remains
            subject to its current booking status.
          </p>
        ) : stage === "verified" ? (
          <p>
            Your installment was verified by the server. The remaining balance
            is shown below.
          </p>
        ) : screen === "pending" ? (
          <p>
            Payment is not yet confirmed by the server. If money was deducted,
            wait for provider verification before retrying. You can leave this
            page and return to your booking.
          </p>
        ) : (
          <p>
            Your payment details are handled by Razorpay. MarryNest does not
            store card information.
          </p>
        )}
        <Link className="cw-button" to="/customer/payments">
          Payment history and receipts
        </Link>
        <h2>{money(b.RemainingAmount)} outstanding</h2>
        <p>
          {r.data.checkout?.event?.name} · {date(b.BookingDate)} ·{" "}
          {r.data.checkout?.vendor} · {r.data.checkout?.event?.city}{" "}
          {r.data.checkout?.event?.state}
        </p>
        {b.StartTime && (
          <p>
            Event time:{" "}
            {String(b.StartTime).includes("T")
              ? new Date(b.StartTime).toISOString().slice(11, 16)
              : String(b.StartTime).slice(0, 5)}
            {b.EndTime
              ? ` – ${String(b.EndTime).includes("T") ? new Date(b.EndTime).toISOString().slice(11, 16) : String(b.EndTime).slice(0, 5)}`
              : ""}{" "}
            (Asia/Kolkata)
          </p>
        )}
        <div className="cw-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Service / package</th>
                <th>Quantity</th>
                <th>Unit price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {r.data.items?.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.name}
                    {item.packageId ? " (package)" : ""}
                  </td>
                  <td>{item.quantity}</td>
                  <td>{money(item.price)}</td>
                  <td>{money(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Subtotal {money(b.SubTotal)} · Discounts {money(b.DiscountAmount)} ·
          Tax {money(b.TaxAmount)} · Fees {money(b.PlatformFee)}
        </p>
        <p>
          Total {money(b.TotalAmount)} · Paid {money(b.PaidAmount)} · Agreed
          advance {money(b.AdvanceAmount)}
        </p>
        <p>
          Amount due now:{" "}
          {eligible
            ? money(
                mode === "advance"
                  ? Math.min(
                      Number(b.RemainingAmount),
                      Math.max(
                        0,
                        Number(b.AdvanceAmount) - Number(b.PaidAmount),
                      ),
                    )
                  : b.RemainingAmount,
              )
            : money(0)}{" "}
          · INR.
        </p>
        {eligible && (
          <>
            <label>
              Payment installment{" "}
              <select
                value={mode}
                disabled={stage === "processing" || stage === "pending"}
                onChange={(e) => {
                  setMode(e.target.value);
                  setCheckoutKey(crypto.randomUUID());
                }}
              >
                <option value="balance">Full outstanding balance</option>
                {Number(b.AdvanceAmount) > Number(b.PaidAmount) && (
                  <option value="advance">Agreed advance</option>
                )}
              </select>
            </label>
            <label className="cw-record-line">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />{" "}
              I have reviewed and accept the booking, cancellation and refund
              terms.
            </label>
          </>
        )}
        {r.data.policy.map((p, i) => (
          <p key={i}>
            <strong>{p.service}</strong>: {p.cancellation} {p.refund}
          </p>
        ))}
        {error && (
          <p role="alert">
            <AlertCircle size={16} />
            {error}
          </p>
        )}
        {!paid && (
          <div className="cw-detail-actions">
            <button
              className="cw-button cw-primary"
              onClick={pay}
              disabled={
                !eligible ||
                !termsAccepted ||
                !config.data?.enabled ||
                stage === "processing" ||
                stage === "pending"
              }
            >
              {stage === "processing"
                ? "Waiting for secure checkout…"
                : stage === "pending"
                  ? "Retry secure checkout"
                  : `Pay ${money(b.RemainingAmount)}`}
            </button>
            <button
              className="cw-button"
              disabled={stage === "processing"}
              onClick={async () => {
                try {
                  await save(`/bookings/${id}/payment-refresh`, "POST", {});
                  setStage("review");
                  setCheckoutKey(crypto.randomUUID());
                  setVersion((v) => v + 1);
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              Check server status
            </button>
          </div>
        )}
        {!eligible && !paid && (
          <p>
            Payment becomes available after vendor acceptance and while the
            booking is payable.
          </p>
        )}
        {!config.loading && !config.data?.enabled && !paid && (
          <p>
            Online payments are not configured. Contact support to arrange the
            next step.
          </p>
        )}
        {config.error && (
          <ErrorView error={config.error} retry={config.retry} />
        )}
      </section>
      <RefundRequest bookingId={id} />
    </>
  );
}
