import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ShieldCheck, Clock3, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight,
  CalendarDays, MapPin, Store, ReceiptText, LockKeyhole, RefreshCw,
  FileText, CreditCard, ChevronDown,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  useCustomerData,
  Loading,
  ErrorView,
} from "../components/WorkspaceUI";
import {
  money,
  date,
  save,
  customerRequest,
  download,
} from "../services/workspace.api";
import RefundRequest from "./CustomerRefunds";
import CustomerTransactionDetails from "./CustomerTransactionDetails";
import { checkout } from "../services/checkout";
import { paymentScreen, selectedPaymentMinor } from "../services/checkout-state";
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
    [customAmount, setCustomAmount] = useState(""),
    [checkoutKey, setCheckoutKey] = useState(() => crypto.randomUUID()),
    [paidBefore, setPaidBefore] = useState(null),
    [error, setError] = useState(""),
    [downloading, setDownloading] = useState(false);
  const r = useCustomerData(
      transaction ? `/payments/${id}` : `/bookings/${id}`,
      version,
    ),
    config = useCustomerData("/payments/config", version);
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
  if (transaction) {
    return (
      <CustomerTransactionDetails
        {...r}
        downloading={downloading}
        receiptError={error}
        onDownload={async () => {
          if (downloading) return;
          setDownloading(true);
          setError("");
          try {
            download(
              await customerRequest(`/payments/${id}/receipt`, { download: true }),
              "payment-receipt.txt",
            );
          } catch (e) {
            setError(e.message);
          } finally {
            setDownloading(false);
          }
        }}
      >
        {r.data?.payment?.bookingId && <RefundRequest bookingId={r.data.payment.bookingId} />}
      </CustomerTransactionDetails>
    );
  }
  if (r.loading && !r.data) return <Loading />;
  if (r.error) return <ErrorView error={r.error} retry={r.retry} />;
  const b = r.data.booking,
    paid = b.PaymentStatus === "Paid",
    eligible =
      ["Accepted", "PaymentPending", "Confirmed", "InProgress"].includes(
        b.BookingStatus,
      ) && Number(b.RemainingAmount) > 0;
  const screen = paymentScreen(b, stage);
  const remainingMinor = Math.round(Number(b.RemainingAmount) * 100);
  const amountMinor = selectedPaymentMinor(b, mode, customAmount);
  const validAmount = Number.isSafeInteger(amountMinor) && amountMinor >= 100 && amountMinor <= remainingMinor;
  async function pay() {
    if (!validAmount) return;
    setPaidBefore(Number(b.PaidAmount));
    setStage("processing");
    setError("");
    try {
      const result = await checkout(id, user, {
        mode,
        ...(mode === "custom" ? { customAmount } : {}),
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
      setStage(e.paymentPending ? "pending" : "failed");
      setVersion((v) => v + 1);
    }
  }
  const event = r.data.checkout?.event;
  const location = event?.location;
  const billingAddress = event?.billingAddress;
  const eventTime = (value) => String(value).includes("T")
    ? new Date(value).toISOString().slice(11, 16)
    : String(value).slice(0, 5);
  const title = screen === "success" ? "Payment verified"
    : screen === "processing" ? "Processing payment"
      : screen === "pending" ? "Checking payment status"
        : screen === "failed" ? "Payment attempt failed" : "Secure checkout";
  const StatusIcon = screen === "success" ? CheckCircle2
    : screen === "pending" || screen === "processing" ? Clock3
      : screen === "failed" ? AlertCircle : ShieldCheck;
  const notice = paid
    ? "Your payment has been verified by the server. Your booking remains subject to its current booking status."
    : stage === "verified"
      ? "Your installment was verified by the server. The remaining balance is shown below."
      : screen === "pending"
        ? "Payment is not yet confirmed by the server. If money was deducted, wait for provider verification before retrying. You can leave this page and return to your booking."
        : "Your payment details are handled by Razorpay. MarryNest does not store card information.";
  const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#365e49]";
  const control = `min-h-12 w-full min-w-0 rounded-xl border border-[#dce4dc] bg-white px-3.5 py-3 text-sm text-[#314b3d] transition-colors hover:border-[#8ca68d] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 ${focus}`;
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 font-sans text-sm leading-relaxed text-[#314b3d] sm:space-y-7">
      <Link className={`inline-flex min-h-9 items-center gap-2 rounded-md text-xs font-medium text-[#67786b] transition-colors hover:text-[#284e38] ${focus}`} to={`/customer/bookings/${id}`}>
        <ArrowLeft size={15} aria-hidden="true" /> Back to booking details
      </Link>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7e8e73]">Your celebration, beautifully planned</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#283f33] sm:text-[34px]">{title}</h1>
          <p className="mt-2 text-sm text-[#738073]">Review your booking and choose how you would like to pay.</p>
        </div>
        <Link className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#dce4dc] bg-white px-4 py-2.5 text-xs font-medium text-[#48644f] transition-colors hover:bg-[#edf3e9] ${focus}`} to="/customer/payments">
          <ReceiptText size={16} aria-hidden="true" /> Payment history and receipts <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </header>

      <div className={`flex items-start gap-3 rounded-2xl border p-4 sm:items-center sm:px-5 ${screen === "failed" ? "border-rose-200 bg-rose-50 text-rose-800" : screen === "pending" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-[#dce7d7] bg-[#edf4e9] text-[#45623d]"}`} role="status" aria-live="polite">
        <StatusIcon size={21} className="mt-0.5 shrink-0 sm:mt-0" aria-hidden="true" />
        <p className="text-xs leading-relaxed">{notice}</p>
      </div>

      <div className="grid min-w-0 items-start gap-6 min-[1200px]:grid-cols-[minmax(0,1fr)_390px] min-[1500px]:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-6">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e0e6dc] bg-white shadow-sm" aria-labelledby="booking-summary-title">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf0e9] px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f0f4ea] text-[#6d855a]"><CalendarDays size={20} aria-hidden="true" /></span>
                <div><h2 id="booking-summary-title" className="text-base font-semibold text-[#2d4435]">Booking summary</h2><p className="mt-0.5 break-all text-xs text-[#7b8679]">{b.BookingNumber}</p></div>
              </div>
              <div className="flex flex-wrap gap-2"><CheckoutStatus label="Booking" value={b.BookingStatus} /><CheckoutStatus label="Payment" value={b.PaymentStatus} /></div>
            </div>
            <div className="p-5 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#88937c]">Your celebration</p>
              <h3 className="mt-2 break-words text-xl font-semibold capitalize tracking-tight text-[#304935]">{event?.name || "Your booking"}</h3>
              <dl className="mt-5 grid gap-4 rounded-xl bg-[#f7f9f5] p-4 sm:grid-cols-2 sm:p-5">
                <div className="flex items-start gap-2.5"><CalendarDays size={16} className="mt-0.5 shrink-0 text-[#8a9a7d]" aria-hidden="true" /><div><dt className="text-[10px] font-medium uppercase tracking-wider text-[#85907d]">Event date</dt><dd className="mt-1 text-xs font-medium">{date(b.BookingDate)}</dd></div></div>
                {r.data.checkout?.vendor && <div className="flex items-start gap-2.5"><Store size={16} className="mt-0.5 shrink-0 text-[#8a9a7d]" aria-hidden="true" /><div className="min-w-0"><dt className="text-[10px] font-medium uppercase tracking-wider text-[#85907d]">Vendor</dt><dd className="mt-1 break-words text-xs font-medium">{r.data.checkout.vendor}</dd></div></div>}
                {(event?.city || event?.state) && <div className="flex items-start gap-2.5"><MapPin size={16} className="mt-0.5 shrink-0 text-[#8a9a7d]" aria-hidden="true" /><div><dt className="text-[10px] font-medium uppercase tracking-wider text-[#85907d]">Location</dt><dd className="mt-1 break-words text-xs font-medium">{[event.city, event.state].filter(Boolean).join(", ")}</dd></div></div>}
                {b.StartTime && <div className="flex items-start gap-2.5"><Clock3 size={16} className="mt-0.5 shrink-0 text-[#8a9a7d]" aria-hidden="true" /><div><dt className="text-[10px] font-medium uppercase tracking-wider text-[#85907d]">Event time</dt><dd className="mt-1 text-xs font-medium">{eventTime(b.StartTime)}{b.EndTime ? ` – ${eventTime(b.EndTime)}` : ""}<span className="ml-1 text-[10px] font-normal text-[#788573]">(Asia/Kolkata)</span></dd></div></div>}
              </dl>
            </div>
            <div className="mx-5 overflow-x-auto pb-2 sm:mx-7">
              <table className="w-full min-w-[480px] border-collapse text-left text-xs">
                <caption className="sr-only">Services and packages included in your booking</caption>
                <thead className="border-y border-[#e9eee4] bg-[#fafbf8] text-[10px] uppercase tracking-wider text-[#7a8872]"><tr><th scope="col" className="px-3 py-3 font-medium">Service / package</th><th scope="col" className="px-3 py-3 text-center font-medium">Quantity</th><th scope="col" className="px-3 py-3 text-right font-medium">Unit price</th><th scope="col" className="px-3 py-3 text-right font-medium">Total</th></tr></thead>
                <tbody className="divide-y divide-[#edf0e9]">
                  {r.data.items?.map((item) => <tr key={item.id}>
                    <td className="px-3 py-5 font-medium"><span className="block max-w-60 break-words capitalize">{item.name}</span>{item.packageId && <span className="mt-1 block text-[10px] font-normal text-[#8a9481]">Package</span>}</td>
                    <td className="px-3 py-5 text-center tabular-nums text-[#73806d]">{item.quantity}</td>
                    <td className="whitespace-nowrap px-3 py-5 text-right tabular-nums text-[#73806d]">{money(item.price)}</td>
                    <td className="whitespace-nowrap px-3 py-5 text-right font-semibold tabular-nums">{money(item.total)}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0e9] bg-[#fafbf8] px-5 py-4 sm:px-7"><span className="text-xs text-[#788570]">Booking total</span><span className="text-base font-semibold tabular-nums">{money(b.TotalAmount)}</span></div>
          </section>

          {location && <section className="rounded-2xl border border-[#e0e6dc] bg-white p-5 shadow-sm sm:p-7" aria-labelledby="checkout-location-title">
            <div className="mb-4 flex items-center gap-2.5"><MapPin size={18} className="text-[#859675]" aria-hidden="true" /><h2 id="checkout-location-title" className="text-base font-semibold">Agreed event location</h2></div>
            <p className="break-words text-sm text-[#5c6f5d]">{[location.venue, location.line1, location.city, location.state, location.postalCode, location.country].filter(Boolean).join(", ")}</p>
            {location.instructions && <p className="mt-2 whitespace-pre-line break-words text-xs text-[#7c8877]">{location.instructions}</p>}
            <p className="mt-3 text-xs text-[#7c8877]">This is the location agreed when this booking was created.</p>
            {billingAddress && <div className="mt-5 border-t border-[#edf0e9] pt-4"><h3 className="text-xs font-semibold">Billing address</h3><p className="mt-2 break-words text-xs text-[#7c8877]">{[billingAddress.line1, billingAddress.city, billingAddress.postalCode].filter(Boolean).join(", ")}</p></div>}
          </section>}

          <section className="rounded-2xl border border-[#e0e6dc] bg-white p-5 shadow-sm sm:p-7" aria-labelledby="checkout-terms-title">
            <div className="flex items-center gap-2.5"><FileText size={18} className="text-[#859675]" aria-hidden="true" /><h2 id="checkout-terms-title" className="text-base font-semibold">Cancellation & refund terms</h2></div>
            <p className="mt-2 text-xs leading-relaxed text-[#7b8776]">Please review the agreed policies before completing your payment.</p>
            <div className="mt-5 space-y-3">
              {r.data.policy.map((p, i) => <div key={i} className="rounded-xl border border-[#e9ede4] bg-[#fafbf8] p-4"><h3 className="break-words text-xs font-semibold capitalize">{p.service}</h3><p className="mt-2 whitespace-pre-line break-words text-xs leading-6 text-[#72806a]">{p.cancellation} {p.refund}</p></div>)}
            </div>
          </section>
        </div>

        <aside className="min-w-0 rounded-2xl border border-[#dce4d6] bg-white shadow-sm min-[1200px]:sticky min-[1200px]:top-6" aria-labelledby="payment-summary-title">
          <div className="flex items-center gap-3 border-b border-[#e7eddf] bg-[#f2f6ed] px-5 py-5 sm:px-6 rounded-t-2xl"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#e0e8d8] bg-white text-[#6a8356]"><CreditCard size={20} aria-hidden="true" /></span><div><h2 id="payment-summary-title" className="text-base font-semibold">Payment summary</h2><p className="mt-0.5 text-[11px] text-[#859178]">All amounts are in INR</p></div></div>
          <div className="space-y-5 p-5 sm:p-6">
            <dl className="space-y-3 text-xs">
              {[["Subtotal", b.SubTotal], ["Discounts", b.DiscountAmount], ["Tax", b.TaxAmount], ["Platform fees", b.PlatformFee]].map(([label, value]) => <div key={label} className="flex items-baseline justify-between gap-3"><dt className="text-[#7c8974]">{label}</dt><dd className="text-right font-medium tabular-nums">{label === "Discounts" && Number(value) > 0 ? "−" : ""}{money(value)}</dd></div>)}
              <div className="flex items-baseline justify-between gap-3 border-t border-[#e8eddf] pt-3 text-sm font-semibold"><dt>Booking total</dt><dd className="text-right tabular-nums">{money(b.TotalAmount)}</dd></div>
              <div className="flex items-baseline justify-between gap-3"><dt className="text-[#7c8974]">Already paid</dt><dd className="text-right font-medium tabular-nums text-[#5c7f49]">{money(b.PaidAmount)}</dd></div>
              <div className="flex items-baseline justify-between gap-3"><dt className="text-[#7c8974]">Agreed advance</dt><dd className="text-right font-medium tabular-nums">{money(b.AdvanceAmount)}</dd></div>
            </dl>
            <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-[#f5f7f0] px-4 py-3"><span className="text-xs text-[#77876a]">Outstanding balance</span><span className="text-base font-semibold tabular-nums">{money(b.RemainingAmount)}</span></div>

            {eligible && <div className="space-y-4">
              <label className="block"><span className="mb-2 block text-xs font-semibold">Payment installment</span><span className="relative block"><select className={`${control} appearance-none pr-10`} value={mode} disabled={stage === "processing" || stage === "pending"} onChange={(e) => { setMode(e.target.value); setError(""); setCheckoutKey(crypto.randomUUID()); }}>
                {[10, 25, 50, 75].map((percent) => <option key={percent} value={String(percent)}>{percent}% of outstanding balance</option>)}
                <option value="balance">100% — Full outstanding balance</option><option value="custom">Custom amount</option>
                {Number(b.AdvanceAmount) > Number(b.PaidAmount) && <option value="advance">Agreed advance</option>}
              </select><ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8a997e]" aria-hidden="true" /></span></label>
              {mode === "custom" && <label className="block text-xs font-semibold">Custom payment amount (₹)<input className={`${control} mt-2`} type="number" min="1" max={b.RemainingAmount} step="0.01" inputMode="decimal" value={customAmount} disabled={stage === "processing" || stage === "pending"} onChange={(e) => { setCustomAmount(e.target.value); setCheckoutKey(crypto.randomUUID()); setError(""); }} aria-describedby="custom-payment-help" /><span id="custom-payment-help" className="mt-2 block text-[11px] font-normal text-[#7d8b73]">Enter ₹1.00 to {money(b.RemainingAmount)}.</span></label>}
            </div>}

            <div className="border-y border-dashed border-[#dce4d4] py-5"><p className="text-xs font-medium text-[#7b886e]">Amount due now</p><p className="mt-1 break-words text-3xl font-semibold tracking-tight text-[#2f5038] tabular-nums">{money(eligible && validAmount ? amountMinor / 100 : 0)}</p><p className="mt-1 text-[10px] text-[#8a957e]">{paid ? "This booking has been paid in full." : "Based on your selected payment installment."}</p></div>

            {eligible && <label className="flex cursor-pointer items-start gap-3 rounded-lg text-xs leading-6 text-[#718068]"><input className={`mt-1 size-4 shrink-0 cursor-pointer rounded border-[#bfccb5] accent-[#365e49] ${focus}`} type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} /><span>I have reviewed and accept the <a href="#checkout-terms-title" className={`rounded-sm font-medium text-[#365e49] underline decoration-[#a4b89a] underline-offset-2 ${focus}`}>booking, cancellation and refund terms</a>.</span></label>}
            {error && <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800" role="alert"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{error}</p>}
            {!paid && <div className="space-y-2">
              <button className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#365e49] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#284c38] disabled:cursor-not-allowed disabled:bg-[#dce5d7] disabled:text-[#788970] disabled:shadow-none ${focus}`} onClick={pay} disabled={!eligible || !validAmount || !termsAccepted || !config.data?.enabled || stage === "processing" || stage === "pending"}>
                {stage === "processing" ? <Clock3 size={16} aria-hidden="true" /> : <LockKeyhole size={16} aria-hidden="true" />}
                {stage === "processing" ? "Waiting for secure checkout…" : stage === "pending" ? "Retry secure checkout" : `Pay ${money(validAmount ? amountMinor / 100 : 0)}`}
                {stage !== "processing" && <ArrowRight size={16} className="shrink-0" aria-hidden="true" />}
              </button>
              {eligible && !termsAccepted && <p className="text-center text-[10px] leading-5 text-[#89957e]">Accept the terms above to continue to payment.</p>}
              <button className={`flex min-h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-medium text-[#6f8065] transition-colors hover:bg-[#f2f6ed] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`} disabled={stage === "processing"} onClick={async () => { try { await save(`/bookings/${id}/payment-refresh`, "POST", {}); setStage("review"); setCheckoutKey(crypto.randomUUID()); setVersion((v) => v + 1); } catch (e) { setError(e.message); } }}><RefreshCw size={13} aria-hidden="true" />Check server status</button>
            </div>}
            {!eligible && !paid && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Payment becomes available after vendor acceptance and while the booking is payable.</p>}
            {!config.loading && !config.error && !config.data?.enabled && !paid && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Online payments are not configured. Contact support to arrange the next step.</p>}
            {config.error && <ErrorView error={config.error} retry={config.retry} />}
          </div>
          <div className="flex items-center justify-center gap-2 rounded-b-2xl border-t border-[#edf0e7] bg-[#fafbf8] px-4 py-4 text-[10px] text-[#8a967f]"><ShieldCheck size={14} aria-hidden="true" /><span>Secure checkout powered by <span className="font-semibold text-[#66765c]">Razorpay</span></span></div>
        </aside>
      </div>
      <RefundRequest bookingId={id} />
    </div>
  );
}

function CheckoutStatus({ label, value }) {
  const tone = ["Paid", "Confirmed", "Accepted", "Completed", "InProgress"].includes(value)
    ? "border-[#d9e6ce] bg-[#edf5e7] text-[#54743f]"
    : ["Failed", "Cancelled", "Rejected"].includes(value)
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-amber-200/60 bg-[#fbf6e8] text-[#977123]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${tone}`}><span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" /><span className="sr-only">{label}: </span>{String(value || "Unknown").replace(/([a-z])([A-Z])/g, "$1 $2")}</span>;
}
