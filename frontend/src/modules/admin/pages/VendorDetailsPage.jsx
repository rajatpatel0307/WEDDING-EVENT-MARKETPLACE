import VendorDecisionDialog from "../components/VendorDecisionDialog";
import { canDecide, decisionActions, vendorChanged } from "../vendor-workflow";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  BriefcaseBusiness,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  Mail,
  MapPin,
  Phone,
  Power,
  ShieldCheck,
  Star,
  Store,
  UserRound,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { adminRequest, date, money, number } from "../api";
import { Badge, Empty, ErrorState, Skeleton } from "../components/AdminTable";
import AdminDialog from "../components/AdminDialog";
import { useAuth } from "../../../context/AuthContext";
import "../customer-details.css";
import "../vendor-details.css";

const tabs = [
  ["overview", "Overview"],
  ["business", "Business Information"],
  ["documents", "Documents"],
  ["categories", "Categories"],
  ["services", "Services"],
  ["packages", "Packages"],
  ["locations", "Locations"],
  ["availability", "Availability"],
  ["bookings", "Bookings"],
  ["quotations", "Quotations"],
  ["customers", "Customers"],
  ["revenue", "Earnings"],
  ["payments", "Payments"],
  ["payouts", "Payouts"],
  ["reviews", "Reviews"],
  ["offers", "Offers"],
  ["coupons", "Coupons"],
  ["history", "Approval History"],
  ["audit", "Audit Logs"],
];
const columns = {
  payments: [
    ["reference", "Payment reference"],
    ["booking", "Booking"],
    ["amount", "Amount"],
    ["currency", "Currency"],
    ["method", "Method"],
    ["gateway", "Gateway"],
    ["status", "Status"],
    ["paidAt", "Paid date"],
  ],
  coupons: [
    ["name", "Coupon code"],
    ["description", "Description"],
    ["discountType", "Discount type"],
    ["discountValue", "Discount"],
    ["usageLimit", "Limit"],
    ["used", "Uses"],
    ["startDate", "Valid from"],
    ["endDate", "Valid until"],
    ["active", "Active"],
  ],
  history: [
    ["cycle", "Cycle"],
    ["fromStatus", "Previous status"],
    ["status", "Decision"],
    ["reason", "Reason"],
    ["notes", "Admin notes"],
    ["actor", "Administrator"],
    ["createdAt", "Timestamp"],
  ],
  services: [
    ["image", "Image"],
    ["name", "Service name"],
    ["category", "Category"],
    ["price", "Price"],
    ["pricingType", "Pricing"],
    ["status", "Approval status"],
    ["active", "Active status"],
    ["createdAt", "Created date"],
  ],
  packages: [
    ["name", "Package name"],
    ["service", "Service"],
    ["price", "Original price"],
    ["discount", "Discount"],
    ["finalPrice", "Final price"],
    ["guestRange", "Guest range"],
    ["active", "Status"],
  ],
  availability: [
    ["availableDate", "Date"],
    ["service", "Service"],
    ["startTime", "From"],
    ["endTime", "Until"],
    ["status", "Status"],
    ["notes", "Notes"],
  ],
  bookings: [
    ["number", "Booking number"],
    ["customer", "Customer"],
    ["event", "Event"],
    ["eventDate", "Event date"],
    ["services", "Services"],
    ["amount", "Amount"],
    ["paid", "Paid"],
    ["remaining", "Balance"],
    ["paymentStatus", "Payment status"],
    ["status", "Booking status"],
    ["customerNotes", "Customer notes"],
    ["vendorNotes", "Vendor notes"],
    ["createdAt", "Created date"],
  ],
  quotations: [
    ["number", "Quotation number"],
    ["customer", "Customer"],
    ["event", "Event"],
    ["amount", "Total"],
    ["status", "Status"],
    ["validUntil", "Valid until"],
    ["customerMessage", "Customer message"],
    ["vendorMessage", "Vendor message"],
    ["createdAt", "Created date"],
  ],
  customers: [
    ["name", "Customer"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["bookings", "Bookings"],
    ["amount", "Booked value"],
    ["lastBookingAt", "Last booking"],
    ["lastInteractionAt", "Last interaction"],
    ["status", "Account status"],
  ],
  revenue: [
    ["booking", "Booking"],
    ["gross", "Gross revenue"],
    ["commission", "Platform commission"],
    ["tax", "Tax deductions"],
    ["net", "Net earnings"],
    ["status", "Payout status"],
    ["createdAt", "Recorded date"],
  ],
  payouts: [
    ["id", "Payout ID"],
    ["booking", "Booking"],
    ["gross", "Gross"],
    ["commission", "Commission"],
    ["tax", "Tax deduction"],
    ["net", "Net payout"],
    ["status", "Status"],
    ["paidAt", "Paid on"],
    ["createdAt", "Created date"],
  ],
  reviews: [
    ["customer", "Customer"],
    ["rating", "Rating"],
    ["title", "Title"],
    ["review", "Review"],
    ["createdAt", "Date"],
    ["status", "Published status"],
  ],
  offers: [
    ["name", "Offer"],
    ["description", "Description"],
    ["service", "Applies to"],
    ["discountType", "Discount type"],
    ["discountValue", "Discount"],
    ["startDate", "Starts"],
    ["endDate", "Ends"],
    ["active", "Status"],
  ],
  messages: [
    ["sender", "From"],
    ["customer", "Customer"],
    ["type", "Type"],
    ["message", "Message"],
    ["status", "Status"],
    ["createdAt", "Date & time"],
  ],
  audit: [
    ["actor", "User"],
    ["action", "Action"],
    ["entity", "Entity"],
    ["entityId", "Entity ID"],
    ["oldValue", "Old value"],
    ["newValue", "New value"],
    ["ip", "IP address"],
    ["createdAt", "Timestamp"],
  ],
};
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
function Info({ label, children }) {
  return (
    <div className="cd-info">
      <dt>{label}</dt>
      <dd>{children || "Not provided"}</dd>
    </div>
  );
}
function VendorImage({
  src,
  alt = "",
  className = "",
  cover = false,
  name = "",
}) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  ) : (
    <span
      className={`${className} vd-image-fallback`}
      aria-label={alt || undefined}
    >
      {cover ? (
        <>
          <span className="vd-cover-lines" />
          <span className="vd-cover-mark">
            MARRY<span>NEST</span>
            <small>THE VENDOR COLLECTIVE</small>
          </span>
        </>
      ) : name ? (
        name.slice(0, 2).toUpperCase()
      ) : (
        <ImageIcon size={19} />
      )}
    </span>
  );
}
function LocationCards({ rows }) {
  return (
    <div className="cd-address-grid vd-locations">
      {rows.map((row) => (
        <article className="cd-address" key={row.id}>
          <div>
            <MapPin size={18} />
            <h3>{row.city}</h3>
            {!!row.isPrimary && <Badge>Primary</Badge>}
          </div>
          <p>
            {row.address}
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
          {row.landmark && <p>Landmark: {row.landmark}</p>}
          <Badge>{row.active ? "Active" : "Inactive"}</Badge>
        </article>
      ))}
    </div>
  );
}
function AuditValue({ value }) {
  return value === null || value === undefined ? (
    <span className="cd-muted">—</span>
  ) : (
    <details className="vd-audit-value">
      <summary>View value</summary>
      <pre>
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}
function Cell({ field, row, section }) {
  const value = row[field];
  if (field === "guestRange")
    return `${row.minimumGuests ?? "Any"} – ${row.maximumGuests ?? "No limit"}`;
  if (field === "image")
    return (
      <VendorImage
        key={value}
        src={value}
        alt={row.name}
        className="vd-service-image"
      />
    );
  if (["oldValue", "newValue"].includes(field))
    return <AuditValue value={value} />;
  if (field === "active") return <Badge>{value ? "Active" : "Inactive"}</Badge>;
  if (field === "price" && section === "services" && value == null)
    return (
      <span>
        {row.minimumPrice != null
          ? `${money(row.minimumPrice)}${row.maximumPrice != null ? ` – ${money(row.maximumPrice)}` : "+"}`
          : "On request"}
      </span>
    );
  if (value === null || value === undefined || value === "")
    return <span className="cd-muted">—</span>;
  if (["status", "paymentStatus"].includes(field))
    return <Badge>{value}</Badge>;
  if (
    [
      "amount",
      "price",
      "finalPrice",
      "paid",
      "remaining",
      "gross",
      "commission",
      "tax",
      "net",
    ].includes(field)
  )
    return row.currency && row.currency !== "INR"
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: row.currency,
        }).format(Number(value))
      : money(value);
  if (field === "discount") return `${number(value)}%`;
  if (field === "discountValue")
    return row.discountType === "Percentage"
      ? `${number(value)}%`
      : money(value);
  if (
    [
      "createdAt",
      "paidAt",
      "validUntil",
      "lastBookingAt",
      "lastInteractionAt",
      "startDate",
      "endDate",
    ].includes(field)
  )
    return <span className="cd-nowrap">{timestamp(value)}</span>;
  if (["eventDate", "availableDate"].includes(field))
    return <span className="cd-nowrap">{date(value)}</span>;
  if (field === "rating")
    return (
      <span className="cd-rating">
        <Star size={14} fill="currentColor" />
        {value}
        <small>/ 5</small>
      </span>
    );
  if (field === "customer" && row.customerId)
    return (
      <Link className="ad-text-link" to={`/admin/customers/${row.customerId}`}>
        {value}
      </Link>
    );
  if (field === "name" && section === "customers")
    return (
      <Link className="ad-text-link" to={`/admin/customers/${row.id}`}>
        {value}
      </Link>
    );
  return (
    <span
      className={
        [
          "message",
          "review",
          "notes",
          "services",
          "customerNotes",
          "vendorNotes",
          "customerMessage",
          "vendorMessage",
          "description",
        ].includes(field)
          ? "cd-long-text"
          : ""
      }
    >
      {String(value)}
    </span>
  );
}
function Records({ id, section, version, onDocument, compact = false }) {
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
      `/vendors/${id}/records/${section}?page=${page}&pageSize=${size}`,
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
        text={`No ${section === "audit" ? "audit logs" : section} found`}
        description="This vendor has no records in this section yet."
      />
    );
  const cols = compact
    ? columns[section].filter(([key]) =>
        ["number", "customer", "amount", "status", "createdAt"].includes(key),
      )
    : columns[section];
  return (
    <>
      {section === "locations" ? (
        <LocationCards rows={result.rows} />
      ) : section === "documents" ? (
        <div className="vd-documents">
          {result.rows.map((doc) => (
            <article className="vd-document" key={doc.id}>
              <div className="vd-document-top">
                <span className="vd-file-icon">
                  <FileText size={25} />
                </span>
                <Badge>{doc.status}</Badge>
              </div>
              <h3>{doc.type}</h3>
              <dl>
                <Info label="Document number">{doc.number}</Info>
                <Info label="Uploaded on">{timestamp(doc.createdAt)}</Info>
                {doc.verifiedAt && (
                  <Info label="Reviewed on">{timestamp(doc.verifiedAt)}</Info>
                )}
              </dl>
              {doc.reason && <p className="vd-rejection">{doc.reason}</p>}
              <div className="vd-document-actions">
                <button
                  className="ad-button"
                  onClick={() => onDocument("view", doc)}
                >
                  <Eye size={14} /> View
                </button>
                <button
                  className="ad-button vd-approve"
                  disabled={doc.status === "Approved"}
                  onClick={() => onDocument("Approved", doc)}
                >
                  <Check size={14} /> Approve
                </button>
                <button
                  className="ad-button ad-danger"
                  disabled={doc.status === "Rejected"}
                  onClick={() => onDocument("Rejected", doc)}
                >
                  <X size={14} /> Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table cd-table vd-table">
            <caption className="sr-only">Vendor {section}</caption>
            <thead>
              <tr>
                {cols.map(([key, label]) => (
                  <th key={key} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.id}>
                  {cols.map(([key, label]) => (
                    <td key={key} data-label={label}>
                      <Cell field={key} row={row} section={section} />
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

export default function VendorDetailsPage() {
  const { id } = useParams(),
    [params, setParams] = useSearchParams(),
    { notify } = useAuth();
  const [data, setData] = useState(null),
    [error, setError] = useState(null),
    [version, setVersion] = useState(0),
    [dialog, setDialog] = useState(null),
    [decision, setDecision] = useState(null),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(""),
    [viewer, setViewer] = useState(null),
    [loadingDoc, setLoadingDoc] = useState(false);
  const tabRefs = useRef([]),
    previewUrl = useRef(null),
    documentRequest = useRef(null);
  const tab = tabs.some(([key]) => key === params.get("tab"))
    ? params.get("tab")
    : "overview";
  function selectTab(key) {
    setParams(key === "overview" ? {} : { tab: key }, { replace: true });
  }
  useEffect(() => {
    const abort = new AbortController();
    setError(null);
    adminRequest(`/vendors/${id}/details`, { signal: abort.signal })
      .then(setData)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e);
      });
    return () => abort.abort();
  }, [id, version]);
  useEffect(
    () => () => {
      documentRequest.current?.abort();
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [id],
  );
  function open(action, doc = null) {
    if (!doc && decisionActions[action]) {
      setDecision(action);
      return;
    }
    setFormError("");
    setDialog({ action, doc });
  }
  async function onDocument(action, doc) {
    if (action !== "view") {
      open(action, doc);
      return;
    }
    if (loadingDoc) return;
    const abort = new AbortController();
    documentRequest.current = abort;
    setLoadingDoc(true);
    try {
      const blob = await adminRequest(
        `/vendors/${id}/documents/${doc.id}/download`,
        { download: true, signal: abort.signal },
      );
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = URL.createObjectURL(blob);
      setViewer({
        url: previewUrl.current,
        type: blob.type,
        name: doc.type,
        vendorId: id,
      });
    } catch (e) {
      if (e.name !== "AbortError") notify(e.message);
    } finally {
      setLoadingDoc(false);
    }
  }
  function closeViewer() {
    setViewer(null);
    if (previewUrl.current) {
      URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = null;
    }
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const { action, doc } = dialog;
      const internalNote = action === "Note";
      const account = ["Activate", "Deactivate"].includes(action);
      const path = internalNote
        ? `/vendors/${id}/notes`
        : doc
          ? `/vendors/${id}/documents/${doc.id}/review`
          : `/vendors/${id}/${account ? "account" : "review"}`;
      const body = internalNote
        ? { note: fields.note }
        : doc
          ? {
              status: action,
              expectedStatus: doc.status,
              reason: fields.reason || "",
              note: fields.note || "",
            }
          : account
            ? {
                active: action === "Activate",
                expectedActive: !!data.vendor.active,
                note: fields.note,
              }
            : {
                status: action,
                expectedStatus: data.vendor.status,
                reason: fields.reason || "",
                note: fields.note || "",
              };
      const result = await adminRequest(path, {
        method: account ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      notify(result.message);
      vendorChanged();
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
        <Link className="cd-back" to="/admin/vendors">
          <ArrowLeft size={15} /> Back to vendors
        </Link>
        <ErrorState error={error} retry={() => setVersion((v) => v + 1)} />
      </>
    );
  if (!data || data.vendor.id.toLowerCase() !== id.toLowerCase())
    return <Skeleton rows={9} />;
  const { vendor: v, categories, locations, summary: s, revenue: r } = data;
  const primary = locations.find((l) => l.isPrimary) || locations[0];
  const stats = [
    ["services", "Total services", BriefcaseBusiness, "services"],
    ["activeServices", "Active services", CheckCircle2, "services"],
    ["bookings", "Total bookings", CalendarCheck, "bookings"],
    ["completed", "Completed bookings", BadgeCheck, "bookings"],
    ["cancelled", "Cancelled bookings", XCircle, "bookings"],
    ["gross", "Total revenue", CircleDollarSign, "revenue"],
    ["pending", "Pending payout", Wallet, "payouts"],
    ["rating", "Average rating", Star, "reviews"],
    ["reviews", "Total reviews", Star, "reviews"],
  ];
  const revenueCards = [
    ["gross", "Gross revenue"],
    ["commission", "Platform commission"],
    ["tax", "Tax deductions"],
    ["net", "Net earnings"],
    ["paid", "Paid payouts"],
    ["pending", "Pending payouts"],
  ];
  const recordDescriptions = {
    history:
      "Original verification decisions, administrators, reasons and timestamps.",
    coupons:
      "Coupon definitions created for this vendor, including usage and validity.",
    payments:
      "Recorded customer collections for vendor bookings, with original currencies.",
    availability:
      "Recorded availability slots, including unavailable and booked dates.",
    bookings: "Complete booking history, customer notes, and payment balances.",
    quotations:
      "Quotations prepared for customers, including drafts and sent quotations.",
    customers:
      "Customers connected through bookings, quotations or conversations.",
    reviews: "All submitted reviews, including hidden reviews.",
    audit:
      "Vendor, owner and administrator actions. Open a value to inspect its changes.",
    offers: "Vendor-wide offers and promotions linked to their services.",
    messages: "Messages exchanged in this vendor’s customer conversations.",
    services:
      "Service catalogue, approval decisions and current availability for sale.",
    packages: "Package pricing, discounts, guest ranges and active status.",
    documents: "Private verification documents and their review decisions.",
    locations: "Business locations, primary address and operating status.",
    payouts: "Recorded payout transactions, deductions and settlement status.",
  };
  return (
    <div className="cd-page vd-page">
      <div className="cd-topline">
        <Link className="cd-back" to="/admin/vendors">
          <ArrowLeft size={15} /> Vendors <span>/</span> Vendor details
        </Link>
        <span className="cd-secure">
          <ShieldCheck size={14} /> Administrator access
        </span>
      </div>
      <section className="ad-panel vd-header" aria-label="Vendor profile">
        <VendorImage
          key={v.coverUrl}
          src={v.coverUrl}
          alt={`${v.businessName} cover`}
          className="vd-cover"
          cover
        />
        <div className="vd-header-body">
          <div className="vd-header-row">
            <div className="vd-identity">
              <VendorImage
                key={v.logoUrl}
                src={v.logoUrl}
                alt={`${v.businessName} logo`}
                className="vd-logo"
                name={v.businessName}
              />
              <div>
                <div className="ad-eyebrow">VENDOR PROFILE</div>
                <h1>{v.businessName}</h1>
                <div className="vd-badges">
                  <Badge>{v.status}</Badge>
                  <Badge>{v.active ? "Active" : "Inactive"}</Badge>
                  <span>
                    <MapPin size={13} />
                    {primary?.city || "City not provided"}
                  </span>
                </div>
              </div>
            </div>
            <div className="vd-actions">
              {v.status === "Pending" && (
                <button
                  className="ad-button"
                  onClick={() => open("UnderReview")}
                >
                  Start Review
                </button>
              )}
              {v.status === "Rejected" && (
                <button className="ad-button" onClick={() => open("Reapply")}>
                  Reopen Application
                </button>
              )}
              <button
                className="ad-button ad-primary"
                disabled={!canDecide(v.status, "Approved") || !v.emailVerified}
                title={
                  !v.emailVerified
                    ? "Owner email verification is required"
                    : undefined
                }
                onClick={() => open("Approved")}
              >
                <Check size={14} /> Approve Vendor
              </button>
              <button
                className="ad-button ad-danger"
                disabled={!canDecide(v.status, "Rejected")}
                onClick={() => open("Rejected")}
              >
                <X size={14} /> Reject Vendor
              </button>
              <button
                className="ad-button"
                disabled={!canDecide(v.status, "Suspended")}
                onClick={() => open("Suspended")}
              >
                <Ban size={14} /> Suspend Vendor
              </button>
              <button
                className="ad-button"
                disabled={!v.active && v.status !== "Approved"}
                title={
                  !v.active && v.status !== "Approved"
                    ? "Approve the vendor before activation"
                    : undefined
                }
                onClick={() => open(v.active ? "Deactivate" : "Activate")}
              >
                <Power size={14} />
                {v.active ? "Deactivate" : "Activate"}
              </button>
              <button className="ad-button" onClick={() => open("Note")}>
                <FileText size={14} />
                Add internal note
              </button>
            </div>
          </div>
          <div className="vd-contact">
            <span>
              <UserRound size={14} />
              {v.owner}
            </span>
            <span>
              <Mail size={14} />
              {v.email}
            </span>
            <span>
              <Phone size={14} />
              {v.phone || "Phone not provided"}
            </span>
          </div>
          <div className="vd-categories">
            {categories.length ? (
              categories.map((c) => <span key={c.id}>{c.name}</span>)
            ) : (
              <span>No categories selected</span>
            )}
          </div>
          <dl className="vd-header-meta">
            <Info label="Vendor ID">
              <span className="cd-id">{v.id}</span>
            </Info>
            <Info label="Registered on">{timestamp(v.createdAt)}</Info>
            <Info label="Owner email">
              {v.emailVerified ? "Verified" : "Verification required"}
            </Info>
            <Info label="Owner account">
              {v.ownerBlocked
                ? "Blocked"
                : v.ownerActive
                  ? "Active"
                  : "Inactive"}
            </Info>
          </dl>
        </div>
      </section>
      {v.remarks && (
        <div className="vd-decision-note">
          <FileText size={17} />
          <div>
            <strong>Latest review decision</strong>
            <p>{v.remarks}</p>
          </div>
        </div>
      )}
      <div
        className="cd-tabs vd-tabs"
        role="tablist"
        aria-label="Vendor details sections"
      >
        {tabs.map(([key, label], i) => (
          <button
            key={key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            id={`vd-tab-${key}`}
            role="tab"
            aria-selected={tab === key}
            aria-controls="vd-tabpanel"
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
              "services",
              "packages",
              "bookings",
              "quotations",
              "reviews",
              "documents",
            ].includes(key) && <span>{number(s[key])}</span>}
          </button>
        ))}
      </div>
      <div
        id="vd-tabpanel"
        role="tabpanel"
        aria-labelledby={`vd-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "overview" ? (
          <>
            <div className="cd-section-heading">
              <div>
                <h2>A complete view of the business</h2>
                <p>Performance, verification and operations in one place.</p>
              </div>
              <span className="cd-period">Lifetime activity</span>
            </div>
            <div className="cd-stats vd-stats">
              {stats.map(([key, label, Icon, target]) => (
                <button
                  key={key}
                  className={`cd-stat vd-stat-${key}`}
                  onClick={() => selectTab(target)}
                >
                  <div>
                    <span>{label}</span>
                    <Icon size={17} />
                  </div>
                  <strong>
                    {["gross", "pending"].includes(key)
                      ? money(r[key])
                      : key === "rating"
                        ? s.rating == null
                          ? "—"
                          : `${Number(s.rating).toFixed(1)} / 5`
                        : number(s[key])}
                  </strong>
                  <small>
                    {key === "gross"
                      ? "Recognized in payout ledger · INR"
                      : key === "pending"
                        ? "Pending & processing · INR"
                        : key === "rating"
                          ? "Published reviews only"
                          : "View vendor records"}
                    <ArrowUpRight size={12} />
                  </small>
                </button>
              ))}
            </div>
            <div className="vd-overview-grid">
              <div className="vd-overview-main">
                <section className="ad-panel">
                  <div className="ad-panel-heading">
                    <div>
                      <h2>Recent bookings</h2>
                      <p>Latest customer reservations and their status.</p>
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
                <section className="ad-panel vd-business-preview">
                  <div className="ad-panel-heading">
                    <div>
                      <h2>About the business</h2>
                      <p>
                        {categories.map((c) => c.name).join(" · ") ||
                          "Categories not provided"}
                      </p>
                    </div>
                    <Store size={18} />
                  </div>
                  <p className="vd-description">
                    {v.description ||
                      "The vendor has not added a business description."}
                  </p>
                  <button
                    className="ad-text-link"
                    onClick={() => selectTab("business")}
                  >
                    View business information <ArrowUpRight size={14} />
                  </button>
                </section>
              </div>
              <aside className="vd-overview-side">
                <section className="ad-panel vd-readiness">
                  <div className="ad-panel-heading">
                    <h2>Verification checklist</h2>
                    <ShieldCheck size={18} />
                  </div>
                  <ul>
                    <li>
                      <span
                        className={v.emailVerified ? "vd-check" : "vd-wait"}
                      >
                        <BadgeCheck size={17} />
                      </span>
                      <div>
                        <strong>Owner email</strong>
                        <small>
                          {v.emailVerified
                            ? "Email address verified"
                            : "Required before vendor approval"}
                        </small>
                      </div>
                      <Badge>{v.emailVerified ? "Verified" : "Pending"}</Badge>
                    </li>
                    <li>
                      <span className="vd-check">
                        <FileCheck2 size={17} />
                      </span>
                      <div>
                        <strong>Documents reviewed</strong>
                        <small>
                          {number(s.approvedDocuments)} approved of{" "}
                          {number(s.documents)} uploaded
                        </small>
                      </div>
                      <button
                        className="ad-text-link"
                        onClick={() => selectTab("documents")}
                      >
                        Review
                      </button>
                    </li>
                    <li>
                      <span
                        className={locations.length ? "vd-check" : "vd-wait"}
                      >
                        <MapPin size={17} />
                      </span>
                      <div>
                        <strong>Business locations</strong>
                        <small>
                          {number(locations.length)} locations registered
                        </small>
                      </div>
                    </li>
                    <li>
                      <span
                        className={
                          v.ownerActive && !v.ownerBlocked
                            ? "vd-check"
                            : "vd-wait"
                        }
                      >
                        <UserRound size={17} />
                      </span>
                      <div>
                        <strong>Owner account</strong>
                        <small>
                          {v.ownerBlocked
                            ? "Account blocked"
                            : v.ownerActive
                              ? "Account enabled"
                              : "Account disabled"}
                        </small>
                      </div>
                    </li>
                  </ul>
                  <div className="vd-review-footer">
                    <span>Application status</span>
                    <Badge>{v.status}</Badge>
                  </div>
                </section>
                <section className="ad-panel vd-earnings">
                  <Wallet size={22} />
                  <span>Net earnings</span>
                  <strong>{money(r.net)}</strong>
                  <p>After recorded commission and tax deductions.</p>
                  <dl>
                    <Info label="Paid out">{money(r.paid)}</Info>
                    <Info label="Awaiting payout">{money(r.pending)}</Info>
                  </dl>
                  <button
                    className="ad-text-link"
                    onClick={() => selectTab("revenue")}
                  >
                    View revenue breakdown <ArrowUpRight size={14} />
                  </button>
                </section>
              </aside>
            </div>
          </>
        ) : tab === "business" ? (
          <>
            <section className="ad-panel cd-personal">
              <div className="ad-panel-heading">
                <div>
                  <h2>Business information</h2>
                  <p>
                    Legal identity, contact details and marketplace categories.
                  </p>
                </div>
                <BriefcaseBusiness size={19} />
              </div>
              <dl>
                <Info label="Business name">{v.businessName}</Info>
                <Info label="Owner name">{v.owner}</Info>
                <Info label="Business email">{v.businessEmail}</Info>
                <Info label="Business phone">{v.businessPhone}</Info>
                <Info label="Last approved">
                  {v.verifiedAt ? timestamp(v.verifiedAt) : "Not yet recorded"}
                </Info>
                <Info label="Verification cycle">{v.cycle || 1}</Info>
                <Info label="Owner email">{v.ownerEmail}</Info>
                <Info label="Owner phone">{v.ownerPhone}</Info>
                <Info label="GST number">{v.gst}</Info>
                <Info label="PAN number">{v.pan}</Info>
                <Info label="Registered on">{timestamp(v.createdAt)}</Info>
                <Info label="Verification status">
                  <Badge>{v.status}</Badge>
                </Info>
                <Info label="Vendor account">
                  <Badge>{v.active ? "Active" : "Inactive"}</Badge>
                </Info>
                <Info label="Last updated">{timestamp(v.updatedAt)}</Info>
                <Info label="Last approved">
                  {v.verifiedAt ? timestamp(v.verifiedAt) : "Not yet recorded"}
                </Info>
                <Info label="Verification cycle">{v.cycle || 1}</Info>
              </dl>
              <div className="vd-business-description">
                <h3>Business description</h3>
                <p>{v.description || "No description provided."}</p>
                <h3>Business categories</h3>
                <div className="vd-categories">
                  {categories.length
                    ? categories.map((c) => (
                        <span key={c.id}>
                          {c.name}
                          {c.isPrimary ? " · Primary" : ""}
                        </span>
                      ))
                    : "No categories selected"}
                </div>
              </div>
            </section>
            <section className="ad-panel vd-business-locations">
              <div className="ad-panel-heading">
                <h2>Business locations</h2>
                <MapPin size={18} />
              </div>
              {locations.length ? (
                <LocationCards rows={locations} />
              ) : (
                <Empty
                  text="No locations added"
                  description="Business locations will appear here once provided."
                />
              )}
            </section>
          </>
        ) : tab === "categories" ? (
          <section className="ad-panel">
            <div className="ad-panel-heading">
              <h2>Service categories</h2>
            </div>
            {categories.length ? (
              <dl className="ad-details">
                {categories.map((category) => (
                  <div key={category.id}>
                    <dt>
                      {category.isPrimary ? "Primary category" : "Category"}
                    </dt>
                    <dd>
                      <Link
                        to={`/admin/categories?q=${encodeURIComponent(category.name)}`}
                      >
                        {category.name}
                      </Link>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <Empty text="No categories assigned" />
            )}
          </section>
        ) : tab === "revenue" ? (
          <>
            <div className="cd-section-heading">
              <div>
                <h2>Revenue & earnings</h2>
                <p>Recognized amounts from the vendor payout ledger · INR.</p>
              </div>
              <span className="cd-period">Lifetime totals</span>
            </div>
            <div className="cd-stats vd-revenue-stats">
              {revenueCards.map(([key, label]) => (
                <div className={`cd-stat vd-stat-${key}`} key={key}>
                  <div>
                    <span>{label}</span>
                    <CircleDollarSign size={17} />
                  </div>
                  <strong>{money(r[key])}</strong>
                  <small>
                    {key === "pending"
                      ? "Pending and processing payouts"
                      : key === "net"
                        ? "Gross less commission and tax"
                        : "Recorded payout ledger"}
                  </small>
                </div>
              ))}
            </div>
            <div className="vd-collection-note">
              <CircleDollarSign size={20} />
              <div>
                <strong>Customer collections: {money(r.collected)}</strong>
                <p>
                  Successful INR payments received against vendor bookings.
                  Collections may differ from recognized earnings and payouts.
                </p>
              </div>
            </div>
            <section className="ad-panel">
              <div className="ad-panel-heading">
                <div>
                  <h2>Earnings ledger</h2>
                  <p>One row per payout entry, with the recorded deductions.</p>
                </div>
                <span className="cd-period">Read-only ledger</span>
              </div>
              <Records
                key={`${id}-revenue`}
                id={id}
                section="revenue"
                version={version}
              />
            </section>
          </>
        ) : (
          <section className="ad-panel">
            <div className="ad-panel-heading">
              <div>
                <h2>{tabs.find(([key]) => key === tab)?.[1]}</h2>
                <p>{recordDescriptions[tab]}</p>
              </div>
              <span className="cd-period">
                {tab === "availability" ? "Latest dates first" : "Newest first"}
              </span>
            </div>
            {tab === "audit" && (
              <>
                <div className="ad-panel-heading">
                  <h2>Verification cycle history</h2>
                </div>
                <Records
                  key={`${id}-history`}
                  id={id}
                  section="history"
                  version={version}
                />
                <div className="ad-panel-heading">
                  <h2>All audit records</h2>
                </div>
              </>
            )}
            <Records
              key={`${id}-${tab}`}
              id={id}
              section={tab}
              version={version}
              onDocument={onDocument}
            />
          </section>
        )}
      </div>
      <p className="cd-footer">
        <ShieldCheck size={13} /> Review decisions and account changes are
        audited. Times shown in IST. Financial ledgers shown in INR.
      </p>
      {loadingDoc && (
        <div className="vd-loading-document" role="status">
          Opening private document…
        </div>
      )}
      {viewer?.vendorId === id && (
        <AdminDialog title={viewer.name} close={closeViewer}>
          <div className="vd-document-viewer">
            {viewer.type.startsWith("image/") ? (
              <img src={viewer.url} alt={viewer.name} />
            ) : viewer.type === "application/pdf" ? (
              <iframe title={`${viewer.name} document`} src={viewer.url} />
            ) : (
              <p>This file cannot be previewed. Download it to view.</p>
            )}
            <a
              className="ad-button"
              href={viewer.url}
              download={`${viewer.name}.${viewer.type === "application/pdf" ? "pdf" : viewer.type === "image/png" ? "png" : "jpg"}`}
            >
              <Download size={14} /> Download document
            </a>
          </div>
        </AdminDialog>
      )}
      {decision && (
        <VendorDecisionDialog
          vendorId={id}
          action={decision}
          close={() => {
            setDecision(null);
            setVersion((value) => value + 1);
          }}
          onSuccess={(result) => {
            setData((current) => ({
              ...current,
              vendor: {
                ...current.vendor,
                status: result.status,
                active: result.isActive,
                cycle: result.cycle,
                verifiedAt: result.verifiedAt,
              },
            }));
            setVersion((value) => value + 1);
          }}
        />
      )}
      {dialog && (
        <AdminDialog
          title={
            dialog.action === "Note"
              ? "Add internal vendor note"
              : dialog.doc
                ? `${dialog.action === "Approved" ? "Approve" : "Reject"} ${dialog.doc.type}`
                : ["Activate", "Deactivate"].includes(dialog.action)
                  ? `${dialog.action} vendor`
                  : `${{ Approved: "Approve", Rejected: "Reject", Suspended: "Suspend" }[dialog.action]} vendor`
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
            <p className="cd-dialog-note">
              {dialog.action === "Note"
                ? "Append an internal audit note without changing vendor approval or account status."
                : dialog.doc
                  ? `Record a verification decision for ${dialog.doc.type}.`
                  : dialog.action === "Approved"
                    ? `Approve ${v.businessName} for vendor access. This decision will be sent to the owner.`
                    : dialog.action === "Rejected"
                      ? `Reject ${v.businessName}'s application and explain what needs attention.`
                      : dialog.action === "Suspended"
                        ? `Suspend ${v.businessName} and end active owner sessions. Existing records are preserved.`
                        : dialog.action === "Deactivate"
                          ? `Deactivate ${v.businessName} and end active owner sessions. This does not change the verification decision.`
                          : `Activate ${v.businessName}. Existing verification and owner account requirements still apply.`}
            </p>
            {["Rejected", "Suspended"].includes(dialog.action) && (
              <label>
                {dialog.action === "Rejected"
                  ? "Rejection reason"
                  : "Suspension reason"}
                <textarea
                  name="reason"
                  rows={3}
                  required
                  maxLength={1000}
                  placeholder="Explain the decision"
                />
                <small>
                  {dialog.doc
                    ? "Visible in the document review record."
                    : "Shared with the vendor owner."}
                </small>
              </label>
            )}
            <label>
              Internal audit note
              <textarea
                name="note"
                rows={3}
                minLength={
                  ["Activate", "Deactivate", "Note"].includes(dialog.action)
                    ? 3
                    : undefined
                }
                required={["Activate", "Deactivate", "Note"].includes(
                  dialog.action,
                )}
                maxLength={2000}
                placeholder="Add context for your administration team"
              />
            </label>
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
                {busy ? "Saving…" : "Confirm decision"}
              </button>
            </div>
          </form>
        </AdminDialog>
      )}
    </div>
  );
}
