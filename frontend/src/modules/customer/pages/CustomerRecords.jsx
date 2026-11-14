import { ReviewForm as CompleteReviewForm } from '../../reviews/Reviews';
import { LocationFields, MapLink } from "../components/LocationFields";
import { useEffect, useState } from "react";
import {
  Link,
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUpRight,
  Check,
  MessagesSquare,
  ShieldCheck,
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
import BookingItemDetails from "../../bookings/BookingItemDetails";
import CustomerBookingDetails from "./CustomerBookingDetails";
import CustomerBookingsPage from "./CustomerBookingsPage";
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
  const location = useLocation();
  const section = explicit || location.pathname.split("/")[2];
  return section === "bookings" ? <CustomerBookingsPage /> : <CustomerRecordList section={section} />;
}
function CustomerRecordList({ section }) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [version, setVersion] = useState(0),
    [edit, setEdit] = useState(null),
    [remove, setRemove] = useState(null),
    [busy, setBusy] = useState(false),
    { notify, reload } = useAuth(),
    r = useCustomerData(
      section === "wishlist"
        ? "/wishlist"
        : `/records/${section}?${new URLSearchParams({ page, q: search })}`,
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
          <button className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" onClick={() => setEdit({})}>
            <Plus size={16} /> Add address
          </button>
        ) : ["wishlist", "bookings", "quotations"].includes(section) ? (
          <Link className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" to="/customer/discover">
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
      {section === "quotations" && (
        <div className="cw-inline-tabs flex gap-[25px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e8ded5] mb-[25px] [&_>_a]:pt-[13px] [&_>_a]:pr-[3px] [&_>_a]:pb-[13px] [&_>_a]:pl-[3px] [&_>_a]:text-[12px] [&_>_a]:text-[#a38a7b] [&_>_a.active]:text-[#9a5b70] [&_>_a.active]:[border-bottom-width:2px] [&_>_a.active]:[border-bottom-style:solid] [&_>_a.active]:[border-bottom-color:#9a5b70]">
          <Link to="/customer/quotations" className="active">
            Received quotations
          </Link>
          <Link to="/customer/requests">My requests</Link>
        </div>
      )}
      {section === "requests" && (
        <div className="cw-inline-tabs flex gap-[25px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e8ded5] mb-[25px] [&_>_a]:pt-[13px] [&_>_a]:pr-[3px] [&_>_a]:pb-[13px] [&_>_a]:pl-[3px] [&_>_a]:text-[12px] [&_>_a]:text-[#a38a7b] [&_>_a.active]:text-[#9a5b70] [&_>_a.active]:[border-bottom-width:2px] [&_>_a.active]:[border-bottom-style:solid] [&_>_a.active]:[border-bottom-color:#9a5b70]">
          <Link to="/customer/quotations">Received quotations</Link>
          <Link to="/customer/requests" className="active">
            My requests
          </Link>
        </div>
      )}
      {section === "payments" && (
        <section className="cw-info-strip flex items-center gap-[15px] [background:#f0f2e9] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e1e5d4] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e1e5d4] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e1e5d4] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e1e5d4] pt-[16px] pr-[22px] pb-[16px] pl-[22px] rounded-[7px] mb-[24px] text-[#93a07d] [&_p]:mt-[0] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0]">
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
        <div className="cw-discovery-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=520px)]:grid-cols-[minmax(0,_1fr)] [@media(520px<width<=1250px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[24px]">
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
        <div className="cw-events-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=520px)]:grid-cols-[minmax(0,_1fr)] [@media(520px<width<=1250px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[24px]">
          {rows.map((a) => (
            <article className="cw-panel cw-prose [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden pt-[25px] [@media(width<=520px)]:pt-[23px] pr-[28px] [@media(width<=520px)]:pr-[20px] pb-[25px] [@media(width<=520px)]:pb-[23px] pl-[28px] [@media(width<=520px)]:pl-[20px] mb-[24px] [&_>_h2]:mb-[20px] [&_>_h3]:mt-[24px] [&_p]:[white-space:pre-line]" key={a.id}>
              <div className="cw-record-line flex justify-between items-center gap-[18px] pt-[12px] pr-[0] pb-[12px] pl-[0] [&_>_h2]:mt-[0] [&_>_h2]:mr-[0] [&_>_h2]:mb-[0] [&_>_h2]:ml-[0] [@media(width<=520px)]:flex-wrap">
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
              <div className="cw-detail-actions flex gap-[12px] flex-wrap mt-[22px] [@media(width<=520px)]:[&_>_.cw-button]:text-[11px]">
                <MapLink value={a} />
                {!a.isDefault && (
                  <button
                    className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
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
                <button className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" onClick={() => setEdit(a)}>
                  <Pencil size={14} /> Edit
                </button>
                <button
                  className="cw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e] [background:none] [border-top-width:1px] [border-top-style:solid] [border-top-color:transparent] [border-right-width:1px] [border-right-style:solid] [border-right-color:transparent] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:transparent] [border-left-width:1px] [border-left-style:solid] [border-left-color:transparent] rounded-[5px] pt-[0] pr-[0] pb-[0] pl-[0] [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]"
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
        <div className="cw-notifications flex flex-col gap-[14px] [&_>_article]:pt-[23px] [@media(width<=520px)]:[&_>_article]:pt-[20px] [&_>_article]:pr-[27px] [@media(width<=520px)]:[&_>_article]:pr-[20px] [&_>_article]:pb-[23px] [@media(width<=520px)]:[&_>_article]:pb-[20px] [&_>_article]:pl-[27px] [@media(width<=520px)]:[&_>_article]:pl-[20px] [&_>_article]:[background:white] [&_>_article]:[border-top-width:1px] [&_>_article]:[border-top-style:solid] [&_>_article]:[border-top-color:#e9e0d7] [&_>_article]:[border-right-width:1px] [&_>_article]:[border-right-style:solid] [&_>_article]:[border-right-color:#e9e0d7] [&_>_article]:[border-bottom-width:1px] [&_>_article]:[border-bottom-style:solid] [&_>_article]:[border-bottom-color:#e9e0d7] [&_>_article]:[border-left-width:1px] [&_>_article]:[border-left-style:solid] [&_>_article]:[border-left-color:#e9e0d7] [&_>_article]:rounded-[8px] [&_>_article]:flex [&_>_article]:justify-between [&_>_article]:gap-[25px] [@media(width<=520px)]:[&_>_article]:gap-[12px] [&_>_article]:items-center [@media(width<=520px)]:[&_>_article]:items-start [&_>_article.unread]:[border-left-width:3px] [&_>_article.unread]:[border-left-style:solid] [&_>_article.unread]:[border-left-color:#b98191] [&_>_article.unread]:[background:#fffdfb] [&_h3]:text-[14px] [&_h3]:font-[500] [&_h3]:mt-[0] [&_h3]:mr-[0] [&_h3]:mb-[0] [&_h3]:ml-[0] [&_p]:mt-[8px] [&_p]:mr-[0] [&_p]:mb-[8px] [&_p]:ml-[0] [&_small]:text-[#b5a091] [&_small]:text-[10px] [@media(width<=520px)]:[&_>_article]:flex-col">
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
                      className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
                      to={`/customer/${n.referenceType === "Quotation" ? "quotations" : "requests"}/${n.referenceId}`}
                    >
                      View details
                    </Link>
                  )}
              </div>
              {!n.isRead && (
                <button
                  className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
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
        <div className="cw-panel cw-table-wrap [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-auto overflow-y-hidden max-w-full">
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
                        className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
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
        <div className="cw-pagination flex items-center justify-center gap-[20px] mt-[25px] mr-[0] mb-[25px] ml-[0] text-[11px] text-[#a59187]">
          <button
            className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
            disabled={page === 1 || r.loading}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} · {r.data.total} records
          </span>
          <button
            className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
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
            className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
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
        className="cw-form min-w-0 [&_fieldset]:[border-top-width:0] [&_fieldset]:[border-top-style:none] [&_fieldset]:[border-top-color:currentColor] [&_fieldset]:[border-right-width:0] [&_fieldset]:[border-right-style:none] [&_fieldset]:[border-right-color:currentColor] [&_fieldset]:[border-bottom-width:0] [&_fieldset]:[border-bottom-style:none] [&_fieldset]:[border-bottom-color:currentColor] [&_fieldset]:[border-left-width:0] [&_fieldset]:[border-left-style:none] [&_fieldset]:[border-left-color:currentColor] [&_fieldset]:pt-[0] [&_fieldset]:pr-[0] [&_fieldset]:pb-[0] [&_fieldset]:pl-[0] [&_fieldset]:mt-[0] [&_fieldset]:mr-[0] [&_fieldset]:mb-[0] [&_fieldset]:ml-[0] [&_fieldset]:min-w-0 [&_>_.cw-panel_+_.cw-panel]:mt-[22px]"
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
        <label className="cw-checkbox flex gap-[10px] items-center">
          <input
            name="isDefault"
            type="checkbox"
            defaultChecked={address?.isDefault}
          />{" "}
          Set as default address
        </label>
        {error && (
          <p className="cw-form-error [background:#fff4ee] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f0ddcf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#f0ddcf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#f0ddcf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#f0ddcf] text-[#b6836e]! pt-[12px] pr-[15px] pb-[12px] pl-[15px] rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy} className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]">
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
  if (!quote) return (
    <>
      <CustomerBookingDetails
        id={id}
        data={r.data}
        config={config}
        busy={busy}
        setBusy={setBusy}
        error={error}
        setError={setError}
        message={message}
        refresh={(notice) => {
          if (notice) notify(notice);
          setVersion((v) => v + 1);
        }}
        onReview={() => setReview(true)}
      />
      {review && <ReviewForm bookingId={id} close={() => setReview(false)} />}
    </>
  );
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
        <button className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" onClick={message} disabled={busy}>
          <MessagesSquare size={16} /> Message vendor
        </button>
      </Heading>
      <section className="cw-panel cw-prose [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden pt-[25px] [@media(width<=520px)]:pt-[23px] pr-[28px] [@media(width<=520px)]:pr-[20px] pb-[25px] [@media(width<=520px)]:pb-[23px] pl-[28px] [@media(width<=520px)]:pl-[20px] mb-[24px] [&_>_h2]:mb-[20px] [&_>_h3]:mt-[24px] [&_p]:[white-space:pre-line]">
        <div className="cw-record-line flex justify-between items-center gap-[18px] pt-[12px] pr-[0] pb-[12px] pl-[0] [&_>_h2]:mt-[0] [&_>_h2]:mr-[0] [&_>_h2]:mb-[0] [&_>_h2]:ml-[0] [@media(width<=520px)]:flex-wrap">
          <div>
            <span className="cw-eyebrow text-[#9aa890] text-[8px] tracking-[1.6px] font-[500]">
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
        <div className="cw-table-wrap overflow-x-auto max-w-full min-w-0">
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
                    {Number(i.quantity)}
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
          <div className="cw-detail-actions flex gap-[12px] flex-wrap mt-[22px] [@media(width<=520px)]:[&_>_.cw-button]:text-[11px]">
            <button
              className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              disabled={busy}
              onClick={() => setDecision("Accept")}
            >
              Accept quotation
            </button>
            <button
              className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              disabled={busy}
              onClick={() => setDecision("Modify")}
            >
              Request modification
            </button>
            <button
              className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              disabled={busy}
              onClick={() => setDecision("Reject")}
            >
              Reject
            </button>
          </div>
        )}
        {error && (
          <p className="cw-form-error [background:#fff4ee] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f0ddcf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#f0ddcf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#f0ddcf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#f0ddcf] text-[#b6836e]! pt-[12px] pr-[15px] pb-[12px] pl-[15px] rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]" role="alert">
            {error}
          </p>
        )}
      </section>
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
            className="cw-form min-w-0 [&_fieldset]:[border-top-width:0] [&_fieldset]:[border-top-style:none] [&_fieldset]:[border-top-color:currentColor] [&_fieldset]:[border-right-width:0] [&_fieldset]:[border-right-style:none] [&_fieldset]:[border-right-color:currentColor] [&_fieldset]:[border-bottom-width:0] [&_fieldset]:[border-bottom-style:none] [&_fieldset]:[border-bottom-color:currentColor] [&_fieldset]:[border-left-width:0] [&_fieldset]:[border-left-style:none] [&_fieldset]:[border-left-color:currentColor] [&_fieldset]:pt-[0] [&_fieldset]:pr-[0] [&_fieldset]:pb-[0] [&_fieldset]:pl-[0] [&_fieldset]:mt-[0] [&_fieldset]:mr-[0] [&_fieldset]:mb-[0] [&_fieldset]:ml-[0] [&_fieldset]:min-w-0 [&_>_.cw-panel_+_.cw-panel]:mt-[22px]"
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
              <p className="cw-form-error [background:#fff4ee] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f0ddcf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#f0ddcf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#f0ddcf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#f0ddcf] text-[#b6836e]! pt-[12px] pr-[15px] pb-[12px] pl-[15px] rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]" role="alert">
                {error}
              </p>
            )}
            <div className="cw-form-actions">
              <button
                type="button"
                className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
                onClick={() => setDecision(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" disabled={busy}>
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
    </>
  );
}
function ReviewForm({bookingId,close}) {
 const {notify}=useAuth();
 return <div className="rr-module [&&]:text-[#344936] [&&]:[font-family:inherit] [&&]:text-[14px] [&&]:leading-[1.6] [&&]:min-w-0 [&&]:w-full [&_*]:box-border [&_h1]:text-[clamp(25px,_3vw,_34px)] [&_h1]:font-semibold [&_h1]:leading-[1.25] [&_h1]:mt-0 [&_h1]:mx-0 [&_h1]:mb-[10px] [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:mt-0 [&_h2]:mx-0 [&_h2]:mb-[12px] [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:my-[10px] [&_h3]:mx-0 [&_p]:my-[8px] [&_p]:mx-0 [&_p]:wrap-anywhere [&_button]:border [&_button]:border-[#dce4d7] [&_button]:rounded-[8px] [&_button]:py-[9px] [&_button]:px-[15px] [&_button]:bg-[#fff] [&_button]:text-[#36533d] [&_button]:text-[13px] [&_button]:cursor-pointer [&_button]:no-underline [&_button]:inline-flex [&_button]:gap-[7px] [&_button]:items-center [&_button]:justify-center [&_button:hover]:bg-[#f2f6ee] [&_button:disabled]:[cursor:wait] [&_button:disabled]:opacity-55 [&_label]:grid [&_label]:gap-[6px] [&_label]:text-[13px] [&_label]:font-medium [&_label]:min-w-0 [&_input]:w-full [&_input]:min-w-0 [&_input]:border [&_input]:border-[#dce4d7] [&_input]:rounded-[8px] [&_input]:py-[10px] [&_input]:px-[12px] [&_input]:[font:inherit] [&_input]:bg-[#fff] [&_input]:text-[#344936] [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:border [&_textarea]:border-[#dce4d7] [&_textarea]:rounded-[8px] [&_textarea]:py-[10px] [&_textarea]:px-[12px] [&_textarea]:[font:inherit] [&_textarea]:bg-[#fff] [&_textarea]:text-[#344936] [&_textarea]:[resize:vertical] [&_select]:w-full [&_select]:min-w-0 [&_select]:border [&_select]:border-[#dce4d7] [&_select]:rounded-[8px] [&_select]:py-[10px] [&_select]:px-[12px] [&_select]:[font:inherit] [&_select]:bg-[#fff] [&_select]:text-[#344936] [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-[#648d66] [&_:focus-visible]:outline-offset-[3px] [&_progress]:w-full [&_progress]:h-[8px] [&_progress]:[accent-color:#8b9e72] [&_table]:border-collapse [&_table]:w-full [&_table]:text-[13px] [&_th]:text-left [&_th]:p-[10px] [&_th]:border-b [&_th]:border-b-[#e2e8dd] [&_th]:whitespace-nowrap [&_td]:text-left [&_td]:p-[10px] [&_td]:border-b [&_td]:border-b-[#e2e8dd] [&_td]:whitespace-nowrap"><CompleteReviewForm bookingId={bookingId} close={close} done={message=>{notify(message);close();}} /></div>;
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
        <section className="cw-panel cw-prose [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden pt-[25px] [@media(width<=520px)]:pt-[23px] pr-[28px] [@media(width<=520px)]:pr-[20px] pb-[25px] [@media(width<=520px)]:pb-[23px] pl-[28px] [@media(width<=520px)]:pl-[20px] mb-[24px] [&_>_h2]:mb-[20px] [&_>_h3]:mt-[24px] [&_p]:[white-space:pre-line]">
          <ShieldCheck size={30} />
          <h2>Account security</h2>
          <p>Use a strong, unique password to keep your planning space safe.</p>
          <Link className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" to="/auth/change-password">
            Change password
          </Link>
          <h3>Profile & contact details</h3>
          <p>
            Your email is verified. Keep your phone number and addresses
            current.
          </p>
          <Link className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" to="/customer/profile">
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
      <section className="cw-panel cw-profile-panel [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden pt-[30px] [@media(width<=520px)]:pt-[23px] pr-[30px] [@media(width<=520px)]:pr-[23px] pb-[30px] [@media(width<=520px)]:pb-[23px] pl-[30px] [@media(width<=520px)]:pl-[23px] grid grid-cols-[260px_minmax(0,_1fr)] [@media(width<=800px)]:grid-cols-[1fr] [@media(800px<width<=1050px)]:grid-cols-[190px_minmax(0,_1fr)] gap-[40px] [@media(width<=1050px)]:gap-[25px]">
        <div className="cw-profile-photo pr-[30px] [@media(width<=800px)]:pr-[0] [border-right-width:1px] [@media(width<=800px)]:[border-right-width:0] [border-right-style:solid] [@media(width<=800px)]:[border-right-style:none] [border-right-color:#eee4da] [@media(width<=800px)]:[border-right-color:currentColor] [&_>_strong]:block [&_>_strong]:[font-family:Georgia,_serif] [&_>_strong]:text-[23px] [&_>_strong]:font-[400] [&_>_strong]:mt-[25px] [&_.photo-upload]:max-w-full [@media(width<=800px)]:[border-top-width:0] [@media(width<=800px)]:[border-top-style:none] [@media(width<=800px)]:[border-top-color:currentColor] [@media(width<=800px)]:[border-bottom-width:1px] [@media(width<=800px)]:[border-bottom-style:solid] [@media(width<=800px)]:[border-bottom-color:#eee4da] [@media(width<=800px)]:[border-left-width:0] [@media(width<=800px)]:[border-left-style:none] [@media(width<=800px)]:[border-left-color:currentColor] [@media(width<=800px)]:pt-[0] [@media(width<=800px)]:pb-[25px] [@media(width<=800px)]:pl-[0]">
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
          className="cw-form min-w-0 [&_fieldset]:[border-top-width:0] [&_fieldset]:[border-top-style:none] [&_fieldset]:[border-top-color:currentColor] [&_fieldset]:[border-right-width:0] [&_fieldset]:[border-right-style:none] [&_fieldset]:[border-right-color:currentColor] [&_fieldset]:[border-bottom-width:0] [&_fieldset]:[border-bottom-style:none] [&_fieldset]:[border-bottom-color:currentColor] [&_fieldset]:[border-left-width:0] [&_fieldset]:[border-left-style:none] [&_fieldset]:[border-left-color:currentColor] [&_fieldset]:pt-[0] [&_fieldset]:pr-[0] [&_fieldset]:pb-[0] [&_fieldset]:pl-[0] [&_fieldset]:mt-[0] [&_fieldset]:mr-[0] [&_fieldset]:mb-[0] [&_fieldset]:ml-[0] [&_fieldset]:min-w-0 [&_>_.cw-panel_+_.cw-panel]:mt-[22px]"
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
            <p className="cw-form-error [background:#fff4ee] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f0ddcf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#f0ddcf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#f0ddcf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#f0ddcf] text-[#b6836e]! pt-[12px] pr-[15px] pb-[12px] pl-[15px] rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]" role="alert">
              {error}
            </p>
          )}
          <button className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>
    </>
  );
}
