import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Heart,
  History,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Power,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Star,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { adminRequest, date, money, number } from "../api";
import { Badge, Empty, ErrorState, Skeleton } from "../components/AdminTable";
import AdminDialog from "../components/AdminDialog";
import { useAuth } from "../../../context/AuthContext";
import "../customer-details.css";

const tabs = [
  ["overview", "Overview"],
  ["personal", "Personal Information"],
  ["events", "Events"],
  ["bookings", "Bookings"],
  ["quotations", "Quotations"],
  ["payments", "Payments"],
  ["reviews", "Reviews"],
  ["wishlist", "Wishlist"],
  ["messages", "Messages"],
  ["addresses", "Addresses"],
  ["audit", "Audit History"],
];
const timestamp = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : "Not recorded";
const columns = {
  events: [
    ["name", "Event name"],
    ["type", "Event type"],
    ["eventDate", "Event date"],
    ["location", "Location"],
    ["guests", "Guests"],
    ["budget", "Budget"],
    ["status", "Status"],
    ["createdAt", "Created date"],
  ],
  bookings: [
    ["number", "Booking number"],
    ["vendor", "Vendor"],
    ["services", "Services"],
    ["event", "Event"],
    ["amount", "Amount"],
    ["paymentStatus", "Payment status"],
    ["status", "Booking status"],
    ["createdAt", "Created date"],
  ],
  quotations: [
    ["number", "Quotation number"],
    ["vendor", "Vendor"],
    ["amount", "Total"],
    ["status", "Status"],
    ["validUntil", "Valid until"],
    ["createdAt", "Created date"],
  ],
  payments: [
    ["reference", "Payment reference"],
    ["booking", "Booking"],
    ["amount", "Amount"],
    ["method", "Payment method"],
    ["gateway", "Gateway"],
    ["status", "Status"],
    ["paidAt", "Payment date"],
  ],
  reviews: [
    ["vendor", "Vendor"],
    ["rating", "Rating"],
    ["review", "Review"],
    ["createdAt", "Date"],
    ["status", "Published status"],
  ],
  wishlist: [
    ["name", "Saved item"],
    ["type", "Type"],
    ["vendor", "Vendor"],
    ["createdAt", "Saved date"],
  ],
  messages: [
    ["sender", "Sender"],
    ["vendor", "Conversation with"],
    ["message", "Message"],
    ["type", "Type"],
    ["status", "Status"],
    ["createdAt", "Sent date"],
  ],
  audit: [
    ["action", "Action"],
    ["actor", "Actor"],
    ["entity", "Entity"],
    ["entityId", "Entity ID"],
    ["ipAddress", "IP address"],
    ["note", "Reason"],
    ["createdAt", "Date & time"],
  ],
};
const activityIcons = {
  account: UserRound,
  event: CalendarDays,
  quotation: ReceiptText,
  booking: ShoppingBag,
  payment: CreditCard,
  review: Star,
};

