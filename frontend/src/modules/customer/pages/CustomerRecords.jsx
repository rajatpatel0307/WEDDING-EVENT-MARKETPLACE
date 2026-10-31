import { LocationFields, MapLink } from "../components/LocationFields";
import { useEffect, useState } from "react";
import {
  Link,
  useParams,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUpRight,
  Check,
  MessagesSquare,
  ShieldCheck,
  Star,
} from "lucide-react";
import { gql } from "@apollo/client";
import { useAuth } from "../../../context/AuthContext";
import { client, userFields } from "../../../services/apollo";
import PhotoUpload from "../../../components/common/PhotoUpload";
import {
  useCustomerData,
  Heading,
  Loading,
  ErrorView,
  Empty,
  Badge,
  Modal,
  Field,
} from "../components/WorkspaceUI";
import { ServiceCard } from "../components/ServiceCards";
import {
  save,
  money,
  date,
  timestamp,
  customerRequest,
} from "../services/workspace.api";
import BookingChanges from "../../bookings/BookingChanges";
import BookingItemDetails from "../../bookings/BookingItemDetails";
const columns = {
  bookings: [
    ["number", "Booking"],
    ["vendor", "Vendor"],
    ["services", "Services"],
    ["event", "Event"],
    ["bookingDate", "Event date"],
    ["amount", "Amount"],
    ["paymentStatus", "Payment"],
    ["status", "Status"],
  ],
  quotations: [
    ["number", "Quotation"],
    ["vendor", "Vendor"],
    ["event", "Event"],
    ["services", "Services"],
    ["amount", "Total"],
    ["validUntil", "Valid until"],
    ["status", "Status"],
  ],
  payments: [
    ["reference", "Reference"],
    ["booking", "Booking"],
    ["amount", "Amount"],
    ["method", "Method"],
    ["gateway", "Gateway"],
    ["status", "Status"],
    ["paidAt", "Payment date"],
  ],
  requests: [
    ["vendor", "Vendor"],
    ["event", "Event"],
    ["service", "Service"],
    ["message", "Requirements"],
    ["status", "Status"],
    ["createdAt", "Requested"],
  ],
  reviews: [
    ["vendor", "Vendor"],
    ["rating", "Rating"],
    ["title", "Title"],
    ["review", "Your review"],
    ["status", "Published"],
    ["createdAt", "Date"],
  ],
};
const names = {
  bookings: "My bookings",
  quotations: "My quotations",
  requests: "Quotation requests",
  wishlist: "Saved with love",
  payments: "Payments",
  reviews: "Your experiences",
  addresses: "My addresses",
  notifications: "Notifications",
};
function Cell({ name, value, row }) {
  if (name === "reference" && row.id)
    return <Link to={`/customer/payments/${row.id}`}>{value}</Link>;
  if (name === "amount") return money(value, false, row.currency || "INR");
  if (["validUntil", "bookingDate", "paidAt", "createdAt"].includes(name))
    return date(value);
  if (name === "status" || name === "paymentStatus")
    return <Badge>{value}</Badge>;
  if (name === "rating") return <span>{value} / 5 ★</span>;
  return value || "—";
}
export default function CustomerRecords({ section: explicit }) {
  const [filterParams, setFilterParams] = useSearchParams();
  const location = useLocation(),
    section = explicit || location.pathname.split("/")[2],
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [version, setVersion] = useState(0),
    [edit, setEdit] = useState(null),
    [remove, setRemove] = useState(null),
    [busy, setBusy] = useState(false),
    { notify, reload } = useAuth(),
    r = useCustomerData(
      section === "wishlist"
        ? "/wishlist"
        : `/records/${section}?${new URLSearchParams({ page, q: search, status: section === "bookings" ? filterParams.get("status") || "" : "" })}`,
      version,
    );
  useEffect(() => {
    setPage(1);
    setEdit(null);
    setRemove(null);
  }, [section]);
  const refresh = () => setVersion((v) => v + 1);
  const rows = section === "wishlist" ? r.data : r.data?.rows;
  return (
    <>
      <Heading
        title={names[section] || "Your account"}
        description={
          {
            bookings: "Your dream team, from the first request to the big day.",
            quotations: "Compare the details. Choose what feels right.",
            wishlist: "Beautiful possibilities, kept in one place.",
            payments: "Every payment, clearly accounted for.",
            reviews: "Help another celebration find its perfect match.",
            addresses: "Keep your contact details ready for every occasion.",
            notifications: "All the little updates that matter.",
          }[section]
        }
      >
        {section === "addresses" ? (
          <button className="cw-button cw-primary" onClick={() => setEdit({})}>
            <Plus size={16} /> Add address
          </button>
        ) : ["wishlist", "bookings", "quotations"].includes(section) ? (
          <Link className="cw-button cw-primary" to="/customer/discover">
            Find services <ArrowUpRight size={15} />
          </Link>
        ) : null}
      </Heading>
      {section === "addresses" && (
        <input
          className="border rounded-lg p-3 mb-4 w-full"
          aria-label="Search addresses"
          placeholder="Search addresses by contact, city, postal code or street"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      )}
      {section === "bookings" && (
        <nav className="cw-inline-tabs" aria-label="Booking status">
          {[
            "",
            "Pending",
            "Confirmed",
            "Upcoming",
            "Completed",
            "Cancelled",
          ].map((status) => (
            <button
              key={status}
              className="cw-button"
              aria-pressed={(filterParams.get("status") || "") === status}
              onClick={() => {
                setFilterParams(status ? { status } : {});
                setPage(1);
              }}
            >
              {status || "All bookings"}
            </button>
          ))}
        </nav>
      )}
      {section === "quotations" && (
        <div className="cw-inline-tabs">
          <Link to="/customer/quotations" className="active">
            Received quotations
          </Link>
          <Link to="/customer/requests">My requests</Link>
        </div>
      )}
      {section === "requests" && (
        <div className="cw-inline-tabs">
          <Link to="/customer/quotations">Received quotations</Link>
          <Link to="/customer/requests" className="active">
            My requests
          </Link>
        </div>
      )}
      {section === "payments" && (
        <section className="cw-info-strip">
          <ShieldCheck size={22} />
          <p>
            Payments are made securely through Razorpay after your vendor
            accepts the booking.{" "}
            <Link to="/customer/bookings">Go to your bookings →</Link>{" "}
            <Link to="/customer/refunds">Refund requests</Link>
          </p>
        </section>
      )}
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorView error={r.error} retry={r.retry} />
      ) : !rows?.length ? (
        <Empty
          title={
            {
              wishlist: "Keep a little inspiration",
              bookings: "Your dream team is waiting",
              quotations: "Good things are on their way",
              payments: "Your payment history starts here",
              reviews: "Your experience matters",
              addresses: "Make yourself at home",
              notifications: "You’re all caught up",
              requests: "Tell a vendor what you have in mind",
            }[section]
          }
          text={
            {
              wishlist:
                "Save the vendors, services and packages you love while you explore.",
              quotations:
                "Request a quotation from a service to receive a tailored proposal.",
              reviews: "Review a completed booking from its details page.",
              notifications: "New updates from your vendors will appear here.",
            }[section] ||
            "Your records will appear here as you plan your celebration."
          }
        />
      ) : section === "wishlist" ? (
        <div className="cw-discovery-grid">
          {rows.map((i) => (
            <ServiceCard
              key={i.id}
              item={i}
              saved
              onChange={() => {
                refresh();
                reload();
              }}
            />
          ))}
        </div>
      ) : section === "addresses" ? (
        <div className="cw-events-grid">
          {rows.map((a) => (
            <article className="cw-panel cw-prose" key={a.id}>
              <div className="cw-record-line">
                <h2>{a.type}</h2>
                {a.isDefault && <Badge>Default</Badge>}
              </div>
              <p>
                {a.fullName} {a.phone}
              </p>
              <p>
                {a.line1}
                <br />
                {a.line2}
                <br />
                {a.city}, {a.state} {a.postalCode}
                <br />
                {a.country}
              </p>
              <div className="cw-detail-actions">
                <MapLink value={a} />
                {!a.isDefault && (
                  <button
                    className="cw-button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await save(`/addresses/${a.id}/default`, "PATCH", {});
                        refresh();
                        notify("Default address updated.");
                      } catch (e) {
                        notify(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Set as default
                  </button>
                )}
                <button className="cw-button" onClick={() => setEdit(a)}>
                  <Pencil size={14} /> Edit
                </button>
                <button
                  className="cw-icon"
                  aria-label={`Remove ${a.type} address`}
                  onClick={() => setRemove(a)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : section === "notifications" ? (
        <div className="cw-notifications">
          {rows.map((n) => (
            <article className={n.isRead ? "" : "unread"} key={n.id}>
              <div>
                <span className="cw-notification-dot" />
                <h3>{n.title}</h3>
                <p>{n.message}</p>
                <small>{timestamp(n.createdAt)}</small>
                {["Quotation", "QuotationRequest"].includes(n.referenceType) &&
                  /^[0-9a-f-]{36}$/i.test(n.referenceId || "") && (
                    <Link
                      className="cw-button"
                      to={`/customer/${n.referenceType === "Quotation" ? "quotations" : "requests"}/${n.referenceId}`}
                    >
                      View details
                    </Link>
                  )}
              </div>
              {!n.isRead && (
                <button
                  className="cw-button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await save(`/notifications/${n.id}/read`, "PATCH", {});
                      refresh();
                      await reload();
                    } catch (e) {
                      notify(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Check size={14} /> Mark read
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="cw-panel cw-table-wrap">
          <table>
            <thead>
              <tr>
                {columns[section]?.map(([key, title]) => (
                  <th key={key}>{title}</th>
                ))}
                {["bookings", "quotations"].includes(section) && (
                  <th>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns[section]?.map(([key]) => (
                    <td key={key}>
                      <Cell name={key} value={row[key]} row={row} />
                    </td>
                  ))}
                  {["bookings", "quotations"].includes(section) && (
                    <td>
                      <Link
                        className="cw-button"
                        to={`/customer/${section}/${row.id}`}
                      >
                        View details <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {section !== "wishlist" && r.data?.total > r.data?.pageSize && (
        <div className="cw-pagination">
          <button
            className="cw-button"
            disabled={page === 1 || r.loading}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} · {r.data.total} records
          </span>
          <button
            className="cw-button"
            disabled={page * r.data.pageSize >= r.data.total || r.loading}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
      {edit && (
        <AddressForm
          address={edit.id ? edit : null}
          close={() => setEdit(null)}
          done={refresh}
        />
      )}{" "}
      {remove && (
        <Modal title="Remove address" busy={busy} close={() => setRemove(null)}>
          <p>Remove this {remove.type.toLowerCase()} address?</p>
          <button
            className="cw-button cw-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await save(`/addresses/${remove.id}`, "DELETE", {});
                setRemove(null);
                refresh();
                notify("Address removed.");
              } catch (e) {
                notify(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Removing…" : "Remove address"}
          </button>
        </Modal>
      )}
    </>
  );
}
function AddressForm({ address, close, done }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    { notify } = useAuth();
  return (
    <Modal
      title={address ? "Edit address" : "Add address"}
      busy={busy}
      close={close}
    >
      <form
        className="cw-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = Object.fromEntries(new FormData(e.currentTarget));
          setBusy(true);
          try {
            const r = await save(
              `/addresses${address ? `/${address.id}` : ""}`,
              address ? "PUT" : "POST",
              { ...f, isDefault: f.isDefault === "on" },
            );
            notify(r.message);
            done();
            close();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Address type">
          <select name="type" defaultValue={address?.type || "Home"}>
            {["Home", "Work", "Billing", "Other"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        {["fullName", "phone"].map((k) => (
          <Field
            key={k}
            label={k === "fullName" ? "Contact name" : "Phone number"}
          >
            <input
              name={k}
              maxLength={k === "phone" ? 30 : 200}
              defaultValue={address?.[k] || ""}
            />
          </Field>
        ))}
        <LocationFields value={address || {}} />
        <label className="cw-checkbox">
          <input
            name="isDefault"
            type="checkbox"
            defaultChecked={address?.isDefault}
          />{" "}
          Set as default address
        </label>
        {error && (
          <p className="cw-form-error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy} className="cw-button cw-primary">
          {busy ? "Saving…" : "Save address"}
        </button>
      </form>
    </Modal>
  );
}
export function CustomerRecordDetails({ quote = false }) {
  const { id } = useParams(),
    [version, setVersion] = useState(0),
    r = useCustomerData(`/${quote ? "quotations" : "bookings"}/${id}`, version),
    config = useCustomerData("/payments/config"),
    [decision, setDecision] = useState(null),
    [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    { notify } = useAuth(),
    navigate = useNavigate();
  if (r.loading) return <Loading />;
  if (r.error) return <ErrorView error={r.error} retry={r.retry} />;
  const b = quote ? r.data.quotation : r.data.booking;
  async function message() {
    setBusy(true);
    try {
      const c = await save("/conversations", "POST", {
        vendorId: b.VendorId,
        eventId: b.EventId,
        ...(!quote ? { bookingId: b.BookingId } : { quotationId: b.QuotationId }),
      });
      navigate(`/customer/messages?conversation=${c.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link
        className="cw-back"
        to={`/customer/${quote ? "quotations" : "bookings"}`}
      >
        ← {quote ? "My quotations" : "My bookings"}
      </Link>
      <Heading
        title={b.QuotationNumber || b.BookingNumber}
        description={
          quote
            ? "Every detail of your proposal, in one place."
            : "Follow your booking from first request to lasting memories."
        }
      >
        <Badge>{b.Status || b.BookingStatus}</Badge>
        <button className="cw-button" onClick={message} disabled={busy}>
          <MessagesSquare size={16} /> Message vendor
        </button>
      </Heading>
      <section className="cw-panel cw-prose">
        <div className="cw-record-line">
          <div>
            <span className="cw-eyebrow">
              {quote ? "QUOTATION TOTAL" : "BOOKING TOTAL"}
            </span>
            <h2>{money(b.TotalAmount)}</h2>
          </div>
          {quote ? (
            <p>Valid until {date(b.ValidUntil)}</p>
          ) : (
            <div>
              <Badge>{b.PaymentStatus}</Badge>
              <p>
                {money(b.PaidAmount)} paid · {money(b.RemainingAmount)}{" "}
                remaining
              </p>
              <p>Event date: {date(b.BookingDate)}</p>
            </div>
          )}
        </div>
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
              {r.data.items.map((i, k) => (
                <tr key={k}>
                  <td>
                    {i.name}
                    <BookingItemDetails description={i.description} />
                  </td>
                  <td>
                    {!quote &&
                    b.BookingStatus === "Pending" &&
                    i.serviceItemId ? (
                      <form
                        className="flex flex-wrap gap-2"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          const quantity = Number(
                            new FormData(event.currentTarget).get("quantity"),
                          );
                          setBusy(true);
                          setError("");
                          try {
                            await save(
                              `/bookings/${id}/items/${i.id}`,
                              "PATCH",
                              { quantity },
                            );
                            setVersion((v) => v + 1);
                          } catch (err) {
                            setError(err.message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <input
                          aria-label={`${i.name} quantity`}
                          className="w-20 rounded border p-1"
                          type="number"
                          name="quantity"
                          defaultValue={Number(i.quantity)}
                          min={1}
                          max={100000}
                          required
                        />
                        <button className="cw-button" disabled={busy}>
                          Update
                        </button>
                        <button
                          className="cw-button"
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            setError("");
                            try {
                              await save(
                                `/bookings/${id}/items/${i.id}`,
                                "DELETE",
                                {},
                              );
                              setVersion((v) => v + 1);
                            } catch (err) {
                              setError(err.message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Remove
                        </button>
                      </form>
                    ) : (
                      Number(i.quantity)
                    )}
                  </td>
                  <td>{money(i.price)}</td>
                  <td>{money(i.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl>
          <dt>Subtotal</dt>
          <dd>{money(b.SubTotal)}</dd>
          <dt>Discount</dt>
          <dd>{money(b.DiscountAmount)}</dd>
          <dt>Tax</dt>
          <dd>{money(b.TaxAmount)}</dd>
          {!quote && (
            <>
              <dt>Platform fee</dt>
              <dd>{money(b.PlatformFee)}</dd>
            </>
          )}
        </dl>
        {b.VendorMessage && <p>{b.VendorMessage}</p>}
        {b.CustomerMessage && <p>Your note: {b.CustomerMessage}</p>}
        {quote && r.data.revisions?.length > 0 && (
          <section>
            <h2>Requested revisions</h2>
            {r.data.revisions.map((revision) => (
              <p key={revision.id}>
                {timestamp(revision.createdAt)} · {revision.status} ·{" "}
                {revision.message}
              </p>
            ))}
          </section>
        )}
        {quote && ["Sent", "Viewed"].includes(b.Status) && (
          <div className="cw-detail-actions">
            <button
              className="cw-button cw-primary"
              disabled={busy}
              onClick={() => setDecision("Accept")}
            >
              Accept quotation
            </button>
            <button
              className="cw-button"
              disabled={busy}
              onClick={() => setDecision("Modify")}
            >
              Request modification
            </button>
            <button
              className="cw-button"
              disabled={busy}
              onClick={() => setDecision("Reject")}
            >
              Reject
            </button>
          </div>
        )}
        {!quote &&
          Number(b.RemainingAmount) > 0 &&
          ["Accepted", "PaymentPending", "Confirmed", "InProgress"].includes(
            b.BookingStatus,
          ) && (
            <div className="cw-payment-action">
              <Link
                className="cw-button"
                to={`/customer/bookings/${id}/checkout`}
              >
                Review checkout and payment terms
              </Link>
              <button
                className="cw-button cw-primary"
                disabled={busy || !config.data?.enabled}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    navigate(`/customer/bookings/${id}/checkout`);
                  } catch (e) {
                    setError(e.message);
                    setVersion((v) => v + 1);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <ShieldCheck size={16} />
                {busy
                  ? "Opening secure checkout…"
                  : `Pay ${money(b.RemainingAmount)}`}
              </button>
              {!config.loading && !config.data?.enabled && (
                <p>
                  Online payment is currently unavailable. Please contact
                  support.
                </p>
              )}
              {config.error && (
                <ErrorView error={config.error} retry={config.retry} />
              )}
            </div>
          )}
        {!quote && b.BookingStatus === "Pending" && (
          <p>
            Your vendor is reviewing this request. Payment will become available
            after acceptance.
          </p>
        )}
        {!quote && b.BookingStatus === "Completed" && (
          <button
            className="cw-button cw-primary"
            onClick={() => setReview(true)}
          >
            <Star size={16} /> Write a review
          </button>
        )}
        {error && (
          <p className="cw-form-error" role="alert">
            {error}
          </p>
        )}
      </section>
      {!quote && (
        <section className="cw-panel cw-prose">
          <BookingChanges
            id={id}
            data={r.data}
            request={customerRequest}
            saved={(message) => {
              notify(message);
              setVersion((v) => v + 1);
            }}
          />
          <h2>Booking journey</h2>
          <ol className="cw-timeline">
            {r.data.history.map((h, i) => (
              <li key={i}>
                <Badge>{h.status}</Badge>
                <span>
                  {h.action} · {h.role || "System"}
                  {h.previous ? ` · ${h.previous} → ${h.status}` : ""}
                </span>
                <time>{timestamp(h.createdAt)}</time>
                <p>{h.note}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
      {decision && (
        <Modal
          title={
            {
              Accept: "Accept this quotation?",
              Reject: "Reject this quotation?",
              Modify: "Request a revised quotation",
            }[decision]
          }
          close={() => setDecision(null)}
          busy={busy}
        >
          <form
            className="cw-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              setError("");
              try {
                const result = await save(
                  `/quotations/${id}/decision`,
                  "POST",
                  { action: decision, message: f.get("message") || "" },
                );
                notify(result.message);
                setDecision(null);
                if (result.id && decision === "Accept")
                  navigate(`/customer/bookings/${result.id}`);
                else setVersion((v) => v + 1);
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              {decision === "Accept"
                ? "This creates a booking request at the quoted price. Your vendor will confirm availability before payment."
                : decision === "Modify"
                  ? "Describe your changes. A new request will be sent and the current quotation will be closed, preserving its history."
                  : "The vendor will be notified of your decision."}
            </p>
            <Field
              label={
                decision === "Modify" ? "Changes needed" : "Note (optional)"
              }
            >
              <textarea
                name="message"
                required={decision === "Modify"}
                minLength={decision === "Modify" ? 5 : 0}
                maxLength="2000"
                rows="4"
              />
            </Field>
            {error && (
              <p className="cw-form-error" role="alert">
                {error}
              </p>
            )}
            <div className="cw-form-actions">
              <button
                type="button"
                className="cw-button"
                onClick={() => setDecision(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="cw-button cw-primary" disabled={busy}>
                {busy
                  ? "Saving…"
                  : decision === "Modify"
                    ? "Send changes"
                    : `${decision} quotation`}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {review && <ReviewForm bookingId={id} close={() => setReview(false)} />}
    </>
  );
}
function ReviewForm({ bookingId, close }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    { notify } = useAuth();
  return (
    <Modal title="Share your experience" close={close} busy={busy}>
      <form
        className="cw-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = Object.fromEntries(new FormData(e.currentTarget));
          try {
            const r = await save("/reviews", "POST", {
              bookingId,
              ...f,
              rating: Number(f.rating),
            });
            notify(r.message);
            close();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Rating">
          <select name="rating">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} stars
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title (optional)">
          <input name="title" maxLength="200" />
        </Field>
        <Field label="Your review">
          <textarea
            name="text"
            minLength="5"
            maxLength="5000"
            rows="5"
            required
          />
        </Field>
        {error && (
          <p className="cw-form-error" role="alert">
            {error}
          </p>
        )}
        <button className="cw-button cw-primary" disabled={busy}>
          {busy ? "Publishing…" : "Publish review"}
        </button>
      </form>
    </Modal>
  );
}
export function CustomerProfile({ settings = false }) {
  const { user, setUser, reload, notify } = useAuth(),
    r = useCustomerData("/profile"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (settings)
    return (
      <>
        <Heading
          title="A little peace of mind"
          description="Keep your account secure and your details up to date."
        />
        <section className="cw-panel cw-prose">
          <ShieldCheck size={30} />
          <h2>Account security</h2>
          <p>Use a strong, unique password to keep your planning space safe.</p>
          <Link className="cw-button cw-primary" to="/auth/change-password">
            Change password
          </Link>
          <h3>Profile & contact details</h3>
          <p>
            Your email is verified. Keep your phone number and addresses
            current.
          </p>
          <Link className="cw-button" to="/customer/profile">
            Edit profile
          </Link>
        </section>
      </>
    );
  if (r.loading) return <Loading />;
  if (r.error) return <ErrorView error={r.error} retry={r.retry} />;
  return (
    <>
      <Heading
        title="The person behind the celebration"
        description="Your profile, your details, your next chapter."
      />
      <section className="cw-panel cw-profile-panel">
        <div className="cw-profile-photo">
          <PhotoUpload
            url={user.profilePhotoUrl}
            onBusy={setBusy}
            onUploaded={async ({ uploadToken }) => {
              const { data } = await client.mutate({
                mutation: gql(
                  `mutation UpdateProfilePhoto($uploadToken:String!){updateProfilePhoto(uploadToken:$uploadToken){success message user{${userFields}}}}`,
                ),
                variables: { uploadToken },
              });
              setUser((p) => ({ ...p, ...data.updateProfilePhoto.user }));
              notify(data.updateProfilePhoto.message);
              r.retry();
            }}
          />
          <strong>
            {user.firstName} {user.lastName}
          </strong>
          <p>{user.email}</p>
          <Badge>Verified</Badge>
        </div>
        <form
          className="cw-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const f = Object.fromEntries(new FormData(e.currentTarget));
              const result = await save("/profile", "PUT", {
                ...f,
                expectedUpdatedAt: r.data.updatedAt,
              });
              notify(result.message);
              await reload();
              r.retry();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="cw-form-grid">
            {[
              ["firstName", "First name"],
              ["lastName", "Last name"],
              ["phone", "Phone"],
            ].map(([key, label]) => (
              <Field label={label} key={key}>
                <input
                  name={key}
                  defaultValue={r.data[key] || ""}
                  required={key === "firstName"}
                  maxLength={key === "phone" ? 20 : 100}
                />
              </Field>
            ))}
            <Field label="Date of birth">
              <input
                name="dateOfBirth"
                type="date"
                defaultValue={r.data.dateOfBirth?.slice(0, 10) || ""}
              />
            </Field>
          </div>
          <Field label="Verified email">
            <input value={r.data.email} disabled readOnly />
          </Field>
          {error && (
            <p className="cw-form-error" role="alert">
              {error}
            </p>
          )}
          <button className="cw-button cw-primary" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>
    </>
  );
}
