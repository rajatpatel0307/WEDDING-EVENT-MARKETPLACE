import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ShieldCheck, ShoppingBag, CalendarDays } from "lucide-react";
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
import "./commerce.css";

function AddressPicker({ value, onChange, optional = false }) {
  const state = useCustomerData("/addresses?pageSize=50");
  return (
    <label>
      {optional ? "Booking address (optional)" : "Shipping / billing address"}
      {state.loading ? (
        <span role="status">Loading addresses…</span>
      ) : state.error ? (
        <ErrorView error={state.error} retry={state.retry} />
      ) : (
        <select
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
      <Link to="/customer/addresses">Manage addresses</Link>
    </label>
  );
}
function CustomerLabel() {
  const { user } = useAuth();
  return (
    <p>
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
    setBusy(true);
    setError("");
    try {
      await save(path, method, body);
      reset();
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function review(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
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
    } finally {
      setBusy(false);
    }
  }
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  const lines = state.data.lines || [];
  return (
    <main className="commerce commerce-page">
      <h1>
        <ShoppingBag className="inline" /> Your Cart & Purchase Checkout
      </h1>
      <Link to="/customer/orders">My Orders</Link>
      {error && (
        <p role="alert" className="commerce-error">
          {error}
        </p>
      )}
      {state.data.checkoutError && (
        <p className="commerce-error" role="alert">
          {state.data.checkoutError}
        </p>
      )}
      {!lines.length ? (
        <section className="commerce-panel">
          <h2>Your cart is empty</h2>
          <Link to="/services">Explore the marketplace</Link>
        </section>
      ) : (
        <div className="commerce-summary">
          <section className="commerce-panel">
            {lines.map((line) => (
              <div className="commerce-line" key={line.id}>
                <div>
                  <Link to={`/services/${line.id}`}>{line.name}</Link>
                  <p>
                    Selling Price {money(line.price)} · {line.stock ?? 0} in
                    stock
                  </p>
                  {line.unavailable && <p role="alert">{line.unavailable}</p>}
                  <label>
                    Quantity
                    <input
                      type="number"
                      min={line.minimum || 1}
                      max={Math.min(line.maximum || 999, line.stock || 999)}
                      defaultValue={line.quantity}
                      key={`${version}:${line.quantity}`}
                      onBlur={(e) => {
                        if (Number(e.target.value) !== line.quantity)
                          mutate("/cart/items", "PUT", {
                            serviceId: line.id,
                            quantity: Number(e.target.value),
                          });
                      }}
                      disabled={busy}
                    />
                  </label>
                </div>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Remove ${line.name} from your cart?`))
                      mutate(`/cart/items/${line.id}`, "DELETE");
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <h2 className="mt-6">Customer & delivery details</h2>
            <CustomerLabel />
            <form onSubmit={review}>
              <AddressPicker
                value={addressId}
                onChange={(v) => {
                  setAddress(v);
                  reset();
                }}
              />
              <div className="commerce-actions">
                <button
                  className="primary"
                  disabled={busy || lines.some((l) => l.unavailable)}
                >
                  Review order
                </button>
              </div>
            </form>
          </section>
          <aside className="commerce-panel">
            <h2>Purchase Summary</h2>
            {preview ? (
              <>
                <Totals data={preview} />
                <p>
                  Deliver to {preview.address.fullName}, {preview.address.line1}
                  , {preview.address.city} {preview.address.postalCode}
                </p>
                <p>
                  Discount: {money(preview.discount)}. Booking availability is
                  separate from this purchase.
                </p>
                <label className="commerce-check">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                  />
                  I have reviewed the order and delivery details.
                </label>
                <button
                  className="primary"
                  disabled={busy || !accepted}
                  onClick={confirm}
                >
                  {busy ? "Creating order…" : "Continue to payment"}
                </button>
              </>
            ) : (
              <p>
                Select your shipping address to review delivery charges, tax and
                the final amount.
              </p>
            )}
          </aside>
        </div>
      )}
    </main>
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