function Avatar({ customer }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="cd-avatar">
      {customer.profilePhotoUrl && !failed ? (
        <img
          src={customer.profilePhotoUrl}
          alt={`${customer.firstName}'s profile`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span>
          {customer.firstName?.[0]}
          {customer.lastName?.[0]}
        </span>
      )}
      {!!customer.emailVerified && (
        <i>
          <ShieldCheck size={13} />
        </i>
      )}
    </div>
  );
}
function Info({ label, children }) {
  return (
    <div className="cd-info">
      <dt>{label}</dt>
      <dd>{children || "Not provided"}</dd>
    </div>
  );
}
function Cell({ field, value, row }) {
  if (value === null || value === undefined || value === "")
    return <span className="cd-muted">—</span>;
  if (["status", "paymentStatus"].includes(field))
    return <Badge>{value}</Badge>;
  if (["amount", "budget"].includes(field))
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: row.currency || "INR",
      maximumFractionDigits: 2,
    }).format(Number(value));
  if (["createdAt", "paidAt", "validUntil"].includes(field))
    return <span className="cd-nowrap">{timestamp(value)}</span>;
  if (field === "eventDate")
    return <span className="cd-nowrap">{date(value)}</span>;
  if (field === "rating")
    return (
      <span className="cd-rating">
        <Star size={14} fill="currentColor" /> {value}
        <small>/ 5</small>
      </span>
    );
  if (field === "guests") return number(value);
  return (
    <span
      className={
        ["review", "message", "services", "note"].includes(field)
          ? "cd-long-text"
          : ""
      }
    >
      {String(value)}
    </span>
  );
}
function Records({ id, section, version, compact = false }) {
  const [page, setPage] = useState(1),
    [result, setResult] = useState(null),
    [error, setError] = useState(null),
    [retry, setRetry] = useState(0);
  const size = compact ? 5 : 20;
  useEffect(() => {
    const abort = new AbortController();
    setResult(null);
    setError(null);
    adminRequest(
      `/customers/${id}/records/${section}?page=${page}&pageSize=${size}`,
      { signal: abort.signal },
    )
      .then(setResult)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e);
      });
    return () => abort.abort();
  }, [id, section, page, size, version, retry]);
  if (error)
    return <ErrorState error={error} retry={() => setRetry((v) => v + 1)} />;
  if (!result) return <Skeleton rows={compact ? 3 : 5} />;
  if (!result.total)
    return (
      <Empty
        text={`No ${section === "audit" ? "audit history" : section} yet`}
        description="Records will appear here as this customer uses the marketplace."
      />
    );
  return (
    <>
      {section === "addresses" ? (
        <div className="cd-address-grid">
          {result.rows.map((row) => (
            <article className="cd-address" key={row.id}>
              <div>
                <MapPin size={18} />
                <h3>{row.type}</h3>
                {!!row.isDefault && <Badge>Default</Badge>}
              </div>
              <p>
                {row.line1}
                <br />
                {row.line2 && (
                  <>
                    {row.line2}
                    <br />
                  </>
                )}
                {row.city}, {row.state} {row.postalCode}
                <br />
                {row.country}
              </p>
              {row.landmark && <small>Landmark: {row.landmark}</small>}
            </article>
          ))}
        </div>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table cd-table">
            <caption className="sr-only">Customer {section} records</caption>
            <thead>
              <tr>
                {columns[section].map(([key, label]) => (
                  <th key={key} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.id}>
                  {columns[section].map(([key, label]) => (
                    <td key={key} data-label={label}>
                      <Cell field={key} value={row[key]} row={row} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!compact && (
        <div className="cd-pagination">
          <span>
            {number((page - 1) * size + 1)}–
            {number(Math.min(page * size, result.total))} of{" "}
            {number(result.total)} records
          </span>
          <div>
            <button
              className="ad-button"
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage((v) => v - 1)}
            >
              <ChevronLeft size={15} />
            </button>
            <span>
              Page {page} of {Math.ceil(result.total / size)}
            </span>
            <button
              className="ad-button"
              aria-label="Next page"
              disabled={page * size >= result.total}
              onClick={() => setPage((v) => v + 1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Timeline({ items }) {
  return (
    <section className="ad-panel cd-timeline-panel">
      <div className="ad-panel-heading">
        <div>
          <h2>Activity timeline</h2>
          <p>Latest 30 milestones · newest first</p>
        </div>
        <Activity size={18} />
      </div>
      <ol className="cd-timeline">
        {items.map((item) => {
          const Icon = activityIcons[item.type] || Activity;
          return (
            <li key={`${item.type}-${item.id}`}>
              <span className={`cd-timeline-icon cd-tone-${item.type}`}>
                <Icon size={15} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
                <time dateTime={item.createdAt}>
                  {timestamp(item.createdAt)}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function CustomerDetailsPage() {
  const { id } = useParams(),
    [params, setParams] = useSearchParams(),
    { notify } = useAuth();
  const [data, setData] = useState(null),
    [error, setError] = useState(null),
    [version, setVersion] = useState(0),
    [dialog, setDialog] = useState(null),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState("");
  const tabRefs = useRef([]);
  const tab = tabs.some(([key]) => key === params.get("tab"))
    ? params.get("tab")
    : "overview";
  useEffect(() => {
    const abort = new AbortController();
    setError(null);
    adminRequest(`/customers/${id}/details`, { signal: abort.signal })
      .then(setData)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e);
      });
    return () => abort.abort();
  }, [id, version]);
  function selectTab(key) {
    setParams(key === "overview" ? {} : { tab: key }, { replace: true });
  }
  function open(action) {
    setFormError("");
    setDialog(action);
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const edit = dialog === "Edit",
        notification = dialog === "Send notification";
      const body = edit
        ? {
            ...values,
            dateOfBirth: values.dateOfBirth || null,
            expectedUpdatedAt: data.customer.updatedAt,
          }
        : notification
          ? values
          : {
              action: dialog,
              expectedActive: !!data.customer.active,
              expectedBlocked: !!data.customer.blocked,
              note: values.note,
            };
      const result = await adminRequest(
        `/customers/${id}/${edit ? "details" : notification ? "notifications" : "account"}`,
        { method: notification ? "POST" : "PATCH", body: JSON.stringify(body) },
      );
      notify(result.message);
      setDialog(null);
      setVersion((v) => v + 1);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (error)
    return (
      <>
        <Link className="cd-back" to="/admin/customers">
          <ArrowLeft size={15} /> Back to customers
        </Link>
        <ErrorState error={error} retry={() => setVersion((v) => v + 1)} />
      </>
    );
  if (!data || data.customer.id.toLowerCase() !== id.toLowerCase())
    return <Skeleton rows={8} />;
  const { customer: c, summary: s, timeline } = data;
  const fullName = `${c.firstName} ${c.lastName || ""}`.trim();
  const status = c.blocked ? "Blocked" : c.active ? "Active" : "Inactive";
  const stats = [
    ["events", "Total events", CalendarDays, "events"],
    ["bookings", "Total bookings", ShoppingBag, "bookings"],
    ["completed", "Completed bookings", CheckCircle2, "bookings"],
    ["cancelled", "Cancelled bookings", XCircle, "bookings"],
    ["spending", "Total spending", CreditCard, "payments"],
    ["pending", "Pending payments", Clock3, "payments"],
    ["wishlist", "Wishlist count", Heart, "wishlist"],
    ["reviews", "Reviews submitted", Star, "reviews"],
  ];
  return (
    <div className="cd-page">
      <div className="cd-topline">
        <Link className="cd-back" to="/admin/customers">
          <ArrowLeft size={15} /> Customers <span>/</span> Customer details
        </Link>
        <span className="cd-secure">
          <ShieldCheck size={14} /> Administrator access
        </span>
      </div>
      <section className="ad-panel cd-header" aria-label="Customer details">
        <div className="cd-header-main">
          <Avatar key={c.profilePhotoUrl || c.id} customer={c} />
          <div className="cd-identity">
            <div className="ad-eyebrow">CUSTOMER PROFILE</div>
            <div className="cd-name-row">
              <h1>{fullName}</h1>
              <Badge>{status}</Badge>
              <span
                className={`cd-verification ${c.emailVerified ? "verified" : ""}`}
              >
                <BadgeCheck size={14} />
                {c.emailVerified ? "Email verified" : "Email unverified"}
              </span>
            </div>
            <div className="cd-contact">
              <span>
                <Mail size={14} />
                {c.email}
              </span>
              <span>
                <Phone size={14} />
                {c.phone || "Phone not provided"}
              </span>
            </div>
          </div>
        </div>
        <div className="cd-actions">
          <button className="ad-button ad-primary" onClick={() => open("Edit")}>
            <Pencil size={14} /> Edit
          </button>
          <button
            className="ad-button"
            onClick={() => open(c.active ? "Deactivate" : "Activate")}
          >
            <Power size={14} />
            {c.active ? "Deactivate" : "Activate"}
          </button>
          <button
            className={`ad-button ${!c.blocked ? "cd-danger" : ""}`}
            onClick={() => open(c.blocked ? "Unblock" : "Block")}
          >
            <Ban size={14} />
            {c.blocked ? "Unblock" : "Block"}
          </button>
          <button
            className="ad-button"
            onClick={() => open("Send notification")}
          >
            <Bell size={14} /> Send notification
          </button>
          <button className="ad-button" onClick={() => selectTab("audit")}>
            <History size={14} /> View audit history
          </button>
        </div>
        <dl className="cd-header-meta">
          <Info label="Customer ID">
            <span className="cd-id">{c.id}</span>
          </Info>
          <Info label="Registered on">{timestamp(c.createdAt)}</Info>
          <Info label="Last login">
            {c.lastLoginAt ? timestamp(c.lastLoginAt) : "No login recorded"}
          </Info>
          <Info label="Account type">
            <span className="cd-type">
              <Users size={14} /> Customer
            </span>
          </Info>
        </dl>
      </section>
      <div
        className="cd-tabs"
        role="tablist"
        aria-label="Customer details sections"
      >
        {tabs.map(([key, label], i) => (
          <button
            key={key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            id={`cd-tab-${key}`}
            role="tab"
            aria-selected={tab === key}
            aria-controls="cd-tabpanel"
            tabIndex={tab === key ? 0 : -1}
            className={tab === key ? "selected" : ""}
            onClick={() => selectTab(key)}
            onKeyDown={(e) => {
              let next;
              if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
              if (e.key === "ArrowLeft")
                next = (i - 1 + tabs.length) % tabs.length;
              if (e.key === "Home") next = 0;
              if (e.key === "End") next = tabs.length - 1;
              if (next !== undefined) {
                e.preventDefault();
                selectTab(tabs[next][0]);
                tabRefs.current[next]?.focus();
              }
            }}
          >
            {label}
            {[
              "events",
              "bookings",
              "quotations",
              "wishlist",
              "reviews",
            ].includes(key) && <span>{number(s[key])}</span>}
          </button>
        ))}
      </div>
      <div
        id="cd-tabpanel"
        role="tabpanel"
        aria-labelledby={`cd-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "overview" ? (
          <>
            <div className="cd-section-heading">
              <div>
                <h2>Customer at a glance</h2>
                <p>A complete view of their marketplace journey.</p>
              </div>
              <span className="cd-period">Lifetime activity</span>
            </div>
            <div className="cd-stats">
              {stats.map(([key, label, Icon, target]) => (
                <button
                  className={`cd-stat cd-stat-${key}`}
                  key={key}
                  onClick={() => selectTab(target)}
                >
                  <div>
                    <span>{label}</span>
                    <Icon size={17} />
                  </div>
                  <strong>
                    {["spending", "pending"].includes(key)
                      ? money(s[key])
                      : number(s[key])}
                  </strong>
                  <small>
                    {key === "spending"
                      ? "Successful payments · INR"
                      : key === "pending"
                        ? "Outstanding booking balance · INR"
                        : "View customer records"}
                    <ArrowUpRight size={12} />
                  </small>
                </button>
              ))}
            </div>
            <div className="cd-overview-grid">
              <div className="cd-overview-left">
                <section className="ad-panel">
                  <div className="ad-panel-heading">
                    <div>
                      <h2>Recent bookings</h2>
                      <p>The latest reservations and payment status.</p>
                    </div>
                    <button
                      className="ad-text-link"
                      onClick={() => selectTab("bookings")}
                    >
                      View all <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <Records
                    key={`recent-${id}`}
                    id={id}
                    section="bookings"
                    version={version}
                    compact
                  />
                </section>
                <section className="ad-panel cd-account-summary">
                  <div className="ad-panel-heading">
                    <h2>Account details</h2>
                    <UserRound size={18} />
                  </div>
                  <dl>
                    <Info label="Full name">{fullName}</Info>
                    <Info label="Email verification">
                      <Badge>
                        {c.emailVerified ? "Verified" : "Unverified"}
                      </Badge>
                    </Info>
                    <Info label="Phone verification">
                      <Badge>
                        {c.phoneVerified ? "Verified" : "Unverified"}
                      </Badge>
                    </Info>
                    <Info label="Date of birth">
                      {c.dateOfBirth ? date(c.dateOfBirth) : "Not provided"}
                    </Info>
                    <Info label="Account access">
                      {c.active ? "Enabled" : "Disabled"}
                      {c.blocked ? " · Blocked" : ""}
                    </Info>
                    <Info label="Last updated">{timestamp(c.updatedAt)}</Info>
                  </dl>
                </section>
              </div>
              <Timeline items={timeline} />
            </div>
          </>
        ) : tab === "personal" ? (
          <section className="ad-panel cd-personal">
            <div className="ad-panel-heading">
              <div>
                <h2>Personal information</h2>
                <p>Contact information, verification, and account identity.</p>
              </div>
              <button className="ad-button" onClick={() => open("Edit")}>
                <Pencil size={14} /> Edit details
              </button>
            </div>
            <dl>
              <Info label="First name">{c.firstName}</Info>
              <Info label="Last name">{c.lastName}</Info>
              <Info label="Email address">{c.email}</Info>
              <Info label="Phone number">{c.phone}</Info>
              <Info label="Date of birth">
                {c.dateOfBirth ? date(c.dateOfBirth) : "Not provided"}
              </Info>
              <Info label="Email verification">
                {c.emailVerified ? "Verified" : "Unverified"}
              </Info>
              <Info label="Phone verification">
                {c.phoneVerified ? "Verified" : "Unverified"}
              </Info>
              <Info label="Account status">{status}</Info>
              <Info label="Registration date">{timestamp(c.createdAt)}</Info>
              <Info label="Last login">{timestamp(c.lastLoginAt)}</Info>
              <Info label="Customer ID">{c.id}</Info>
              <Info label="Last updated">{timestamp(c.updatedAt)}</Info>
            </dl>
          </section>
        ) : (
          <section className="ad-panel">
            <div className="ad-panel-heading">
              <div>
                <h2>{tabs.find(([key]) => key === tab)?.[1]}</h2>
                <p>
                  {tab === "audit"
                    ? "Customer actions and administrator changes to this account."
                    : tab === "messages"
                      ? "Messages in this customer’s vendor conversations."
                      : `All ${tab} belonging to ${fullName}.`}
                </p>
              </div>
              <span className="cd-period">
                {tab === "payments"
                  ? "Amounts shown in payment currency"
                  : "Newest first"}
              </span>
            </div>
            <Records
              key={`${id}-${tab}`}
              id={id}
              section={tab}
              version={version}
            />
          </section>
        )}
      </div>
      <p className="cd-footer">
        <ShieldCheck size={13} /> Account changes and notifications are recorded
        in audit history. Times shown in IST.
      </p>
      {dialog && (
        <AdminDialog
          title={
            dialog === "Edit"
              ? "Edit customer details"
              : dialog === "Send notification"
                ? "Send customer notification"
                : `${dialog} customer`
          }
          close={() => setDialog(null)}
          busy={busy}
        >
          <form className="ad-form" onSubmit={submit}>
            {formError && (
              <p className="ad-error" role="alert">
                {formError}
              </p>
            )}
            {dialog === "Edit" ? (
              <>
                <div className="cd-form-grid">
                  <label>
                    First name
                    <input
                      name="firstName"
                      defaultValue={c.firstName}
                      required
                      maxLength={100}
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      name="lastName"
                      defaultValue={c.lastName || ""}
                      maxLength={100}
                    />
                  </label>
                </div>
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    defaultValue={c.email}
                    required
                    maxLength={320}
                  />
                </label>
                <label>
                  Phone
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={c.phone || ""}
                    pattern="\+?[1-9][0-9]{7,14}"
                    maxLength={16}
                  />
                  <small>Include the country code, without spaces.</small>
                </label>
                <label>
                  Date of birth
                  <input
                    name="dateOfBirth"
                    type="date"
                    defaultValue={c.dateOfBirth?.slice(0, 10) || ""}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </label>
                <p className="cd-dialog-note">
                  Changing an email or phone clears its verification. Changing
                  email also signs the customer out.
                </p>
              </>
            ) : dialog === "Send notification" ? (
              <>
                <p className="cd-dialog-note">
                  Send an in-app notification to <strong>{fullName}</strong>.
                </p>
                <label>
                  Title
                  <input
                    name="title"
                    required
                    maxLength={200}
                    placeholder="A quick update from MarryNest"
                  />
                </label>
                <label>
                  Message
                  <textarea
                    name="message"
                    required
                    maxLength={2000}
                    rows={5}
                    placeholder="Write your notification…"
                  />
                </label>
              </>
            ) : (
              <>
                <p className="cd-dialog-note">
                  {["Deactivate", "Block"].includes(dialog)
                    ? `${dialog === "Block" ? "Block" : "Disable"} sign-in for ${fullName} and end their active sessions. Existing bookings and payments are preserved.`
                    : `${dialog} this account. Sign-in also requires an active, unblocked account with a verified email.`}
                </p>
                <label>
                  Reason for this change
                  <textarea
                    name="note"
                    required
                    minLength={3}
                    maxLength={2000}
                    rows={3}
                    placeholder="Add a reason for the audit history"
                  />
                </label>
              </>
            )}
            <div className="cd-dialog-actions">
              <button
                type="button"
                className="ad-button"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ad-button ad-primary"
                disabled={busy}
              >
                {busy
                  ? "Saving…"
                  : dialog === "Edit"
                    ? "Save changes"
                    : dialog === "Send notification"
                      ? "Send notification"
                      : `Confirm ${dialog.toLowerCase()}`}
              </button>
            </div>
          </form>
        </AdminDialog>
      )}
    </div>
  );
}
