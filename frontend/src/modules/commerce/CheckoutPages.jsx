import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ShieldCheck, ShoppingBag, CalendarDays, ArrowLeft, ArrowRight, Check, MapPin, Package, ReceiptText, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  useCustomerData,
  Loading,
  ErrorView,
} from "../customer/components/WorkspaceUI";
import {
  customerRequest,
  save,
  money,
} from "../customer/services/workspace.api";
import { loadCheckout } from "../customer/services/checkout-loader";
import { offerState } from "./offer-state";
import CartItem from "./CartItem";
import "./commerce.css";

function AddressPicker({ value, onChange, optional = false, disabled = false, className = "", selectClassName = "", linkClassName = "" }) {
  const state = useCustomerData("/addresses?pageSize=50");
  return (
    <label className={className}>
      {optional ? "Booking address (optional)" : "Shipping / billing address"}
      {state.loading ? (
        <span role="status">Loading addresses…</span>
      ) : state.error ? (
        <ErrorView error={state.error} retry={state.retry} />
      ) : (
        <select
          className={selectClassName}
          disabled={disabled}
          required={!optional}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">
            {optional ? "No address required" : "Choose your address"}
          </option>
          {(state.data?.rows || state.data || []).map((a) => (
            <option key={a.id || a.AddressId} value={a.id || a.AddressId}>
              {a.fullName || a.name || a.FullName} ·{" "}
              {a.line1 || a.addressLine1 || a.address || a.AddressLine1} ·{" "}
              {a.city || a.City}
            </option>
          ))}
        </select>
      )}
      <Link className={linkClassName} to="/customer/addresses">Manage addresses</Link>
    </label>
  );
}
function CustomerLabel({ className = "" }) {
  const { user } = useAuth();
  return (
    <p className={className}>
      {[user.firstName, user.lastName].filter(Boolean).join(" ")} · {user.email}{" "}
      · {user.phone || ""}
    </p>
  );
}
function Totals({ data }) {
  return (
    <>
      <div className="commerce-line">
        <span>Subtotal</span>
        <span>{money(data.subtotal)}</span>
      </div>
      {data.shipping != null && (
        <div className="commerce-line">
          <span>Delivery charges</span>
          <span>{money(data.shipping)}</span>
        </div>
      )}
      <div className="commerce-line">
        <span>Tax</span>
        <span>{money(data.tax)}</span>
      </div>
      <p className="commerce-total">Total {money(data.total)}</p>
    </>
  );
}
export function BookingCheckout() {
  const { id } = useParams();
  return <BookingForm key={id} id={id} />;
}
function BookingForm({ id }) {
  const service = useCustomerData(`/services/${id}`),
    [body, setBody] = useState({
      serviceId: id,
      quantity: 1,
      instructions: "",
      idempotencyKey: crypto.randomUUID(),
    }),
    [preview, setPreview] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [accepted, setAccepted] = useState(false),
    [success, setSuccess] = useState(null);
  const set = (key, value) => {
    setBody((b) => ({ ...b, [key]: value || undefined }));
    setPreview(null);
    setAccepted(false);
    setError("");
  };
  useEffect(() => {
    if (service.data?.service.offer?.book)
      setBody((b) => ({
        ...b,
        quantity: service.data.service.offer.book.minimum,
      }));
  }, [service.data]);
  if (service.loading) return <Loading />;
  if (service.error)
    return <ErrorView error={service.error} retry={service.retry} />;
  const item = service.data.service,
    book = item.offer?.book;
  if (!book || !offerState(item).canBook)
    return (
      <div className="commerce-page">
        <h1>Booking unavailable</h1>
        <Link to={`/services/${id}`}>Return to listing</Link>
      </div>
    );
  async function review(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setPreview(await save("/booking-checkout/preview", "POST", body));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      setSuccess(
        await save("/booking-checkout", "POST", {
          ...body,
          reviewToken: preview.reviewToken,
          termsAccepted: accepted,
        }),
      );
    } catch (e) {
      setError(e.message);
      setPreview(null);
      setAccepted(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="commerce commerce-page">
      <Link to={`/services/${id}`}>← Back to {item.name}</Link>
      <h1>
        <CalendarDays className="inline" /> Booking Checkout
      </h1>
      {success ? (
        <section className="commerce-panel commerce-success" role="status">
          <h2>Booking requested · {success.number}</h2>
          <p>
            Your booking availability is reserved. The vendor will review your
            request before payment.
          </p>
          <Link
            className="commerce-button primary"
            to={`/customer/bookings/${success.id}`}
          >
            View booking and payment status
          </Link>
        </section>
      ) : (
        <div className="commerce-summary">
          <section className="commerce-panel">
            <h2>{item.name}</h2>
            <p>By {item.vendor}</p>
            <p>
              Booking Price <strong>{money(book.price)}</strong> per unit /{" "}
              {book.duration.toLowerCase()} duration
            </p>
            <p>{book.instructions}</p>
            <CustomerLabel />
            <form onSubmit={review}>
              <div className="commerce-grid">
                <label>
                  Booking Quantity
                  <input
                    type="number"
                    required
                    min={book.minimum}
                    max={book.maximum}
                    step={1}
                    value={body.quantity}
                    onChange={(e) => set("quantity", Number(e.target.value))}
                  />
                </label>
                {book.mode === "Scheduled" && (
                  <>
                    <label>
                      Booking Date
                      <input
                        type="date"
                        required
                        min={
                          book.startDate >
                          new Date().toLocaleDateString("en-CA", {
                            timeZone: "Asia/Kolkata",
                          })
                            ? book.startDate
                            : new Date().toLocaleDateString("en-CA", {
                                timeZone: "Asia/Kolkata",
                              })
                        }
                        max={book.endDate || undefined}
                        value={body.date || ""}
                        onChange={(e) => set("date", e.target.value)}
                      />
                    </label>
                    {book.slots.length ? (
                      <label>
                        Booking Time Slot
                        <select
                          required
                          value={body.start || ""}
                          onChange={(e) => set("start", e.target.value)}
                        >
                          <option value="">Choose a time slot</option>
                          {book.slots.map((s) => (
                            <option key={s.start} value={s.start}>
                              {s.start}–{s.end}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : book.duration === "Hourly" ||
                      book.duration === "Custom" ? (
                      <label>
                        Start Time
                        <input
                          required
                          type="time"
                          value={body.start || ""}
                          onChange={(e) => set("start", e.target.value)}
                        />
                      </label>
                    ) : null}
                  </>
                )}
                <label>
                  Booking Duration
                  <input
                    readOnly
                    value={
                      book.duration === "Custom"
                        ? `${book.durationMinutes} minutes`
                        : book.duration
                    }
                  />
                </label>
              </div>
              <div className="my-5">
                <AddressPicker
                  optional
                  value={body.addressId || ""}
                  onChange={(v) => set("addressId", v)}
                />
              </div>
              <label>
                Special Instructions
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={body.instructions || ""}
                  onChange={(e) => set("instructions", e.target.value)}
                />
              </label>
              <div className="commerce-actions">
                <button className="primary" disabled={busy}>
                  {busy
                    ? "Checking availability…"
                    : "Check availability & review"}
                </button>
              </div>
            </form>
          </section>
          <aside className="commerce-panel">
            <h2>Booking Summary</h2>
            {preview ? (
              <>
                <p>
                  {preview.quantity} × {money(preview.price)}
                </p>
                <p>
                  {preview.date || "Quantity reservation"} {preview.start || ""}{" "}
                  · {preview.duration}
                </p>
                {preview.startsAt && (
                  <p>
                    Reserved from {preview.startsAt.replace("T", " ")} to{" "}
                    {preview.endsAt.replace("T", " ")} (India time)
                  </p>
                )}
                <p>{preview.remaining} available before this request</p>
                <Totals data={preview} />
                <p>
                  Advance available: {money(preview.advance)}. The remaining
                  balance is tracked in My Bookings.
                </p>
                <p>
                  After vendor confirmation, choose advance or full payment
                  using the existing payment methods.
                </p>
                <h3>Cancellation Policy</h3>
                <p>{preview.terms.cancellation}</p>
                <h3>Refund Policy</h3>
                <p>{preview.terms.refund}</p>
                <label className="commerce-check">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                  />
                  I accept the cancellation and refund policies.
                </label>
                <button
                  className="primary"
                  disabled={busy || !accepted}
                  onClick={confirm}
                >
                  {busy ? "Reserving…" : "Confirm booking request"}
                </button>
              </>
            ) : (
              <p>
                Review the current price and availability before confirming your
                reservation.
              </p>
            )}
            <p>
              <ShieldCheck className="inline" size={16} /> Availability and
              prices are verified by the server.
            </p>
          </aside>
        </div>
      )}
      {error && (
        <p className="commerce-error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
export function CartCheckout() {
  const navigate = useNavigate(),
    [params, setParams] = useSearchParams(),
    [version, setVersion] = useState(0),
    state = useCustomerData("/cart", version),
    [addressId, setAddress] = useState(""),
    [preview, setPreview] = useState(null),
    [accepted, setAccepted] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    changing = useRef(false),
    key = useRef(crypto.randomUUID()),
    adding = useRef(null);
  useEffect(() => {
    const serviceId = params.get("service");
    if (!serviceId || adding.current === serviceId) return;
    adding.current = serviceId;
    setBusy(true);
    customerRequest(`/services/${serviceId}`)
      .then((d) =>
        save("/cart/items", "PUT", {
          serviceId,
          quantity: d.service.offer?.sell?.minimum || 1,
        }),
      )
      .then(() => {
        setParams({}, { replace: true });
        setVersion((v) => v + 1);
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, [params, setParams]);
  function reset() {
    setPreview(null);
    setAccepted(false);
    key.current = crypto.randomUUID();
  }
  async function mutate(path, method, body) {
    if (changing.current) return;
    changing.current = true;
    setBusy(true);
    setError("");
    reset();
    try {
      await save(path, method, body);
      setVersion((v) => v + 1);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      changing.current = false;
      setBusy(false);
    }
  }
  async function review(e) {
    e.preventDefault();
    if (changing.current || busy || state.loading || !addressId || blocked) return;
    setBusy(true);
    setError("");
    setPreview(null);
    setAccepted(false);
    try {
      setPreview(
        await save("/cart/preview", "POST", {
          addressId,
          idempotencyKey: key.current,
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!preview || !accepted || busy || state.loading) return;
    setBusy(true);
    setError("");
    try {
      const r = await save("/orders", "POST", {
        addressId,
        idempotencyKey: key.current,
        reviewToken: preview.reviewToken,
        termsAccepted: accepted,
      });
      navigate(`/customer/orders/${r.id}`);
    } catch (e) {
      setError(e.message);
      setPreview(null);
      setAccepted(false);
    } finally {
      setBusy(false);
    }
  }
  if (state.loading && !state.data) return <Loading />;
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  const lines = state.data.lines || [];
  const pending = busy || state.loading;
  const quantity = lines.reduce((sum, line) => sum + Number(line.quantity), 0);
  const subtotal = state.data.subtotal ?? lines.reduce(
    (sum, line) => sum + Math.round(Number(line.price) * 100) * Number(line.quantity), 0,
  ) / 100;
  const blocked = lines.some((line) => line.unavailable) || !!state.data.checkoutError;
  return (
    <div className="mx-auto min-w-0 max-w-[1240px] pt-[6px] pb-9 text-[#463b3d] max-[520px]:pt-0 max-[520px]:pb-6 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-[#a67687] [&_:focus-visible]:outline-offset-[3px]">
      <Link className="inline-flex items-center gap-[7px] text-xs text-[#827477] hover:text-[#8c414e]!" to="/services">
        <ArrowLeft size={14} /> Continue shopping
      </Link>
      <header className="mt-[29px] mb-[25px] flex items-center justify-between gap-5 max-[520px]:mt-[22px] max-[520px]:flex-col max-[520px]:items-start max-[520px]:gap-4">
        <div>
          <span className="text-[9px] font-semibold tracking-[1.8px] text-[#a17c69] max-[520px]:text-[8px] max-[520px]:tracking-[1.2px]">A LITTLE CLOSER TO YOUR CELEBRATION</span>
          <h1 className="mt-[6px] mb-2 flex items-center gap-[13px] text-[38px]! max-[520px]:text-[32px]!">
            Your cart <span className="inline-grid h-7 min-w-7 place-items-center rounded-full border border-[#ead8db] bg-[#f7edef] px-[7px] font-[Inter,'Segoe_UI',sans-serif] text-xs leading-none font-medium tracking-normal text-[#8c414e]">{quantity}</span>
          </h1>
          <p className="m-0 text-[13px] text-[#827477]!">Everything you love, ready for your big day.</p>
        </div>
        <Link className="inline-flex shrink-0 items-center justify-center gap-[9px] rounded-[7px] border border-[#eae2de] bg-[#fffdfa] px-[15px] py-[10px] text-xs text-[#463b3d] hover:text-[#8c414e]!" to="/customer/orders">
          <ReceiptText size={16} /> My Orders <ArrowRight size={14} />
        </Link>
      </header>
      {!!lines.length && (
        <ol className="m-0 mb-[26px] flex list-none items-center justify-center gap-[30px] rounded-[9px] border border-[#eae2de] bg-[#f4eeeb] px-5 py-[17px] max-[520px]:justify-between max-[520px]:gap-2 max-[520px]:px-3 max-[520px]:py-[14px]" aria-label="Checkout progress">
          <li className="flex items-center gap-[9px] text-[11px] whitespace-nowrap text-[#8c414e] max-[520px]:flex-col max-[520px]:gap-[6px] max-[520px]:text-[9px]">
            <span className="grid size-[25px] place-items-center rounded-full border border-[#8c414e] bg-[#8c414e] text-[10px] text-white"><Check size={14} /></span>Your cart
          </li>
          <li className="flex items-center gap-[9px] text-[11px] whitespace-nowrap text-[#8c414e] before:mr-5 before:h-px before:w-12 before:bg-[#d9cbc8] before:content-[''] max-[520px]:flex-col max-[520px]:gap-[6px] max-[520px]:text-[9px] max-[520px]:before:hidden" aria-current={!addressId ? "step" : undefined}>
            <span className={`grid size-[25px] place-items-center rounded-full border border-[#8c414e] text-[10px] ${addressId ? "bg-[#8c414e] text-white" : "bg-[#fffdfa]"}`}>{addressId ? <Check size={14} /> : "2"}</span>Delivery details
          </li>
          <li className={`flex items-center gap-[9px] text-[11px] whitespace-nowrap before:mr-5 before:h-px before:w-12 before:bg-[#d9cbc8] before:content-[''] max-[520px]:flex-col max-[520px]:gap-[6px] max-[520px]:text-[9px] max-[520px]:before:hidden ${addressId ? "text-[#8c414e]" : "text-[#827477]"}`} aria-current={addressId ? "step" : undefined}>
            <span className={`grid size-[25px] place-items-center rounded-full border text-[10px] ${addressId ? "border-[#8c414e] bg-[#fffdfa]" : "border-[#d9cbc8]"}`}>3</span>Review & pay
          </li>
        </ol>
      )}
      {error && <p role="alert" className="my-3 rounded-lg bg-[#fff0eb] p-[13px] text-[13px] whitespace-pre-wrap text-[#994a42]!">{error}</p>}
      {state.data.checkoutError && <p role="alert" className="my-3 rounded-lg bg-[#fff0eb] p-[13px] text-[13px] whitespace-pre-wrap text-[#994a42]!">{state.data.checkoutError}</p>}
      {!lines.length ? (
        <section className="flex flex-col items-center gap-[15px] rounded-xl border border-[#eae2de] bg-[#fffdfa] px-6 py-16 text-center max-[520px]:px-[18px] max-[520px]:py-11">
          <span className="mb-[10px] grid size-[85px] place-items-center rounded-full bg-[#f6eaec] text-[#b2838d]"><ShoppingBag size={36} strokeWidth={1.3} /></span>
          <span className="text-[9px] font-semibold tracking-[1.8px] text-[#a17c69] max-[520px]:text-[8px] max-[520px]:tracking-[1.2px]">MAKE IT A CELEBRATION</span>
          <h2 className="m-0 text-[30px]!">Your cart is empty</h2>
          <p className="m-0 mb-2 max-w-[340px] text-[13px] text-[#827477]!">Discover the finishing touches for your celebration and keep your favourites here.</p>
          <Link className="inline-flex items-center justify-center gap-[7px] rounded-[7px] border border-[#8c414e] bg-[#8c414e] px-[18px] py-[11px] text-[13px] text-white hover:border-[#74333f] hover:bg-[#74333f] hover:text-white!" to="/services">Explore the marketplace <ArrowRight size={16} /></Link>
          <Link className="inline-flex items-center gap-[7px] text-xs text-[#827477] hover:text-[#8c414e]!" to="/customer/orders">Looking for a purchase? View your orders</Link>
        </section>
      ) : (
        <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(290px,1fr)] items-start gap-6 max-[1100px]:grid-cols-[minmax(0,1fr)]" aria-busy={pending}>
          <form id="cart-checkout" className="grid min-w-0 gap-[22px]" onSubmit={review}>
            <section className="min-w-0 rounded-xl border border-[#eae2de] bg-white shadow-[0_3px_18px_#51363e04]" aria-labelledby="cart-items-title">
              <header className="flex items-center justify-between gap-3 border-b border-[#f0e9e4] px-6 py-[21px] max-[520px]:gap-2 max-[520px]:px-4 max-[520px]:py-[18px]">
                <div className="flex min-w-0 items-center gap-[10px]"><ShoppingBag size={18} className="shrink-0 text-[#a57c85]" /><h2 id="cart-items-title" className="m-0 text-[22px]! tracking-[-.5px] max-[520px]:text-xl!">Your selection</h2></div>
                <span className="shrink-0 text-[10px] text-[#827477] max-[520px]:text-[9px]">{lines.length} {lines.length === 1 ? "product" : "products"}</span>
              </header>
              <ul className="m-0 list-none px-6 max-[520px]:px-4">
                {lines.map((line) => <CartItem key={line.id} line={line} disabled={pending}
                  onEdit={reset}
                  onUpdate={(quantity) => mutate("/cart/items", "PUT", { serviceId: line.id, quantity })}
                  onRemove={() => {
                    if (window.confirm(`Remove ${line.name} from your cart?`)) mutate(`/cart/items/${line.id}`, "DELETE");
                  }} />)}
              </ul>
              <footer className="flex items-center gap-2 rounded-b-xl border-t border-[#f0e9e4] bg-[#fdfaf7] px-6 py-[13px] text-[10px] text-[#827477] max-[520px]:px-4 max-[520px]:py-3"><Package size={15} className="shrink-0 text-[#b1967a]" /> Buying for your celebration? Check quantities before you review.</footer>
            </section>
            <section className="min-w-0 rounded-xl border border-[#eae2de] bg-white shadow-[0_3px_18px_#51363e04]" aria-labelledby="cart-delivery-title">
              <header className="flex items-center justify-between gap-3 border-b border-[#f0e9e4] px-6 py-[21px] max-[520px]:gap-2 max-[520px]:px-4 max-[520px]:py-[18px]">
                <div className="flex min-w-0 items-center gap-[10px]"><MapPin size={18} className="shrink-0 text-[#a57c85]" /><h2 id="cart-delivery-title" className="m-0 text-[22px]! tracking-[-.5px] max-[520px]:text-xl!">Delivery details</h2></div>
                <span className={`inline-flex shrink-0 items-center gap-1 text-[10px] max-[520px]:text-[9px] ${addressId ? "text-[#55745c]" : "text-[#827477]"}`}>{addressId ? <><Check size={12} /> Address selected</> : "Required"}</span>
              </header>
              <div className="px-6 py-[23px] max-[520px]:px-4 max-[520px]:py-[19px]">
                <div className="mb-5 flex items-start gap-[11px] rounded-lg border border-[#f0e9e4] bg-[#fdfaf8] p-[14px]">
                  <UserRound size={18} className="mt-[3px] shrink-0 text-[#a57c85]" />
                  <div className="min-w-0"><span className="text-[10px] font-semibold">Customer details</span><CustomerLabel className="mt-1 mb-0 text-[11px]! text-[#827477]! [overflow-wrap:anywhere]" /></div>
                </div>
                <AddressPicker disabled={pending} className="flex flex-col gap-[10px] text-[11px]"
                  selectClassName="min-h-[45px] w-full min-w-0 rounded-[7px] border border-[#e5d9d9]! bg-white px-3 py-[11px] text-xs font-[inherit]"
                  linkClassName="self-start text-[11px] text-[#8c414e] underline underline-offset-[3px] hover:text-[#8c414e]!"
                  value={addressId} onChange={(v) => { setAddress(v); reset(); setError(""); }} />
                <p className="mt-[9px] mb-0 text-[10px]! text-[#827477]!">Choose a saved address, or add a new one in Manage addresses.</p>
              </div>
            </section>
          </form>
          <aside className="sticky top-[106px] min-w-0 rounded-xl border border-[#eae2de] bg-white shadow-[0_3px_18px_#51363e04] max-[1100px]:static" aria-labelledby="cart-summary-title">
            <header className="flex items-center gap-3 border-b border-[#f0e9e4] px-6 py-[21px] max-[520px]:gap-2 max-[520px]:px-4 max-[520px]:py-[18px]">
              <ReceiptText size={18} className="shrink-0 text-[#a57c85]" /><h2 id="cart-summary-title" className="m-0 text-[22px]! tracking-[-.5px] max-[520px]:text-xl!">Purchase summary</h2>
            </header>
            <div className="px-6 py-[23px] max-[520px]:px-4 max-[520px]:py-[19px]">
              <p className="m-0 mb-[17px] text-[11px]! text-[#827477]!">{quantity} {quantity === 1 ? "item" : "items"} for your celebration</p>
              <dl className="m-0">
                <div className="mb-[14px] flex items-baseline justify-between gap-[14px] text-xs"><dt className="text-[#78696e]">Items subtotal</dt><dd className="m-0 text-right font-medium whitespace-nowrap tabular-nums">{money(preview ? preview.subtotal : subtotal)}</dd></div>
                <div className="mb-[14px] flex items-baseline justify-between gap-[14px] text-xs"><dt className="text-[#78696e]">Delivery charges</dt><dd className="m-0 text-right font-medium whitespace-nowrap tabular-nums">{preview ? Number(preview.shipping) === 0 ? <span className="text-[#55745c]">Free</span> : money(preview.shipping) : <span className="text-[10px] font-normal text-[#827477]">At review</span>}</dd></div>
                <div className="mb-[14px] flex items-baseline justify-between gap-[14px] text-xs"><dt className="text-[#78696e]">Tax</dt><dd className="m-0 text-right font-medium whitespace-nowrap tabular-nums">{preview ? money(preview.tax) : <span className="text-[10px] font-normal text-[#827477]">At review</span>}</dd></div>
                {Number(preview?.discount) > 0 && <div className="mb-[14px] flex items-baseline justify-between gap-[14px] text-xs"><dt className="text-[#78696e]">Discount</dt><dd className="m-0 text-right font-medium whitespace-nowrap text-[#55745c] tabular-nums">-{money(preview.discount)}</dd></div>}
                <div className="mt-[22px] flex items-baseline justify-between gap-[14px] border-t border-[#eae2de] pt-[18px]"><dt className="text-sm font-semibold">{preview ? "Total to pay" : "Items total"}</dt><dd className="m-0 text-right text-[23px] font-semibold whitespace-nowrap text-[#8c414e] tabular-nums">{money(preview ? preview.total : subtotal)}</dd></div>
              </dl>
              {preview ? (
                <>
                  <div className="mt-5 flex gap-[10px] rounded-lg bg-[#faf4f2] p-[13px]">
                    <MapPin size={16} className="mt-[3px] shrink-0 text-[#8c414e]" />
                    <div><strong className="text-[11px] font-medium">Delivering to {preview.address.fullName}</strong><p className="mt-1 mb-0 text-[11px]! text-[#827477]! [overflow-wrap:anywhere]">{[preview.address.line1, preview.address.line2, preview.address.city, preview.address.state, preview.address.postalCode].filter(Boolean).join(", ")}</p></div>
                  </div>
                  <label className="my-5 flex items-start gap-2 text-[11px]">
                    <input type="checkbox" className="mt-[2px] size-4 shrink-0 accent-[#8c414e]" disabled={pending} checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                    I have reviewed the order and delivery details.
                  </label>
                  <button type="button" className="flex min-h-[46px] w-full items-center justify-center gap-[10px] rounded-[7px] border border-[#8c414e] bg-[#8c414e] px-[18px] py-[11px] text-xs font-medium text-white enabled:hover:border-[#74333f] enabled:hover:bg-[#74333f] disabled:cursor-not-allowed disabled:opacity-45" disabled={pending || !accepted || blocked} onClick={confirm}>
                    {busy ? "Creating order..." : "Continue to payment"} <ArrowRight size={16} />
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-3 mb-5 text-[10px]! text-[#827477]!">Delivery charges and tax will be confirmed when you review your order.</p>
                  <button className="flex min-h-[46px] w-full items-center justify-center gap-[10px] rounded-[7px] border border-[#8c414e] bg-[#8c414e] px-[18px] py-[11px] text-xs font-medium text-white enabled:hover:border-[#74333f] enabled:hover:bg-[#74333f] disabled:cursor-not-allowed disabled:opacity-45" type="submit" form="cart-checkout" disabled={pending || !addressId || blocked}>
                    {pending ? "Updating..." : "Review order"} <ArrowRight size={16} />
                  </button>
                  <p className="mt-[10px] mb-0 text-center text-[10px]! text-[#827477]!" role="status">{blocked ? "Update unavailable quantities or remove items to continue." : !addressId ? "Select a delivery address to continue." : "Ready to review your order and delivery details."}</p>
                </>
              )}
              <div className="mt-[22px] flex items-start gap-[10px] border-t border-[#f0e9e4] pt-4">
                <ShieldCheck size={18} className="mt-[2px] shrink-0 text-[#a17c69]" /><div><strong className="text-[11px] font-medium">Review before you pay</strong><p className="mt-1 mb-0 text-[10px]! text-[#827477]!">You can check your final total before continuing to payment.</p></div>
              </div>
              <p className="mt-[15px] mb-0 text-[10px]! text-[#827477]!">Service bookings are managed separately in <Link className="text-[#8c414e] underline underline-offset-2 hover:text-[#8c414e]!" to="/customer/bookings">My Bookings</Link>.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

async function payOrder(id, user) {
  await loadCheckout();
  const order = await save(`/orders/${id}/payment-order`, "POST", {});
  if (order.alreadyPaid) return order;
  return new Promise((resolve, reject) => {
    let verifying = false;
    const instance = new window.Razorpay({
      key: order.key,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "MarryNest",
      description: order.number,
      prefill: {
        name: [user.firstName, user.lastName].filter(Boolean).join(" "),
        email: user.email,
        contact: user.phone || "",
      },
      theme: { color: "#355d43" },
      handler: async (result) => {
        verifying = true;
        try {
          resolve(
            await save("/order-payments/verify", "POST", {
              razorpay_order_id: result.razorpay_order_id,
              razorpay_payment_id: result.razorpay_payment_id,
              razorpay_signature: result.razorpay_signature,
            }),
          );
        } catch (e) {
          reject(e);
        }
      },
      modal: {
        ondismiss: () => {
          if (!verifying) resolve({ closed: true });
        },
      },
    });
    instance.on("payment.failed", () =>
      reject(
        new Error("Payment did not complete. Retry or check server status."),
      ),
    );
    instance.open();
  });
}
export function PurchaseOrder() {
  const { id } = useParams(),
    { user, notify } = useAuth(),
    navigate = useNavigate(),
    [version, setVersion] = useState(0),
    state = useCustomerData(`/orders/${id}`, version),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function action(pay) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = pay
        ? await payOrder(id, user)
        : await save(`/orders/${id}/payment-refresh`, "POST", {});
      const currentOrder = await customerRequest(`/orders/${id}`);
      if (currentOrder.paymentStatus === "Paid") {
        notify("Payment verified. Your purchase is confirmed.");
        navigate("/customer/orders", { replace: true });
        return;
      }
      setNotice(
        r.closed
          ? "Checkout closed. Check server status if money was deducted."
          : r.message || "Payment status checked.",
      );
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  const d = state.data;
  return (
    <main className="commerce commerce-page">
      <Link to="/customer/orders">← My Orders</Link>
      <h1>{d.number}</h1>
      {d.paymentStatus === "Paid" && (
        <p className="commerce-success" role="status">
          Payment verified. Your purchase is confirmed.
        </p>
      )}
      <p>
        {d.status} · Payment {d.paymentStatus}
      </p>
      <section className="commerce-panel">
        {d.lines.map((l, i) => (
          <div className="commerce-line" key={i}>
            <span>
              {l.name} × {l.quantity} · Selling Price {money(l.price)}
            </span>
            <span>{money(l.total)}</span>
          </div>
        ))}
        <Totals data={d} />
        <p>
          {d.address.fullName} · {d.address.line1} · {d.address.city}{" "}
          {d.address.postalCode}
        </p>
      </section>
      {error && (
        <p role="alert" className="commerce-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {d.paymentStatus !== "Paid" && (
        <div className="commerce-actions">
          <button
            className="primary"
            disabled={busy}
            onClick={() => action(true)}
          >
            Pay {money(d.total)}
          </button>
          <button disabled={busy} onClick={() => action(false)}>
            Check server status
          </button>
        </div>
      )}
    </main>
  );
}
export function MyOrders() {
  const state = useCustomerData("/orders");
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  return (
    <main className="commerce commerce-page">
      <h1>My Orders</h1>
      <Link to="/customer/cart">View cart</Link>
      {state.data.length ? (
        <section className="commerce-panel">
          {state.data.map((o) => (
            <div className="commerce-line" key={o.id}>
              <Link to={`/customer/orders/${o.id}`}>{o.number}</Link>
              <span>
                {o.status} · {o.paymentStatus} · {money(o.total)}
              </span>
            </div>
          ))}
        </section>
      ) : (
        <section className="commerce-panel">
          <p>No purchases yet.</p>
          <Link to="/services">Explore products</Link>
        </section>
      )}
    </main>
  );
}
