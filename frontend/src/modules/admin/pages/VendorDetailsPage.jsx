import VendorAccessActions from "../components/VendorAccessActions";
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
    <div className="cd-info min-w-0 [&_dt]:text-[#819187] [&_dt]:text-[10px] [&_dt]:tracking-[0.4px] [&_dt]:uppercase [&_dt]:mb-[6px] [&_dd]:text-[#3b5147] [&_dd]:font-[500] [&_dd]:m-[0] [&_dd]:text-[12px] [&_dd]:[overflow-wrap:anywhere]">
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
          <span className="vd-cover-lines absolute w-[440px] h-[440px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#ffffff20] [border-right-width:1px] [border-right-style:solid] [border-right-color:#ffffff20] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#ffffff20] [border-left-width:1px] [border-left-style:solid] [border-left-color:#ffffff20] rounded-[50%] top-[-300px] right-[10%] [box-shadow:0_0_0_35px_#ffffff05,_0_0_0_70px_#ffffff05,_0_0_0_105px_#ffffff05]" />
          <span className="vd-cover-mark absolute right-[32px] [@media(width<=600px)]:right-[19px] bottom-[27px] [@media(width<=600px)]:bottom-[25px] text-[#dce8d9] tracking-[5px] text-[19px] [@media(width<=600px)]:text-[15px] font-[300] [&_>_span]:text-[#d5c79b] [&_small]:block [&_small]:tracking-[3px] [&_small]:text-[7px] [&_small]:text-right [&_small]:mt-[6px] [&_small]:text-[#b2c6b0]">
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
    <div className="cd-address-grid vd-locations grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=600px)]:grid-cols-[1fr] [@media(600px<width<=1200px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[18px] [padding:0_24px_24px]">
      {rows.map((row) => (
        <article className="cd-address [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eae4] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eae4] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eae4] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eae4] p-[21px] rounded-[9px] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-[8px] [&_>_div]:text-[#65816e] [&_h3]:text-[13px] [&_h3]:m-[0] [&_h3]:flex-1 [&_small]:text-[#8c9a8f]" key={row.id}>
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
    <span className="cd-muted text-[#a3afa7]">—</span>
  ) : (
    <details className="vd-audit-value text-[10px] min-w-[90px] [&_summary]:text-[#176b60] [&_summary]:cursor-pointer [&_pre]:whitespace-pre-wrap [&_pre]:[overflow-wrap:anywhere] [&_pre]:max-h-[240px] [&_pre]:[overflow-x:auto] [&_pre]:overflow-y-auto [&_pre]:[background:#f4f7f1] [&_pre]:[border-top-width:1px] [&_pre]:[border-top-style:solid] [&_pre]:[border-top-color:#e5ebdf] [&_pre]:[border-right-width:1px] [&_pre]:[border-right-style:solid] [&_pre]:[border-right-color:#e5ebdf] [&_pre]:[border-bottom-width:1px] [&_pre]:[border-bottom-style:solid] [&_pre]:[border-bottom-color:#e5ebdf] [&_pre]:[border-left-width:1px] [&_pre]:[border-left-style:solid] [&_pre]:[border-left-color:#e5ebdf] [&_pre]:p-[10px] [&_pre]:rounded-[5px] [&_pre]:min-w-[160px] [@media(width<=600px)]:[&_pre]:min-w-0 [&_pre]:max-w-[320px] [&_pre]:text-[10px]">
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
        className="vd-service-image grid place-items-center w-[55px] h-[44px] rounded-[6px] object-cover [background:#f0f4ed] text-[#a2b098]"
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
    return <span className="cd-muted text-[#a3afa7]">—</span>;
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
    return <span className="cd-nowrap whitespace-nowrap text-[11px]">{timestamp(value)}</span>;
  if (["eventDate", "availableDate"].includes(field))
    return <span className="cd-nowrap whitespace-nowrap text-[11px]">{date(value)}</span>;
  if (field === "rating")
    return (
      <span className="cd-rating inline-flex items-center gap-[5px] text-[#b39a56] whitespace-nowrap font-[600] [&_small]:text-[#97a299] [&_small]:font-[400]">
        <Star size={14} fill="currentColor" />
        {value}
        <small>/ 5</small>
      </span>
    );
  if (field === "customer" && row.customerId)
    return (
      <Link className="ad-text-link flex items-center gap-[5px] text-[#5a8671] text-[10px] whitespace-nowrap" to={`/admin/customers/${row.customerId}`}>
        {value}
      </Link>
    );
  if (field === "name" && section === "customers")
    return (
      <Link className="ad-text-link flex items-center gap-[5px] text-[#5a8671] text-[10px] whitespace-nowrap" to={`/admin/customers/${row.id}`}>
        {value}
      </Link>
    );
  return (
    <span
      className={[
          "message",
          "review",
          "notes",
          "services",
          "customerNotes",
          "vendorNotes",
          "customerMessage",
          "vendorMessage",
          "description",
        ].includes(field) ? "cd-long-text block min-w-[150px] max-w-[300px] whitespace-pre-wrap [overflow-wrap:anywhere]" : ""}
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
        <div className="vd-documents grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=600px)]:grid-cols-[1fr] [@media(600px<width<=1200px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[18px] [padding:0_24px_24px] [@media(width<=600px)]:[padding:0_17px_17px]">
          {result.rows.map((doc) => (
            <article className="vd-document [border-top-width:1px] [border-top-style:solid] [border-top-color:#e3e9df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e3e9df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e3e9df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e3e9df] rounded-[10px] p-[21px] flex flex-col [&_h3]:text-[14px] [&_h3]:[margin:0_0_19px] [&_h3]:font-[600] [&_h3]:text-[#425a3e] [&_dl]:grid [&_dl]:gap-[16px] [&_dl]:[margin:0_0_22px]" key={doc.id}>
              <div className="vd-document-top flex items-center justify-between gap-[10px] mb-[17px]">
                <span className="vd-file-icon grid place-items-center w-[47px] h-[51px] rounded-[9px] [background:#f1f5ee] text-[#7e9870]">
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
              {doc.reason && <p className="vd-rejection text-[#b06c5f]! p-[10px] rounded-[5px] [background:#fdf2ee] whitespace-pre-wrap [overflow-wrap:anywhere]">{doc.reason}</p>}
              <div className="vd-document-actions flex flex-wrap gap-[6px] pt-[16px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edf1e8] mt-[auto]">
                <button
                  className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                  onClick={() => onDocument("view", doc)}
                >
                  <Eye size={14} /> View
                </button>
                <button
                  className="ad-button vd-approve inline-flex justify-center items-center gap-[7px] [background:#f3f7ef] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#5a8050] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                  disabled={doc.status === "Approved"}
                  onClick={() => onDocument("Approved", doc)}
                >
                  <Check size={14} /> Approve
                </button>
                <button
                  className="ad-button ad-danger inline-flex justify-center items-center gap-[7px] [background:#fff8f5] [border-top-width:1px] [border-top-style:solid] [border-top-color:#efd7d3] [border-right-width:1px] [border-right-style:solid] [border-right-color:#efd7d3] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#efd7d3] [border-left-width:1px] [border-left-style:solid] [border-left-color:#efd7d3] rounded-[7px] [padding:8px_12px] text-[#b25454] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f9e8e3] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff]"
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
        <div className="ad-table-wrap w-full min-w-0">
          <table className="ad-table cd-table vd-table w-full border-collapse [table-layout:fixed] text-[10px] [@media(width<=1200px)]:text-[9px] text-left [&_th]:[background:#fafbf8] [&_th]:text-[#94a08f] [&_th]:tracking-[0.3px] [&_th]:text-[9px] [&_th]:font-[500] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#eaf0e6] [&_th]:[padding:12px_17px] [@media(width<=1200px)]:[&_th]:[padding:12px_10px] [&_th]:[overflow-wrap:anywhere] [&_th_button]:flex [&_th_button]:items-center [&_th_button]:gap-[4px] [&_th_button]:max-w-full [&_th_button]:text-left [&_th_button]:[border-top-width:0] [&_th_button]:[border-top-style:none] [&_th_button]:[border-top-color:currentColor] [&_th_button]:[border-right-width:0] [&_th_button]:[border-right-style:none] [&_th_button]:[border-right-color:currentColor] [&_th_button]:[border-bottom-width:0] [&_th_button]:[border-bottom-style:none] [&_th_button]:[border-bottom-color:currentColor] [&_th_button]:[border-left-width:0] [&_th_button]:[border-left-style:none] [&_th_button]:[border-left-color:currentColor] [&_th_button]:[background:none] [&_th_button]:text-[inherit] [&_th_button]:p-[0] [&_td]:[padding:15px_17px] [@media(width<=767px)]:[&_td]:p-[0] [@media(767px<width<=1200px)]:[&_td]:[padding:12px_10px] [&_td]:[border-bottom-width:1px] [@media(width<=767px)]:[&_td]:[border-bottom-width:0] [&_td]:[border-bottom-style:solid] [@media(width<=767px)]:[&_td]:[border-bottom-style:none] [&_td]:[border-bottom-color:#f0f3ec] [@media(width<=767px)]:[&_td]:[border-bottom-color:currentColor] [&_td]:text-[#758570] [&_td]:[overflow-wrap:anywhere] [&_td]:[vertical-align:top] [&_tbody_tr:last-child_td]:[border-bottom-width:0] [&_tbody_tr:last-child_td]:[border-bottom-style:none] [&_tbody_tr:last-child_td]:[border-bottom-color:currentColor] [&_tbody_tr:hover]:[background:#fcfdf9] [@media(width<=767px)]:[&_thead]:hidden [@media(width<=767px)]:block [@media(width<=767px)]:[&_tbody]:block [@media(width<=767px)]:[&_tbody]:w-full [@media(width<=767px)]:[&_tr]:block [@media(width<=767px)]:[&_tr]:w-full [@media(width<=767px)]:[&_td]:block [@media(width<=767px)]:[&_td]:w-full [@media(width<=767px)]:[&_tbody_tr]:[padding:13px_16px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-width:1px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-style:solid] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-color:#e9eee4] [@media(width<=767px)]:[&_tbody_tr]:grid [@media(width<=767px)]:[&_tbody_tr]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:[&_tbody_tr]:gap-[11px_17px] [@media(width<=767px)]:[&_td]:[border-top-width:0] [@media(width<=767px)]:[&_td]:[border-top-style:none] [@media(width<=767px)]:[&_td]:[border-top-color:currentColor] [@media(width<=767px)]:[&_td]:[border-right-width:0] [@media(width<=767px)]:[&_td]:[border-right-style:none] [@media(width<=767px)]:[&_td]:[border-right-color:currentColor] [@media(width<=767px)]:[&_td]:[border-left-width:0] [@media(width<=767px)]:[&_td]:[border-left-style:none] [@media(width<=767px)]:[&_td]:[border-left-color:currentColor] [@media(width<=767px)]:[&_td]:text-[10px] [@media(width<=767px)]:[&_td]:min-w-0 [@media(width<=767px)]:[&_td:before]:[content:attr(data-label)] [@media(width<=767px)]:[&_td:before]:block [@media(width<=767px)]:[&_td:before]:text-[8px] [@media(width<=767px)]:[&_td:before]:text-[#a1ad96] [@media(width<=767px)]:[&_td:before]:mb-[4px] [@media(width<=767px)]:[&_td:first-child]:col-[1/-1] [@media(width<=767px)]:[&_td:last-child_.ad-row-actions]:ml-[-5px] [&_th]:whitespace-nowrap [&_td]:max-w-[300px] [@media(width<=600px)]:[&_td]:max-w-[none] [@media(width<=600px)]:[&_.cd-long-text]:min-w-0 [@media(width<=600px)]:[&_.cd-long-text]:max-w-[none] [@media(width<=600px)]:[&_.cd-nowrap]:[white-space:normal]">
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
        <div className="cd-pagination flex items-center [&_>_div]:flex [&_>_div]:items-center justify-between gap-[15px] [padding:17px_23px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edf1ed] text-[11px] text-[#839087] [&_>_div]:gap-[12px] [@media(width<=600px)]:flex-col">
          <span>
            {number((page - 1) * size + 1)}–
            {number(Math.min(page * size, result.total))} of{" "}
            {number(result.total)} records
          </span>
          <div>
            <button
              className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
              className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
        <Link className="cd-back flex items-center text-[#647a70] gap-[9px] text-[12px] no-underline [&_>_span]:text-[#c2cdc7] [&_>_span]:[margin:0_3px]" to="/admin/vendors">
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
    <div className="cd-page vd-page w-full min-w-0 max-w-[1720px] [margin:0_auto]">
      <div className="cd-topline flex items-center justify-between [margin:0_0_20px] gap-[12px] [@media(width<=600px)]:mb-[15px]">
        <Link className="cd-back flex items-center text-[#647a70] gap-[9px] text-[12px] no-underline [&_>_span]:text-[#c2cdc7] [&_>_span]:[margin:0_3px]" to="/admin/vendors">
          <ArrowLeft size={15} /> Vendors <span>/</span> Vendor details
        </Link>
        <span className="cd-secure flex [@media(width<=600px)]:hidden items-center text-[#6c8277] gap-[6px] text-[11px]">
          <ShieldCheck size={14} /> Administrator access
        </span>
      </div>
      <section className="ad-panel vd-header [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]" aria-label="Vendor profile">
        <VendorImage
          key={v.coverUrl}
          src={v.coverUrl}
          alt={`${v.businessName} cover`}
          className="vd-cover block w-full h-[166px] [@media(width<=600px)]:h-[125px] object-cover relative [&.vd-image-fallback]:block [&.vd-image-fallback]:[background:linear-gradient(115deg,_#143f35,_#2e5d4b_55%,_#6c8767)] [&.vd-image-fallback]:[overflow-x:hidden] [&.vd-image-fallback]:[overflow-y:hidden]"
          cover
        />
        <div className="vd-header-body [padding:0_28px_0] [@media(width<=600px)]:[padding:0_17px]">
          <div className="vd-header-row flex items-center [@media(width<=1200px)]:items-start justify-between gap-[22px] [@media(width<=1000px)]:gap-[0] [@media(width<=1000px)]:flex-col">
            <div className="vd-identity flex items-center [@media(width<=600px)]:items-start gap-[20px] [@media(width<=600px)]:gap-[13px] min-w-0 pt-[20px]">
              <VendorImage
                key={v.logoUrl}
                src={v.logoUrl}
                alt={`${v.businessName} logo`}
                className="vd-logo w-[91px] [@media(width<=600px)]:w-[65px] h-[91px] [@media(width<=600px)]:h-[65px] object-cover shrink-0 [border-top-width:5px] [border-top-style:solid] [border-top-color:white] [border-right-width:5px] [border-right-style:solid] [border-right-color:white] [border-bottom-width:5px] [border-bottom-style:solid] [border-bottom-color:white] [border-left-width:5px] [border-left-style:solid] [border-left-color:white] rounded-[18px] [@media(width<=600px)]:rounded-[12px] [background:#eef3ed] [box-shadow:0_0_0_1px_#e3e9e1] mt-[-49px] [@media(width<=600px)]:mt-[-50px] relative [&.vd-image-fallback]:grid [&.vd-image-fallback]:place-items-center [&.vd-image-fallback]:text-[#577755] [&.vd-image-fallback]:text-[30px] [&.vd-image-fallback]:font-[600]"
                name={v.businessName}
              />
              <div>
                <div className="ad-eyebrow text-[8px] [@media(width<=767px)]:text-[7px] tracking-[1.7px] text-[#7d9183] flex items-center gap-[6px] [&_>_span]:w-[5px] [&_>_span]:h-[5px] [&_>_span]:[background:#bfa471] [&_>_span]:rounded-[50%]">VENDOR PROFILE</div>
                <h1>{v.businessName}</h1>
                <div className="vd-badges flex items-center [&_>_span:last-child]:flex [&_>_span:last-child]:items-center flex-wrap gap-[8px] [@media(width<=600px)]:gap-[6px] [&_>_span:last-child]:gap-[4px] [&_>_span:last-child]:text-[#82907e] [&_>_span:last-child]:text-[11px]">
                  <Badge>{v.status}</Badge>
                  <Badge>{v.active ? "Active" : "Inactive"}</Badge>
                  <span>
                    <MapPin size={13} />
                    {primary?.city || "City not provided"}
                  </span>
                </div>
              </div>
            </div>
            <div className="vd-actions flex items-center justify-end [@media(width<=1000px)]:justify-start gap-[8px] [@media(width<=600px)]:gap-[6px] flex-wrap pt-[22px] max-w-[420px] [@media(width<=1000px)]:max-w-[none] [@media(1000px<width<=1200px)]:max-w-[285px] [&_>_button]:[flex:0_0_auto] [@media(width<=600px)]:[&_>_button]:text-[9px] [@media(width<=600px)]:[&_>_button]:[padding:7px_9px]">
              {v.status === "Pending" && (
                <button
                  className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                  onClick={() => open("UnderReview")}
                >
                  Start Review
                </button>
              )}
              {v.status === "Rejected" && (
                <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={() => open("Reapply")}>
                  Reopen Application
                </button>
              )}
              <button
                className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
                className="ad-button ad-danger inline-flex justify-center items-center gap-[7px] [background:#fff8f5] [border-top-width:1px] [border-top-style:solid] [border-top-color:#efd7d3] [border-right-width:1px] [border-right-style:solid] [border-right-color:#efd7d3] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#efd7d3] [border-left-width:1px] [border-left-style:solid] [border-left-color:#efd7d3] rounded-[7px] [padding:8px_12px] text-[#b25454] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f9e8e3] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff]"
                disabled={!canDecide(v.status, "Rejected")}
                onClick={() => open("Rejected")}
              >
                <X size={14} /> Reject Vendor
              </button>
              <button
                className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                disabled={!canDecide(v.status, "Suspended")}
                onClick={() => open("Suspended")}
              >
                <Ban size={14} /> Suspend Vendor
              </button>
              <button
                className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
              <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={() => open("Note")}>
                <FileText size={14} />
                Add internal note
              </button>
              <VendorAccessActions key={id} vendorId={id} refreshKey={version} onChange={() => setVersion(value => value + 1)} />
            </div>
          </div>
          <div className="vd-contact flex items-center [@media(width<=600px)]:items-start [&_>_span]:flex [&_>_span]:items-center gap-[22px] [@media(width<=600px)]:gap-[9px] flex-wrap text-[#73816c] mt-[23px] [@media(width<=600px)]:mt-[18px] [&_>_span]:gap-[7px] [&_>_span]:text-[12px] [@media(width<=600px)]:[&_>_span]:text-[11px] [&_>_span]:[overflow-wrap:anywhere] [&_>_span]:min-w-0 [@media(width<=600px)]:flex-col">
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
          <div className="vd-categories flex items-center flex-wrap gap-[6px] [margin:17px_0_22px] [&_>_span]:text-[10px] [&_>_span]:text-[#687d61] [&_>_span]:[background:#f0f4ed] [&_>_span]:[border-top-width:1px] [&_>_span]:[border-top-style:solid] [&_>_span]:[border-top-color:#e4ebdf] [&_>_span]:[border-right-width:1px] [&_>_span]:[border-right-style:solid] [&_>_span]:[border-right-color:#e4ebdf] [&_>_span]:[border-bottom-width:1px] [&_>_span]:[border-bottom-style:solid] [&_>_span]:[border-bottom-color:#e4ebdf] [&_>_span]:[border-left-width:1px] [&_>_span]:[border-left-style:solid] [&_>_span]:[border-left-color:#e4ebdf] [&_>_span]:rounded-[5px] [&_>_span]:[padding:3px_8px]">
            {categories.length ? (
              categories.map((c) => <span key={c.id}>{c.name}</span>)
            ) : (
              <span>No categories selected</span>
            )}
          </div>
          <dl className="vd-header-meta grid grid-cols-[1.4fr_1fr_1fr_0.8fr] [@media(width<=600px)]:grid-cols-[1fr] [@media(600px<width<=1000px)]:grid-cols-[1fr_1fr] [@media(1000px<width<=1200px)]:grid-cols-[1.4fr_1fr_1fr] gap-[22px] [@media(width<=600px)]:gap-[15px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edf0e9] m-[0] [padding:20px_0_23px] [@media(width<=1200px)]:[&_>_div:last-child]:hidden">
            <Info label="Vendor ID">
              <span className="cd-id [font-family:ui-monospace,_monospace] text-[11px] text-[#728078]">{v.id}</span>
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
        <div className="vd-decision-note flex gap-[11px] items-start [background:#faf5e9] [border-top-width:1px] [border-top-style:solid] [border-top-color:#eee3c8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#eee3c8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#eee3c8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#eee3c8] rounded-[8px] mt-[17px] [padding:14px_18px] text-[#ab905a] [&_strong]:text-[11px] [&_strong]:font-[500] [&_p]:text-[#998461] [&_p]:[margin:4px_0_0] [&_p]:whitespace-pre-wrap [&_p]:[overflow-wrap:anywhere]">
          <FileText size={17} />
          <div>
            <strong>Latest review decision</strong>
            <p>{v.remarks}</p>
          </div>
        </div>
      )}
      <div
        className="cd-tabs vd-tabs flex [overflow-x:visible] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dde6df] gap-[22px] [margin:24px_0_27px] [scrollbar-width:thin] [&_button]:flex [&_button]:items-center [&_button]:gap-[7px] [&_button]:whitespace-nowrap [&_button]:[border-top-width:0] [&_button]:[border-top-style:none] [&_button]:[border-top-color:currentColor] [&_button]:[border-right-width:0] [&_button]:[border-right-style:none] [&_button]:[border-right-color:currentColor] [&_button]:[border-bottom-width:2px] [&_button]:[border-bottom-style:solid] [&_button]:[border-bottom-color:transparent] [&_button]:[border-left-width:0] [&_button]:[border-left-style:none] [&_button]:[border-left-color:currentColor] [&_button]:[background:transparent] [&_button]:text-[#7b897f] [&_button]:[padding:0_0_15px] [&_button]:text-[12px] [&_button]:cursor-pointer [&_button.selected]:text-[#176b60] [&_button.selected]:[border-bottom-color:#176b60] [&_button.selected]:font-[600] [&_button_>_span]:text-[10px] [&_button_>_span]:rounded-[5px] [&_button_>_span]:[background:#e8eee9] [&_button_>_span]:text-[#6b8174] [&_button_>_span]:[padding:1px_5px] [&_button.selected_>_span]:[background:#dfeee6] [&_button.selected_>_span]:text-[#27725a] [&_button:focus-visible]:[outline:2px_solid_#176b60] [&_button:focus-visible]:[outline-offset:-2px] flex-wrap [overflow-y:visible] gap-y-[0] [&_button]:pt-[10px] [&_button]:pb-[10px]"
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
            <div className="cd-section-heading flex items-center justify-between mb-[17px] gap-[14px]">
              <div>
                <h2>A complete view of the business</h2>
                <p>Performance, verification and operations in one place.</p>
              </div>
              <span className="cd-period text-[10px] text-[#85958a] whitespace-nowrap">Lifetime activity</span>
            </div>
            <div className="cd-stats vd-stats grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=600px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[14px] [@media(width<=600px)]:gap-[10px] mb-[24px] [@media(width<=600px)]:[&_.cd-stat:last-child]:col-[1/-1]">
              {stats.map(([key, label, Icon, target]) => (
                <button
                  key={key}
                  className={`cd-stat [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e2e9e3] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e2e9e3] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e2e9e3] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e2e9e3] rounded-[10px] [padding:17px_19px_14px] [@media(width<=600px)]:[padding:14px_12px] text-left [transition:border-color_0.2s,_transform_0.2s] min-w-0 cursor-pointer [&:hover]:[border-top-color:#6eaa91] [&:hover]:[border-right-color:#6eaa91] [&:hover]:[border-bottom-color:#6eaa91] [&:hover]:[border-left-color:#6eaa91] [&:hover]:[transform:translateY(-2px)] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:justify-between [&_>_div]:text-[#798d7e] [&_>_div]:gap-[8px] [&_>_div_>_span]:text-[11px] [@media(width<=600px)]:[&_>_div_>_span]:text-[10px] [&_>_div_>_span]:text-[#6c7e72] [&_>_strong]:block [&_>_strong]:text-[clamp(20px,_2vw,_29px)] [&_>_strong]:font-[600] [&_>_strong]:tracking-[-0.7px] [&_>_strong]:text-[#2f4a3c] [&_>_strong]:[margin:10px_0_8px] [&_>_strong]:[overflow-wrap:anywhere] [&_>_small]:flex [&_>_small]:items-center [&_>_small]:justify-between [&_>_small]:gap-[8px] [&_>_small]:text-[#92a095] [&_>_small]:text-[9px] [@media(width<=600px)]:[&_>_small]:text-[8px] [&_>_small]:font-[400] [&.cd-stat-spending]:[background:#edf5ef] [&.cd-stat-spending]:[border-top-color:#d7e7db] [&.cd-stat-spending]:[border-right-color:#d7e7db] [&.cd-stat-spending]:[border-bottom-color:#d7e7db] [&.cd-stat-spending]:[border-left-color:#d7e7db] [&.cd-stat-spending_>_div]:text-[#438963] [&.cd-stat-completed_>_div]:text-[#438963] [&.cd-stat-cancelled_>_div]:text-[#bd7b77] [&.cd-stat-pending_>_div]:text-[#b89954] [&.cd-stat-reviews_>_div]:text-[#b89954] [&.vd-stat-gross]:[background:#eef5ef] [&.vd-stat-gross]:[border-top-color:#dae7d8] [&.vd-stat-gross]:[border-right-color:#dae7d8] [&.vd-stat-gross]:[border-bottom-color:#dae7d8] [&.vd-stat-gross]:[border-left-color:#dae7d8] [&.vd-stat-pending_>_div]:text-[#b59b5c] [&.vd-stat-rating_>_div]:text-[#b59b5c] [&.vd-stat-reviews_>_div]:text-[#b59b5c] vd-stat-${key}`}
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
            <div className="vd-overview-grid grid grid-cols-[minmax(0,_1fr)_320px] [@media(width<=1000px)]:grid-cols-[1fr] [@media(1000px<width<=1200px)]:grid-cols-[minmax(0,_1fr)_280px] [align-items:start] gap-[22px] [@media(width<=1200px)]:gap-[16px]">
              <div className="vd-overview-main grid gap-[22px] min-w-0">
                <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
                  <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
                    <div>
                      <h2>Recent bookings</h2>
                      <p>Latest customer reservations and their status.</p>
                    </div>
                    <button
                      className="ad-text-link flex items-center gap-[5px] text-[#5a8671] text-[10px] whitespace-nowrap"
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
                <section className="ad-panel vd-business-preview [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden] [&_>_button]:[margin:0_24px_22px]">
                  <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
                    <div>
                      <h2>About the business</h2>
                      <p>
                        {categories.map((c) => c.name).join(" · ") ||
                          "Categories not provided"}
                      </p>
                    </div>
                    <Store size={18} />
                  </div>
                  <p className="vd-description [padding:0_24px] [margin:0_0_20px] whitespace-pre-wrap [overflow-wrap:anywhere] leading-[1.9] text-[#687e69]!">
                    {v.description ||
                      "The vendor has not added a business description."}
                  </p>
                  <button
                    className="ad-text-link flex items-center gap-[5px] text-[#5a8671] text-[10px] whitespace-nowrap"
                    onClick={() => selectTab("business")}
                  >
                    View business information <ArrowUpRight size={14} />
                  </button>
                </section>
              </div>
              <aside className="vd-overview-side grid gap-[22px] min-w-0 [@media(width<=600px)]:grid-cols-[1fr] [@media(600px<width<=1000px)]:grid-cols-[1fr_1fr]">
                <section className="ad-panel vd-readiness [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden] [&_ul]:[list-style:none] [&_ul]:[padding:0_22px] [&_ul]:m-[0] [&_li]:flex [&_li]:items-start [&_li]:gap-[10px] [&_li]:[padding:17px_0] [&_li]:[border-top-width:1px] [&_li]:[border-top-style:solid] [&_li]:[border-top-color:#eff2eb] [&_li_>_div]:flex [&_li_>_div]:flex-1 [&_li_>_div]:flex-col [&_li_>_div]:gap-[4px] [&_li_strong]:text-[11px] [&_li_strong]:text-[#4d644c] [&_li_strong]:font-[500] [&_li_small]:text-[10px] [&_li_small]:text-[#92a088]">
                  <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
                    <h2>Verification checklist</h2>
                    <ShieldCheck size={18} />
                  </div>
                  <ul>
                    <li>
                      <span
                        className={v.emailVerified ? "vd-check text-[#60905e]" : "vd-wait text-[#b39b65]"}
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
                      <span className="vd-check text-[#60905e]">
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
                        className="ad-text-link flex items-center gap-[5px] text-[#5a8671] text-[10px] whitespace-nowrap"
                        onClick={() => selectTab("documents")}
                      >
                        Review
                      </button>
                    </li>
                    <li>
                      <span
                        className={locations.length ? "vd-check text-[#60905e]" : "vd-wait text-[#b39b65]"}
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
                        className={v.ownerActive && !v.ownerBlocked ? "vd-check text-[#60905e]" : "vd-wait text-[#b39b65]"}
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
                  <div className="vd-review-footer flex items-center justify-between [padding:16px_22px] [background:#f8faf5] text-[10px] text-[#8d9a82] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edf1e7] rounded-[0_0_10px_10px]">
                    <span>Application status</span>
                    <Badge>{v.status}</Badge>
                  </div>
                </section>
                <section className="ad-panel vd-earnings [background:#f0f5ec] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e8d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e8d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e8d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e8d8] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden] p-[24px] [&_>_svg]:text-[#789b65] [&_>_svg]:mb-[12px] [&_>_span]:block [&_>_span]:text-[11px] [&_>_span]:text-[#7f9073] [&_>_strong]:block [&_>_strong]:text-[#365631] [&_>_strong]:text-[30px] [&_>_strong]:font-[600] [&_>_strong]:[margin:7px_0] [&_>_strong]:tracking-[-0.7px] [&_>_strong]:[overflow-wrap:anywhere] [&_dl]:grid [&_dl]:grid-cols-[1fr_1fr] [&_dl]:gap-[12px] [&_dl]:[border-top-width:1px] [&_dl]:[border-top-style:solid] [&_dl]:[border-top-color:#dfe8d7] [&_dl]:pt-[17px] [&_dl]:[margin:0_0_22px]">
                  <Wallet size={22} />
                  <span>Net earnings</span>
                  <strong>{money(r.net)}</strong>
                  <p>After recorded commission and tax deductions.</p>
                  <dl>
                    <Info label="Paid out">{money(r.paid)}</Info>
                    <Info label="Awaiting payout">{money(r.pending)}</Info>
                  </dl>
                  <button
                    className="ad-text-link flex items-center gap-[5px] text-[#5a8671] text-[10px] whitespace-nowrap"
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
            <section className="ad-panel cd-personal [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden] [&_dl]:grid [&_dl]:grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=600px)]:[&_dl]:grid-cols-[1fr] [@media(600px<width<=1000px)]:[&_dl]:grid-cols-[1fr_1fr] [&_dl]:gap-[32px] [&_dl]:m-[0] [&_dl]:[padding:2px_24px_26px] [&_dl]:pt-[12px]">
              <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
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
              <div className="vd-business-description [padding:0_24px_24px] [&_h3]:text-[12px] [&_h3]:text-[#53694d] [&_h3]:[margin:0_0_10px] [&_h3]:font-[600] [&_>_p]:whitespace-pre-wrap [&_>_p]:leading-[1.9] [&_>_p]:[margin:0_0_24px] [&_>_p]:[overflow-wrap:anywhere] [&_.vd-categories]:mb-[0]">
                <h3>Business description</h3>
                <p>{v.description || "No description provided."}</p>
                <h3>Business categories</h3>
                <div className="vd-categories flex items-center flex-wrap gap-[6px] [margin:17px_0_22px] [&_>_span]:text-[10px] [&_>_span]:text-[#687d61] [&_>_span]:[background:#f0f4ed] [&_>_span]:[border-top-width:1px] [&_>_span]:[border-top-style:solid] [&_>_span]:[border-top-color:#e4ebdf] [&_>_span]:[border-right-width:1px] [&_>_span]:[border-right-style:solid] [&_>_span]:[border-right-color:#e4ebdf] [&_>_span]:[border-bottom-width:1px] [&_>_span]:[border-bottom-style:solid] [&_>_span]:[border-bottom-color:#e4ebdf] [&_>_span]:[border-left-width:1px] [&_>_span]:[border-left-style:solid] [&_>_span]:[border-left-color:#e4ebdf] [&_>_span]:rounded-[5px] [&_>_span]:[padding:3px_8px]">
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
            <section className="ad-panel vd-business-locations [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden] mt-[22px]">
              <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
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
          <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
            <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
              <h2>Service categories</h2>
            </div>
            {categories.length ? (
              <dl className="ad-details grid grid-cols-[1fr_1fr] gap-[18px] [@media(width<=767px)]:gap-[15px] [margin:0_0_22px] [&_>_div]:min-w-0 [&_dt]:text-[10px] [&_dt]:text-[#98a38e] [&_dt]:mb-[5px] [&_dd]:text-[12px] [&_dd]:m-[0] [&_dd]:[overflow-wrap:anywhere]">
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
            <div className="cd-section-heading flex items-center justify-between mb-[17px] gap-[14px]">
              <div>
                <h2>Revenue & earnings</h2>
                <p>Recognized amounts from the vendor payout ledger · INR.</p>
              </div>
              <span className="cd-period text-[10px] text-[#85958a] whitespace-nowrap">Lifetime totals</span>
            </div>
            <div className="cd-stats vd-revenue-stats grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=600px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[14px] [@media(width<=600px)]:gap-[10px] mb-[24px] [&_.cd-stat]:[cursor:default] [&_.cd-stat:hover]:[transform:none] [&_.cd-stat:hover]:[border-top-color:#e2e9e3] [&_.cd-stat:hover]:[border-right-color:#e2e9e3] [&_.cd-stat:hover]:[border-bottom-color:#e2e9e3] [&_.cd-stat:hover]:[border-left-color:#e2e9e3]">
              {revenueCards.map(([key, label]) => (
                <div className={`cd-stat [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e2e9e3] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e2e9e3] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e2e9e3] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e2e9e3] rounded-[10px] [padding:17px_19px_14px] [@media(width<=600px)]:[padding:14px_12px] text-left [transition:border-color_0.2s,_transform_0.2s] min-w-0 cursor-pointer [&:hover]:[border-top-color:#6eaa91] [&:hover]:[border-right-color:#6eaa91] [&:hover]:[border-bottom-color:#6eaa91] [&:hover]:[border-left-color:#6eaa91] [&:hover]:[transform:translateY(-2px)] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:justify-between [&_>_div]:text-[#798d7e] [&_>_div]:gap-[8px] [&_>_div_>_span]:text-[11px] [@media(width<=600px)]:[&_>_div_>_span]:text-[10px] [&_>_div_>_span]:text-[#6c7e72] [&_>_strong]:block [&_>_strong]:text-[clamp(20px,_2vw,_29px)] [&_>_strong]:font-[600] [&_>_strong]:tracking-[-0.7px] [&_>_strong]:text-[#2f4a3c] [&_>_strong]:[margin:10px_0_8px] [&_>_strong]:[overflow-wrap:anywhere] [&_>_small]:flex [&_>_small]:items-center [&_>_small]:justify-between [&_>_small]:gap-[8px] [&_>_small]:text-[#92a095] [&_>_small]:text-[9px] [@media(width<=600px)]:[&_>_small]:text-[8px] [&_>_small]:font-[400] [&.cd-stat-spending]:[background:#edf5ef] [&.cd-stat-spending]:[border-top-color:#d7e7db] [&.cd-stat-spending]:[border-right-color:#d7e7db] [&.cd-stat-spending]:[border-bottom-color:#d7e7db] [&.cd-stat-spending]:[border-left-color:#d7e7db] [&.cd-stat-spending_>_div]:text-[#438963] [&.cd-stat-completed_>_div]:text-[#438963] [&.cd-stat-cancelled_>_div]:text-[#bd7b77] [&.cd-stat-pending_>_div]:text-[#b89954] [&.cd-stat-reviews_>_div]:text-[#b89954] [&.vd-stat-gross]:[background:#eef5ef] [&.vd-stat-gross]:[border-top-color:#dae7d8] [&.vd-stat-gross]:[border-right-color:#dae7d8] [&.vd-stat-gross]:[border-bottom-color:#dae7d8] [&.vd-stat-gross]:[border-left-color:#dae7d8] [&.vd-stat-pending_>_div]:text-[#b59b5c] [&.vd-stat-rating_>_div]:text-[#b59b5c] [&.vd-stat-reviews_>_div]:text-[#b59b5c] vd-stat-${key}`} key={key}>
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
            <div className="vd-collection-note flex items-center [@media(width<=600px)]:items-start gap-[14px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e2eadc] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e2eadc] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e2eadc] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e2eadc] [background:#f1f6ec] rounded-[9px] [padding:17px_22px] [margin:0_0_23px] text-[#6f8f60] [&_strong]:text-[12px] [&_strong]:text-[#5a7650] [&_strong]:font-[500] [&_p]:[margin:4px_0_0] [&_p]:text-[10px]">
              <CircleDollarSign size={20} />
              <div>
                <strong>Customer collections: {money(r.collected)}</strong>
                <p>
                  Successful INR payments received against vendor bookings.
                  Collections may differ from recognized earnings and payouts.
                </p>
              </div>
            </div>
            <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
              <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
                <div>
                  <h2>Earnings ledger</h2>
                  <p>One row per payout entry, with the recorded deductions.</p>
                </div>
                <span className="cd-period text-[10px] text-[#85958a] whitespace-nowrap">Read-only ledger</span>
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
          <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
            <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
              <div>
                <h2>{tabs.find(([key]) => key === tab)?.[1]}</h2>
                <p>{recordDescriptions[tab]}</p>
              </div>
              <span className="cd-period text-[10px] text-[#85958a] whitespace-nowrap">
                {tab === "availability" ? "Latest dates first" : "Newest first"}
              </span>
            </div>
            {tab === "audit" && (
              <>
                <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
                  <h2>Verification cycle history</h2>
                </div>
                <Records
                  key={`${id}-history`}
                  id={id}
                  section="history"
                  version={version}
                />
                <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
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
      <p className="cd-footer flex items-center [@media(width<=600px)]:items-start justify-center gap-[6px] mt-[24px] text-[10px]! [@media(width<=600px)]:text-center">
        <ShieldCheck size={13} /> Review decisions and account changes are
        audited. Times shown in IST. Financial ledgers shown in INR.
      </p>
      {loadingDoc && (
        <div className="vd-loading-document fixed bottom-[24px] left-[50%] [transform:translateX(-50%)] [background:#23573e] text-[white] [box-shadow:0_5px_20px_#1e3c3520] [padding:13px_22px] rounded-[8px] z-[50] text-[12px]" role="status">
          Opening private document…
        </div>
      )}
      {viewer?.vendorId === id && (
        <AdminDialog title={viewer.name} close={closeViewer}>
          <div className="vd-document-viewer p-[20px] flex flex-col gap-[18px] [&_iframe]:[border-top-width:1px] [&_iframe]:[border-top-style:solid] [&_iframe]:[border-top-color:#e4eade] [&_iframe]:[border-right-width:1px] [&_iframe]:[border-right-style:solid] [&_iframe]:[border-right-color:#e4eade] [&_iframe]:[border-bottom-width:1px] [&_iframe]:[border-bottom-style:solid] [&_iframe]:[border-bottom-color:#e4eade] [&_iframe]:[border-left-width:1px] [&_iframe]:[border-left-style:solid] [&_iframe]:[border-left-color:#e4eade] [&_iframe]:w-full [&_iframe]:h-[60vh] [&_iframe]:rounded-[5px] [&_img]:max-w-full [&_img]:max-h-[60vh] [&_img]:object-contain [&_a]:[align-self:flex-start] [&_a]:flex [&_a]:items-center [&_a]:gap-[6px]">
            {viewer.type.startsWith("image/") ? (
              <img src={viewer.url} alt={viewer.name} />
            ) : viewer.type === "application/pdf" ? (
              <iframe title={`${viewer.name} document`} src={viewer.url} />
            ) : (
              <p>This file cannot be previewed. Download it to view.</p>
            )}
            <a
              className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
          <form className="ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]" onSubmit={submit}>
            {formError && (
              <p className="ad-error p-[24px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#ecd7c8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#ecd7c8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#ecd7c8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#ecd7c8] rounded-[10px] [background:#fffbf6] text-[#a5745a] flex items-center justify-between gap-[15px] text-[12px]" role="alert">
                {formError}
              </p>
            )}
            <p className="cd-dialog-note text-[#738176] leading-[1.7] text-[12px] [background:#f3f7f3] [padding:12px_14px] rounded-[7px]">
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
            <div className="cd-dialog-actions flex items-center justify-end gap-[9px] mt-[10px]">
              <button
                type="button"
                className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
