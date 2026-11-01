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

const tabs = [
  ["overview", "Overview"],
  ["personal", "Personal Information"],
  ["events", "Events"],
  ["bookings", "Bookings"],
  ["quotations", "Quotations"],
  ["payments", "Payments"],
  ["reviews", "Reviews"],
  ["wishlist", "Wishlist"],
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
    <div className="cd-avatar w-[82px] [@media(width<=600px)]:w-[57px] h-[82px] [@media(width<=600px)]:h-[57px] shrink-0 [background:#eaf1eb] [border-top-width:4px] [border-top-style:solid] [border-top-color:#fff] [border-right-width:4px] [border-right-style:solid] [border-right-color:#fff] [border-bottom-width:4px] [border-bottom-style:solid] [border-bottom-color:#fff] [border-left-width:4px] [border-left-style:solid] [border-left-color:#fff] [box-shadow:0_0_0_1px_#e1e9e3] rounded-[22px] [@media(width<=600px)]:rounded-[15px] relative grid place-items-center text-[#39745e] text-[26px] [@media(width<=600px)]:text-[18px] font-[600] [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:rounded-[18px] [@media(width<=600px)]:[&_img]:rounded-[11px] [&_i]:absolute [&_i]:grid [&_i]:place-items-center [&_i]:[background:#277260] [&_i]:text-[white] [&_i]:[border-top-width:2px] [&_i]:[border-top-style:solid] [&_i]:[border-top-color:white] [&_i]:[border-right-width:2px] [&_i]:[border-right-style:solid] [&_i]:[border-right-color:white] [&_i]:[border-bottom-width:2px] [&_i]:[border-bottom-style:solid] [&_i]:[border-bottom-color:white] [&_i]:[border-left-width:2px] [&_i]:[border-left-style:solid] [&_i]:[border-left-color:white] [&_i]:rounded-[50%] [&_i]:w-[23px] [&_i]:h-[23px] [&_i]:bottom-[-6px] [&_i]:right-[-6px]">
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
    <div className="cd-info min-w-0 [&_dt]:text-[#819187] [&_dt]:text-[10px] [&_dt]:tracking-[0.4px] [&_dt]:uppercase [&_dt]:mb-[6px] [&_dd]:text-[#3b5147] [&_dd]:font-[500] [&_dd]:m-[0] [&_dd]:text-[12px] [&_dd]:[overflow-wrap:anywhere]">
      <dt>{label}</dt>
      <dd>{children || "Not provided"}</dd>
    </div>
  );
}
function Cell({ field, value, row }) {
  if (value === null || value === undefined || value === "")
    return <span className="cd-muted text-[#a3afa7]">—</span>;
  if (["status", "paymentStatus"].includes(field))
    return <Badge>{value}</Badge>;
  if (["amount", "budget"].includes(field))
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: row.currency || "INR",
      maximumFractionDigits: 2,
    }).format(Number(value));
  if (["createdAt", "paidAt", "validUntil"].includes(field))
    return <span className="cd-nowrap whitespace-nowrap text-[11px]">{timestamp(value)}</span>;
  if (field === "eventDate")
    return <span className="cd-nowrap whitespace-nowrap text-[11px]">{date(value)}</span>;
  if (field === "rating")
    return (
      <span className="cd-rating inline-flex items-center gap-[5px] text-[#b39a56] whitespace-nowrap font-[600] [&_small]:text-[#97a299] [&_small]:font-[400]">
        <Star size={14} fill="currentColor" /> {value}
        <small>/ 5</small>
      </span>
    );
  if (field === "guests") return number(value);
  return (
    <span
      className={["review", "message", "services", "note"].includes(field) ? "cd-long-text block min-w-[150px] max-w-[300px] whitespace-pre-wrap [overflow-wrap:anywhere]" : ""}
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
        <div className="cd-address-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=600px)]:grid-cols-[1fr] [@media(600px<width<=1200px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[18px] [padding:0_24px_24px]">
          {result.rows.map((row) => (
            <article className="cd-address [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eae4] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eae4] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eae4] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eae4] p-[21px] rounded-[9px] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-[8px] [&_>_div]:text-[#65816e] [&_h3]:text-[13px] [&_h3]:m-[0] [&_h3]:flex-1 [&_small]:text-[#8c9a8f]" key={row.id}>
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
        <div className="ad-table-wrap w-full min-w-0">
          <table className="ad-table cd-table w-full border-collapse [table-layout:fixed] text-[10px] [@media(width<=1200px)]:text-[9px] text-left [&_th]:[background:#fafbf8] [&_th]:text-[#94a08f] [&_th]:tracking-[0.3px] [&_th]:text-[9px] [&_th]:font-[500] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#eaf0e6] [&_th]:[padding:12px_17px] [@media(width<=1200px)]:[&_th]:[padding:12px_10px] [&_th]:[overflow-wrap:anywhere] [&_th_button]:flex [&_th_button]:items-center [&_th_button]:gap-[4px] [&_th_button]:max-w-full [&_th_button]:text-left [&_th_button]:[border-top-width:0] [&_th_button]:[border-top-style:none] [&_th_button]:[border-top-color:currentColor] [&_th_button]:[border-right-width:0] [&_th_button]:[border-right-style:none] [&_th_button]:[border-right-color:currentColor] [&_th_button]:[border-bottom-width:0] [&_th_button]:[border-bottom-style:none] [&_th_button]:[border-bottom-color:currentColor] [&_th_button]:[border-left-width:0] [&_th_button]:[border-left-style:none] [&_th_button]:[border-left-color:currentColor] [&_th_button]:[background:none] [&_th_button]:text-[inherit] [&_th_button]:p-[0] [&_td]:[padding:15px_17px] [@media(width<=767px)]:[&_td]:p-[0] [@media(767px<width<=1200px)]:[&_td]:[padding:12px_10px] [&_td]:[border-bottom-width:1px] [@media(width<=767px)]:[&_td]:[border-bottom-width:0] [&_td]:[border-bottom-style:solid] [@media(width<=767px)]:[&_td]:[border-bottom-style:none] [&_td]:[border-bottom-color:#f0f3ec] [@media(width<=767px)]:[&_td]:[border-bottom-color:currentColor] [&_td]:text-[#758570] [&_td]:[overflow-wrap:anywhere] [&_td]:[vertical-align:top] [&_tbody_tr:last-child_td]:[border-bottom-width:0] [&_tbody_tr:last-child_td]:[border-bottom-style:none] [&_tbody_tr:last-child_td]:[border-bottom-color:currentColor] [&_tbody_tr:hover]:[background:#fcfdf9] [@media(width<=767px)]:[&_thead]:hidden [@media(width<=767px)]:block [@media(width<=767px)]:[&_tbody]:block [@media(width<=767px)]:[&_tbody]:w-full [@media(width<=767px)]:[&_tr]:block [@media(width<=767px)]:[&_tr]:w-full [@media(width<=767px)]:[&_td]:block [@media(width<=767px)]:[&_td]:w-full [@media(width<=767px)]:[&_tbody_tr]:[padding:13px_16px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-width:1px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-style:solid] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-color:#e9eee4] [@media(width<=767px)]:[&_tbody_tr]:grid [@media(width<=767px)]:[&_tbody_tr]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:[&_tbody_tr]:gap-[11px_17px] [@media(width<=767px)]:[&_td]:[border-top-width:0] [@media(width<=767px)]:[&_td]:[border-top-style:none] [@media(width<=767px)]:[&_td]:[border-top-color:currentColor] [@media(width<=767px)]:[&_td]:[border-right-width:0] [@media(width<=767px)]:[&_td]:[border-right-style:none] [@media(width<=767px)]:[&_td]:[border-right-color:currentColor] [@media(width<=767px)]:[&_td]:[border-left-width:0] [@media(width<=767px)]:[&_td]:[border-left-style:none] [@media(width<=767px)]:[&_td]:[border-left-color:currentColor] [@media(width<=767px)]:[&_td]:text-[10px] [@media(width<=767px)]:[&_td]:min-w-0 [@media(width<=767px)]:[&_td:before]:[content:attr(data-label)] [@media(width<=767px)]:[&_td:before]:block [@media(width<=767px)]:[&_td:before]:text-[8px] [@media(width<=767px)]:[&_td:before]:text-[#a1ad96] [@media(width<=767px)]:[&_td:before]:mb-[4px] [@media(width<=767px)]:[&_td:first-child]:col-[1/-1] [@media(width<=767px)]:[&_td:last-child_.ad-row-actions]:ml-[-5px] [&_th]:whitespace-nowrap [&_td]:max-w-[300px] [@media(width<=600px)]:[&_td]:max-w-[none] [@media(width<=600px)]:[&_.cd-long-text]:min-w-0 [@media(width<=600px)]:[&_.cd-long-text]:max-w-[none] [@media(width<=600px)]:[&_.cd-nowrap]:[white-space:normal]">
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

function Timeline({ items }) {
  return (
    <section className="ad-panel cd-timeline-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
      <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
        <div>
          <h2>Activity timeline</h2>
          <p>Latest 30 milestones · newest first</p>
        </div>
        <Activity size={18} />
      </div>
      <ol className="cd-timeline [list-style:none] m-[0] [padding:3px_22px_21px] max-h-[720px] [@media(width<=1000px)]:max-h-[450px] overflow-y-auto [&_li]:flex [&_li]:gap-[13px] [&_li]:relative [&_li]:pb-[26px] [&_li:not(:last-child)::before]:[content:''] [&_li:not(:last-child)::before]:absolute [&_li:not(:last-child)::before]:left-[15px] [&_li:not(:last-child)::before]:top-[31px] [&_li:not(:last-child)::before]:bottom-[0] [&_li:not(:last-child)::before]:w-[1px] [&_li:not(:last-child)::before]:[background:#e3eae3] [&_li:last-child]:pb-[0] [&_strong]:text-[11px] [&_strong]:font-[600] [&_strong]:text-[#415649] [&_time]:text-[#9aa89e] [&_time]:text-[9px]">
        {items.map((item) => {
          const Icon = activityIcons[item.type] || Activity;
          return (
            <li key={`${item.type}-${item.id}`}>
              <span className={`cd-timeline-icon grid place-items-center shrink-0 h-[32px] w-[32px] rounded-[50%] [background:#edf3ee] text-[#47866a] [&.cd-tone-payment]:[background:#e8f3ee] [&.cd-tone-payment]:text-[#2c8768] [&.cd-tone-quotation]:[background:#f7f1e6] [&.cd-tone-quotation]:text-[#a38a4e] [&.cd-tone-review]:[background:#f7f1e6] [&.cd-tone-review]:text-[#a38a4e] cd-tone-${item.type}`}>
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
        <Link className="cd-back flex items-center text-[#647a70] gap-[9px] text-[12px] no-underline [&_>_span]:text-[#c2cdc7] [&_>_span]:[margin:0_3px]" to="/admin/customers">
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
    <div className="cd-page w-full min-w-0 max-w-[1720px] [margin:0_auto]">
      <div className="cd-topline flex items-center justify-between [margin:0_0_20px] gap-[12px] [@media(width<=600px)]:mb-[15px]">
        <Link className="cd-back flex items-center text-[#647a70] gap-[9px] text-[12px] no-underline [&_>_span]:text-[#c2cdc7] [&_>_span]:[margin:0_3px]" to="/admin/customers">
          <ArrowLeft size={15} /> Customers <span>/</span> Customer details
        </Link>
        <span className="cd-secure flex [@media(width<=600px)]:hidden items-center text-[#6c8277] gap-[6px] text-[11px]">
          <ShieldCheck size={14} /> Administrator access
        </span>
      </div>
      <section className="ad-panel cd-header [background:white] [border-top-width:3px] [border-top-style:solid] [border-top-color:#397c69] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden] relative [padding:28px_28px_0] [@media(width<=600px)]:[padding:21px_17px_0]" aria-label="Customer details">
        <div className="cd-header-main flex items-center [@media(width<=600px)]:items-start gap-[22px] [@media(width<=600px)]:gap-[14px] [@media(width>=1600px)]:min-h-[92px]">
          <Avatar key={c.profilePhotoUrl || c.id} customer={c} />
          <div className="cd-identity min-w-0">
            <div className="ad-eyebrow text-[8px] [@media(width<=767px)]:text-[7px] tracking-[1.7px] text-[#7d9183] flex items-center gap-[6px] [&_>_span]:w-[5px] [&_>_span]:h-[5px] [&_>_span]:[background:#bfa471] [&_>_span]:rounded-[50%]">CUSTOMER PROFILE</div>
            <div className="cd-name-row flex items-center gap-[12px] flex-wrap [margin:2px_0_6px]">
              <h1>{fullName}</h1>
              <Badge>{status}</Badge>
              <span
                className={`cd-verification inline-flex items-center gap-[4px] text-[11px] text-[#8d7241] [&.verified]:text-[#41816a] ${c.emailVerified ? "verified" : ""}`}
              >
                <BadgeCheck size={14} />
                {c.emailVerified ? "Email verified" : "Email unverified"}
              </span>
            </div>
            <div className="cd-contact flex items-center [&_>_span]:flex [&_>_span]:items-center gap-[22px] [@media(width<=600px)]:gap-[8px] text-[#697c73] flex-wrap [&_>_span]:gap-[7px] [&_>_span]:[overflow-wrap:anywhere] [&_>_span]:min-w-0 [@media(width<=600px)]:text-[11px]">
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
        <div className="cd-actions flex items-center [margin:26px_0_22px] gap-[8px] [@media(width<=600px)]:gap-[7px] flex-wrap [@media(width<=600px)]:mt-[20px] [@media(width<=600px)]:[&_.ad-button]:text-[10px] [@media(width<=600px)]:[&_.ad-button]:[padding:8px_10px]">
          <button className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={() => open("Edit")}>
            <Pencil size={14} /> Edit
          </button>
          <button
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            onClick={() => open(c.active ? "Deactivate" : "Activate")}
          >
            <Power size={14} />
            {c.active ? "Deactivate" : "Activate"}
          </button>
          <button
            className={`ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3] ${!c.blocked ? "cd-danger [&.cd-danger]:text-[#ae5b58]!" : ""}`}
            onClick={() => open(c.blocked ? "Unblock" : "Block")}
          >
            <Ban size={14} />
            {c.blocked ? "Unblock" : "Block"}
          </button>
          <button
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            onClick={() => open("Send notification")}
          >
            <Bell size={14} /> Send notification
          </button>
          <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={() => selectTab("audit")}>
            <History size={14} /> View audit history
          </button>
        </div>
        <dl className="cd-header-meta grid grid-cols-[1.45fr_1fr_1fr_0.65fr] [@media(width<=600px)]:grid-cols-[1fr] [@media(600px<width<=1000px)]:grid-cols-[1fr_1fr] [@media(1000px<width<=1200px)]:grid-cols-[1.3fr_1fr_1fr] [padding:19px_0_23px] m-[0] gap-[20px] [@media(width<=600px)]:gap-[15px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#eaf0eb] [@media(width<=1200px)]:[&_.cd-info:last-child]:hidden">
          <Info label="Customer ID">
            <span className="cd-id [font-family:ui-monospace,_monospace] text-[11px] text-[#728078]">{c.id}</span>
          </Info>
          <Info label="Registered on">{timestamp(c.createdAt)}</Info>
          <Info label="Last login">
            {c.lastLoginAt ? timestamp(c.lastLoginAt) : "No login recorded"}
          </Info>
          <Info label="Account type">
            <span className="cd-type flex items-center gap-[6px]">
              <Users size={14} /> Customer
            </span>
          </Info>
        </dl>
      </section>
      <div
        className="cd-tabs flex [overflow-x:auto] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dde6df] gap-[22px] [@media(width<=600px)]:gap-[18px] [margin:24px_0_27px] [scrollbar-width:thin] [&_button]:flex [&_button]:items-center [&_button]:gap-[7px] [&_button]:whitespace-nowrap [&_button]:[border-top-width:0] [&_button]:[border-top-style:none] [&_button]:[border-top-color:currentColor] [&_button]:[border-right-width:0] [&_button]:[border-right-style:none] [&_button]:[border-right-color:currentColor] [&_button]:[border-bottom-width:2px] [&_button]:[border-bottom-style:solid] [&_button]:[border-bottom-color:transparent] [&_button]:[border-left-width:0] [&_button]:[border-left-style:none] [&_button]:[border-left-color:currentColor] [&_button]:[background:transparent] [&_button]:text-[#7b897f] [&_button]:[padding:0_0_15px] [&_button]:text-[12px] [&_button]:cursor-pointer [&_button.selected]:text-[#176b60] [&_button.selected]:[border-bottom-color:#176b60] [&_button.selected]:font-[600] [&_button_>_span]:text-[10px] [&_button_>_span]:rounded-[5px] [&_button_>_span]:[background:#e8eee9] [&_button_>_span]:text-[#6b8174] [&_button_>_span]:[padding:1px_5px] [&_button.selected_>_span]:[background:#dfeee6] [&_button.selected_>_span]:text-[#27725a] [&_button:focus-visible]:[outline:2px_solid_#176b60] [&_button:focus-visible]:[outline-offset:-2px]"
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
            <div className="cd-section-heading flex items-center justify-between mb-[17px] gap-[14px]">
              <div>
                <h2>Customer at a glance</h2>
                <p>A complete view of their marketplace journey.</p>
              </div>
              <span className="cd-period text-[10px] text-[#85958a] whitespace-nowrap">Lifetime activity</span>
            </div>
            <div className="cd-stats grid grid-cols-[repeat(4,_minmax(0,_1fr))] [@media(width<=1000px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[14px] [@media(width<=600px)]:gap-[10px] mb-[24px]">
              {stats.map(([key, label, Icon, target]) => (
                <button
                  className={`cd-stat [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e2e9e3] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e2e9e3] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e2e9e3] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e2e9e3] rounded-[10px] [padding:17px_19px_14px] [@media(width<=600px)]:[padding:14px_12px] text-left [transition:border-color_0.2s,_transform_0.2s] min-w-0 cursor-pointer [&:hover]:[border-top-color:#6eaa91] [&:hover]:[border-right-color:#6eaa91] [&:hover]:[border-bottom-color:#6eaa91] [&:hover]:[border-left-color:#6eaa91] [&:hover]:[transform:translateY(-2px)] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:justify-between [&_>_div]:text-[#798d7e] [&_>_div]:gap-[8px] [&_>_div_>_span]:text-[11px] [@media(width<=600px)]:[&_>_div_>_span]:text-[10px] [&_>_div_>_span]:text-[#6c7e72] [&_>_strong]:block [&_>_strong]:text-[clamp(20px,_2vw,_29px)] [&_>_strong]:font-[600] [&_>_strong]:tracking-[-0.7px] [&_>_strong]:text-[#2f4a3c] [&_>_strong]:[margin:10px_0_8px] [&_>_strong]:[overflow-wrap:anywhere] [&_>_small]:flex [&_>_small]:items-center [&_>_small]:justify-between [&_>_small]:gap-[8px] [&_>_small]:text-[#92a095] [&_>_small]:text-[9px] [@media(width<=600px)]:[&_>_small]:text-[8px] [&_>_small]:font-[400] [&.cd-stat-spending]:[background:#edf5ef] [&.cd-stat-spending]:[border-top-color:#d7e7db] [&.cd-stat-spending]:[border-right-color:#d7e7db] [&.cd-stat-spending]:[border-bottom-color:#d7e7db] [&.cd-stat-spending]:[border-left-color:#d7e7db] [&.cd-stat-spending_>_div]:text-[#438963] [&.cd-stat-completed_>_div]:text-[#438963] [&.cd-stat-cancelled_>_div]:text-[#bd7b77] [&.cd-stat-pending_>_div]:text-[#b89954] [&.cd-stat-reviews_>_div]:text-[#b89954] [&.vd-stat-gross]:[background:#eef5ef] [&.vd-stat-gross]:[border-top-color:#dae7d8] [&.vd-stat-gross]:[border-right-color:#dae7d8] [&.vd-stat-gross]:[border-bottom-color:#dae7d8] [&.vd-stat-gross]:[border-left-color:#dae7d8] [&.vd-stat-pending_>_div]:text-[#b59b5c] [&.vd-stat-rating_>_div]:text-[#b59b5c] [&.vd-stat-reviews_>_div]:text-[#b59b5c] cd-stat-${key}`}
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
            <div className="cd-overview-grid grid grid-cols-[minmax(0,_1fr)_330px] [@media(width<=1000px)]:grid-cols-[1fr] [@media(1000px<width<=1200px)]:grid-cols-[minmax(0,_1fr)_280px] gap-[22px] [@media(width<=1200px)]:gap-[16px] [align-items:start]">
              <div className="cd-overview-left grid gap-[22px] min-w-0">
                <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
                  <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
                    <div>
                      <h2>Recent bookings</h2>
                      <p>The latest reservations and payment status.</p>
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
                <section className="ad-panel cd-account-summary [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden] [&_dl]:grid [&_dl]:grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=600px)]:[&_dl]:grid-cols-[1fr] [@media(600px<width<=1000px)]:[&_dl]:grid-cols-[1fr_1fr] [&_dl]:gap-[25px] [&_dl]:m-[0] [&_dl]:[padding:2px_24px_26px]">
                  <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
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
          <section className="ad-panel cd-personal [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden] [&_dl]:grid [&_dl]:grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=600px)]:[&_dl]:grid-cols-[1fr] [@media(600px<width<=1000px)]:[&_dl]:grid-cols-[1fr_1fr] [&_dl]:gap-[32px] [&_dl]:m-[0] [&_dl]:[padding:2px_24px_26px] [&_dl]:pt-[12px]">
            <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
              <div>
                <h2>Personal information</h2>
                <p>Contact information, verification, and account identity.</p>
              </div>
              <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={() => open("Edit")}>
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
          <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
            <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
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
              <span className="cd-period text-[10px] text-[#85958a] whitespace-nowrap">
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
      <p className="cd-footer flex items-center [@media(width<=600px)]:items-start justify-center gap-[6px] mt-[24px] text-[10px]! [@media(width<=600px)]:text-center">
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
          <form className="ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]" onSubmit={submit}>
            {formError && (
              <p className="ad-error p-[24px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#ecd7c8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#ecd7c8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#ecd7c8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#ecd7c8] rounded-[10px] [background:#fffbf6] text-[#a5745a] flex items-center justify-between gap-[15px] text-[12px]" role="alert">
                {formError}
              </p>
            )}
            {dialog === "Edit" ? (
              <>
                <div className="cd-form-grid grid grid-cols-[1fr_1fr] [@media(width<=600px)]:grid-cols-[1fr] gap-[14px]">
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
                <p className="cd-dialog-note text-[#738176] leading-[1.7] text-[12px] [background:#f3f7f3] [padding:12px_14px] rounded-[7px]">
                  Changing an email or phone clears its verification. Changing
                  email also signs the customer out.
                </p>
              </>
            ) : dialog === "Send notification" ? (
              <>
                <p className="cd-dialog-note text-[#738176] leading-[1.7] text-[12px] [background:#f3f7f3] [padding:12px_14px] rounded-[7px]">
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
                <p className="cd-dialog-note text-[#738176] leading-[1.7] text-[12px] [background:#f3f7f3] [padding:12px_14px] rounded-[7px]">
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
