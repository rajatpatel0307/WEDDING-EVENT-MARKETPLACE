import { vendorClasses } from "../styles";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  MessageSquare,
  Pencil,
  Plus,
  Power,
  ReceiptText,
  Search,
  Star,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  Badge,
  Empty,
  ErrorView,
  Field,
  Heading,
  Image,
  Loading,
  Modal,
  Panel,
  useVendorData,
} from "../components/WorkspaceUI";
import { RecordEditor } from "../components/WorkspaceForms";
import {
  date,
  download,
  money,
  readFile,
  save,
  timestamp,
  vendorRequest,
} from "../services/workspace.api";
const columns = {
  requests: [
    ["customer", "Customer"],
    ["event", "Event"],
    ["service", "Service"],
    ["message", "Requirements"],
    ["status", "Status"],
    ["createdAt", "Requested"],
  ],
  packages: [
    ["name", "Package"],
    ["service", "Service"],
    ["price", "Original price"],
    ["discount", "Discount"],
    ["finalPrice", "Final price"],
    ["guests", "Guest range"],
    ["active", "Status"],
  ],
  items: [
    ["name", "Item"],
    ["service", "Service"],
    ["quantity", "Quantity"],
    ["unit", "Unit"],
    ["price", "Unit price"],
    ["included", "Included"],
  ],
  locations: [
    ["city", "City"],
    ["address", "Address"],
    ["state", "State"],
    ["country", "Country"],
    ["postalCode", "Postal code"],
    ["isPrimary", "Primary"],
    ["active", "Status"],
  ],
  documents: [
    ["type", "Document type"],
    ["number", "Number"],
    ["status", "Verification"],
    ["reason", "Review note"],
    ["createdAt", "Uploaded"],
  ],
  bookings: [
    ["number", "Booking"],
    ["customer", "Customer"],
    ["event", "Event"],
    ["eventDate", "Event date"],
    ["services", "Requested services"],
    ["amount", "Amount"],
    ["paymentStatus", "Payment"],
    ["status", "Status"],
  ],
  quotations: [
    ["number", "Quotation"],
    ["customer", "Customer"],
    ["event", "Event"],
    ["amount", "Total"],
    ["status", "Status"],
    ["validUntil", "Valid until"],
    ["createdAt", "Created"],
  ],
  customers: [
    ["name", "Customer"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["bookings", "Bookings"],
    ["amount", "Booked value"],
    ["lastInteractionAt", "Last interaction"],
  ],
  revenue: [
    ["booking", "Booking"],
    ["gross", "Gross"],
    ["commission", "Commission"],
    ["tax", "Tax"],
    ["net", "Net earnings"],
    ["status", "Status"],
  ],
  payouts: [
    ["booking", "Booking"],
    ["gross", "Gross"],
    ["commission", "Commission"],
    ["tax", "Tax"],
    ["net", "Net payout"],
    ["status", "Status"],
    ["paidAt", "Paid on"],
  ],
  transactions: [
    ["reference", "Reference"],
    ["booking", "Booking"],
    ["amount", "Amount"],
    ["method", "Method"],
    ["gateway", "Gateway"],
    ["status", "Status"],
    ["paidAt", "Payment date"],
  ],
  reviews: [
    ["customer", "Customer"],
    ["rating", "Rating"],
    ["title", "Title"],
    ["review", "Review"],
    ["status", "Published status"],
    ["createdAt", "Date"],
  ],
  offers: [
    ["name", "Offer"],
    ["service", "Applies to"],
    ["discountType", "Type"],
    ["discountValue", "Discount"],
    ["startDate", "Starts"],
    ["endDate", "Ends"],
    ["active", "Status"],
  ],
  coupons: [
    ["name", "Code"],
    ["description", "Description"],
    ["discountValue", "Discount"],
    ["usageLimit", "Usage limit"],
    ["used", "Used"],
    ["startDate", "Starts"],
    ["endDate", "Ends"],
    ["active", "Status"],
  ],
  notifications: [
    ["title", "Title"],
    ["message", "Message"],
    ["isRead", "Read"],
    ["createdAt", "Received"],
  ],
};
function Cell({ name, row }) {
  const value = row[name];
  if (name === "guests")
    return `${row.minimumGuests ?? "Any"} – ${row.maximumGuests ?? "No limit"}`;
  if (["active", "included", "isPrimary", "isRead"].includes(name))
    return name === "active" ? (
      <Badge>{value ? "Active" : "Inactive"}</Badge>
    ) : value ? (
      "Yes"
    ) : (
      "No"
    );
  if (value === null || value === undefined || value === "")
    return <span className="text-[#c1cbb5]">—</span>;
  if (["status", "paymentStatus"].includes(name)) return <Badge>{value}</Badge>;
  if (
    [
      "amount",
      "price",
      "finalPrice",
      "gross",
      "commission",
      "tax",
      "net",
    ].includes(name)
  )
    return money(value, false, row.currency || "INR");
  if (
    name === "discount" ||
    (name === "discountValue" && row.discountType === "Percentage")
  )
    return `${value}%`;
  if (name === "discountValue") return money(value);
  if (name === "rating")
    return (
      <span className="inline-flex items-center gap-[4px] text-[#b7a372] text-[9px] whitespace-nowrap">
        <Star size={13} fill="currentColor" />
        {value} / 5
      </span>
    );
  if (/At$|Date$|^validUntil$/.test(name)) return date(value);
  return (
    <span
      className={
        vendorClasses(["review", "message", "services", "description", "reason"].includes(
          name,
        )
          ? "vw-long-text"
          : "")
      }
    >
      {String(value)}
    </span>
  );
}
export default function VendorResourcesPage({
  section,
  filter = "",
  title,
  embedded = false,
}) {
  const { notify, reload } = useAuth(),
    navigate = useNavigate();
  const [page, setPage] = useState(1),
    [eventFrom, setEventFrom] = useState(""),
    [eventTo, setEventTo] = useState(""),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [version, setVersion] = useState(0),
    [dialog, setDialog] = useState(null),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState("");
  const resource = useVendorData(
    `/records/${section}?${new URLSearchParams({ page, pageSize: 12, status: filter, q: search, ...(eventFrom ? { eventFrom } : {}), ...(eventTo ? { eventTo } : {}) })}`,
    version,
  );
  const mutable = ["packages", "locations", "offers", "coupons"].includes(
      section,
    ),
    editor = ["locations", "offers", "coupons", "items"].includes(section);
  function open(action, row = null) {
    setFormError("");
    setDialog({ action, row });
  }
  async function act(path, method, body) {
    setBusy(true);
    setFormError("");
    try {
      const result = await save(path, method, body);
      notify(result.message);
      if (section === "notifications") reload().catch(() => {});
      setVersion((v) => v + 1);
      setDialog(null);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function message(row) {
    try {
      const result = await save("/conversations", "POST", {
        bookingId: row.id,
      });
      navigate(`/vendor/messages?conversation=${result.id}`);
    } catch (e) {
      notify(e.message);
    }
  }
  const add =
    section === "services" ? (
      <Link className="
        vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
        [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
        rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
        font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
        [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
        [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
        [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
        [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
        vw-primary
      " to="/vendor/services/new">
        <Plus size={15} /> Add service
      </Link>
    ) : section === "packages" ? (
      <Link className="
        vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
        [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
        rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
        font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
        [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
        [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
        [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
        [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
        vw-primary
      " to="/vendor/packages/new">
        <Plus size={15} /> Create package
      </Link>
    ) : ["quotations", "requests"].includes(section) ? (
      <Link className="
        vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
        [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
        rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
        font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
        [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
        [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
        [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
        [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
        vw-primary
      " to="/vendor/quotations/new">
        <Plus size={15} /> Create quotation
      </Link>
    ) : editor || section === "documents" ? (
      <button
        className="
          vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
          [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
          rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
          font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
          [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
          [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
          [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
          [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
          vw-primary
        "
        onClick={() => open(section === "documents" ? "upload" : "edit")}
      >
        <Plus size={15} />
        {section === "documents"
          ? "Upload document"
          : `Add ${section === "items" ? "service item" : section.slice(0, -1)}`}
      </button>
    ) : null;
  return (
    <>
      {!embedded && (
        <Heading
          title={title || section[0].toUpperCase() + section.slice(1)}
          description={
            section === "services"
              ? "Your craft, beautifully presented. Manage the services customers discover."
              : section === "documents"
                ? "Your verification documents are private and reviewed by our administration team."
                : ["revenue", "payouts", "transactions"].includes(section)
                  ? "A clear record of your earnings and payments. Financial records are read-only."
                  : "The details that keep your business moving, all in one place."
          }
        >
          {add}
        </Heading>
      )}
      <Panel
        title={
          section === "services" ? "Your service collection" : "Your records"
        }
        action={
          <span className="[background:#f0f5e9] text-[#a4b38f] [padding:3px_7px] rounded-[4px] text-[9px]">
            {resource.data?.total ?? "—"} records
          </span>
        }
      >
        {section === "bookings" && (
          <div className="mb-4 flex flex-wrap gap-3">
            <label>
              Event from
              <input
                type="date"
                aria-label="Event from"
                className="ml-2 rounded border p-2"
                value={eventFrom}
                onChange={(e) => {
                  setEventFrom(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Event to
              <input
                type="date"
                aria-label="Event to"
                className="ml-2 rounded border p-2"
                value={eventTo}
                onChange={(e) => {
                  setEventTo(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <p className="text-sm">
              Search bookings by reference, customer or service.
            </p>
          </div>
        )}
        {[
          "services",
          "packages",
          "bookings",
          "quotations",
          "customers",
          "offers",
          "coupons",
        ].includes(section) && (
          <form
            className="
              [padding:13px_22px] [border-top:1px_solid_#f0f4e9] [border-bottom:1px_solid_#edf2e5] flex
              items-center gap-[10px] [&_>_label]:flex [&_>_label]:items-center [&_>_label]:gap-[8px]
              [&_>_label]:[border-top:1px_solid_#e5ecdc] [&_>_label]:[border-right:1px_solid_#e5ecdc]
              [&_>_label]:[border-bottom:1px_solid_#e5ecdc] [&_>_label]:[border-left:1px_solid_#e5ecdc]
              [&_>_label]:[padding:0_10px] [&_>_label]:rounded-[6px] [&_>_label]:text-[#afbea1]
              [&_>_label]:min-w-[0] [&_input]:text-[10px] [&_input]:[padding:8px_0] [&_input]:[border-top:0]
              [&_input]:[border-right:0] [&_input]:[border-bottom:0] [&_input]:[border-left:0] [&_input]:min-w-[0]
              [&_input]:w-[210px] [&_input]:[outline:0] [&_input]:[background:none]
              vendor-phone:[padding:12px_17px] vendor-phone:[&_>_label]:[flex:1] vendor-phone:[&_>_label]:min-w-[0]
              vendor-phone:[&_input]:w-[100%]
            "
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(query);
              setPage(1);
            }}
          >
            <label>
              <Search size={15} />
              <input
                aria-label="Search records"
                placeholder="Search your records…"
                maxLength={200}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button className="
              vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
              [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
              rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
              font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
              [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
              [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
              [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
              [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
            ">Search</button>
            {search && (
              <button
                type="button"
                className="inline-flex items-center gap-[6px] text-[#799464] text-[10px] [border-top:0] [border-right:0] [border-bottom:0] [border-left:0] [background:none] p-[0]"
                onClick={() => {
                  setQuery("");
                  setSearch("");
                  setPage(1);
                }}
              >
                Clear
              </button>
            )}
          </form>
        )}
        {resource.loading ? (
          <Loading />
        ) : resource.error ? (
          <ErrorView error={resource.error} retry={resource.retry} />
        ) : !resource.data?.rows.length ? (
          <Empty
            title={`No ${section === "revenue" ? "earnings" : section} found`}
            text="New records will appear here as your business grows. Try another search if you have filters applied."
            action={add}
          />
        ) : section === "services" ? (
          <div className="
            grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[20px] p-[22px]
            vendor-compact:grid-cols-[repeat(2,_minmax(0,_1fr))] vendor-mobile:p-[17px] vendor-mobile:gap-[15px]
            vendor-phone:grid-cols-[1fr]
          ">
            {resource.data.rows.map((row) => (
              <article className="
                [border-top:1px_solid_#e3eadd] [border-right:1px_solid_#e3eadd] [border-bottom:1px_solid_#e3eadd]
                [border-left:1px_solid_#e3eadd] rounded-[9px] overflow-hidden min-w-[0] [&_>_div]:p-[17px]
                [&_h3]:text-[14px] [&_h3]:leading-[1.5] [&_h3]:[margin:0_0_9px] [&_h3]:[overflow-wrap:anywhere]
                [&_footer]:flex [&_footer]:items-center [&_footer]:gap-[4px]
                [&_footer]:[border-top:1px_solid_#eef2e6] [&_footer]:mt-[15px] [&_footer]:pt-[11px]
                [&_footer_small]:text-[7px] [&_footer_small]:text-[#afbc9f] [&_footer_small]:ml-[auto]
              " key={row.id}>
                <Link to={`/vendor/services/${row.id}`}>
                  <Image
                    src={row.image}
                    alt={row.name}
                    className="w-[100%] h-[180px] object-cover vendor-mobile:h-[145px] vendor-phone:h-[205px]"
                  />
                </Link>
                <div>
                  <div className="flex items-center justify-between gap-[9px] mb-[9px] [&_>_span:first-child]:text-[#9cae8d] [&_>_span:first-child]:text-[8px]">
                    <span>{row.category}</span>
                    <span className="inline-flex items-center gap-[4px] text-[#b7a372] text-[9px] whitespace-nowrap">
                      <Star size={12} fill="currentColor" />
                      {row.rating == null
                        ? "New"
                        : Number(row.rating).toFixed(1)}
                    </span>
                  </div>
                  <Link to={`/vendor/services/${row.id}`}>
                    <h3>{row.name}</h3>
                  </Link>
                  <div className="flex items-center gap-[8px] mb-[12px] [&_strong]:text-[#5f7d4e] [&_strong]:text-[17px] [&_strong]:font-medium [&_span]:text-[8px] [&_span]:text-[#aab99a]">
                    <strong>
                      {row.price == null ? "On request" : money(row.price)}
                    </strong>
                    <span>{row.pricingType}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{row.status}</Badge>
                    <Badge>{row.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <footer>
                    <Link
                      to={`/vendor/services/${row.id}`}
                      className="
                        vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                        [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                        [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                        [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                      "
                      title="View service"
                      aria-label={`View ${row.name}`}
                    >
                      <Eye size={15} />
                    </Link>
                    <Link
                      to={`/vendor/services/${row.id}/edit`}
                      className="
                        vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                        [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                        [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                        [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                      "
                      title="Edit service"
                      aria-label={`Edit ${row.name}`}
                    >
                      <Pencil size={15} />
                    </Link>
                    <button
                      className="
                        vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                        [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                        [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                        [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                      "
                      onClick={() => open("duplicate", row)}
                      title="Duplicate service"
                      aria-label={`Duplicate ${row.name}`}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      className="
                        vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                        [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                        [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                        [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                      "
                      onClick={() => open("active", row)}
                      title={row.active ? "Deactivate" : "Activate"}
                      aria-label={`${row.active ? "Deactivate" : "Activate"} ${row.name}`}
                    >
                      <Power size={15} />
                    </button>
                    <small>Added {date(row.createdAt)}</small>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto w-[100%] min-w-[0]">
            <table className="
              w-[100%] border-collapse text-left text-[10px] leading-[1.6] [&_th]:text-[#9cac8c] [&_th]:font-medium
              [&_th]:text-[8px] [&_th]:tracking-[0.3px] [&_th]:[padding:12px_20px] [&_th]:[background:#fafcf7]
              [&_th]:[border-top:1px_solid_#f0f3e9] [&_th]:[border-bottom:1px_solid_#eaf0e1]
              [&_th]:whitespace-nowrap [&_td]:[padding:16px_20px] [&_td]:[border-bottom:1px_solid_#f0f3eb]
              [&_td]:text-[#687f59] [&_td]:max-w-[270px] [&_td]:[vertical-align:middle]
              [&_td]:[overflow-wrap:anywhere] [&_tr:last-child_td]:[border-bottom:0] [&_td_>_strong]:text-[10px]
              [&_td_>_strong]:font-medium [&_td_>_strong]:text-[#6b855b] [&_td_>_small]:block
              [&_td_>_small]:text-[#a6b296] [&_td_>_small]:text-[8px] [&_td_>_small]:mt-[3px]
              [&_tbody_tr:hover]:[background:#fdfefb] vendor-phone:[&_thead]:hidden vendor-phone:block
              vendor-phone:w-[100%] vendor-phone:[&_tbody]:block vendor-phone:[&_tbody]:w-[100%]
              vendor-phone:[&_tbody_tr]:grid vendor-phone:[&_tbody_tr]:grid-cols-[repeat(2,_minmax(0,_1fr))]
              vendor-phone:[&_tbody_tr]:gap-[13px] vendor-phone:[&_tbody_tr]:p-[17px]
              vendor-phone:[&_tbody_tr]:[border-bottom:1px_solid_#edf3e2] vendor-phone:[&_td]:block
              vendor-phone:[&_td]:w-[100%] vendor-phone:[&_td]:max-w-[none] vendor-phone:[&_td]:[border-top:0]
              vendor-phone:[&_td]:[border-right:0] vendor-phone:[&_td]:[border-bottom:0]
              vendor-phone:[&_td]:[border-left:0] vendor-phone:[&_td]:p-[0] vendor-phone:[&_td]:text-[10px]
              vendor-phone:[&_td]:min-w-[0] vendor-phone:[&_td::before]:[content:attr(data-label)]
              vendor-phone:[&_td::before]:block vendor-phone:[&_td::before]:text-[#b6c5a3]
              vendor-phone:[&_td::before]:text-[7px] vendor-phone:[&_td::before]:mb-[4px]
              vendor-phone:[&_td:first-child]:col-[1/-1] vendor-phone:[&_td:last-child]:col-[1/-1]
            ">
              <thead>
                <tr>
                  {columns[section].map(([key, label]) => (
                    <th key={key}>{label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.rows.map((row) => (
                  <tr key={row.id}>
                    {columns[section].map(([key, label]) => (
                      <td key={key} data-label={label}>
                        <Cell name={key} row={row} />
                      </td>
                    ))}
                    <td data-label="Actions">
                      <div className="flex items-center gap-[4px] flex-wrap min-w-[55px] [&_.vw-button]:[padding:5px_8px] [&_.vw-button]:text-[8px]">
                        <button
                          className="
                            vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                            [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                            [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                            [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                          "
                          title="View details"
                          aria-label="View details"
                          onClick={() => open("view", row)}
                        >
                          <Eye size={15} />
                        </button>
                        {section === "requests" && (
                          <Link
                            className="
                              vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                              [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                              rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                              font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                              [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                              [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                              [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                              [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                            "
                            to={`/vendor/quotations/new?event=${encodeURIComponent(row.eventId)}`}
                          >
                            Create quotation
                          </Link>
                        )}
                        {section === "bookings" && (
                          <>
                            <Link
                              className="
                                vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                                [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                                rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                                font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                                [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                                [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                                [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                                [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                              "
                              to={`/vendor/bookings/${row.id}`}
                            >
                              Manage booking
                            </Link>
                            {row.status === "Pending" && (
                              <>
                                <button
                                  className="
                                    vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                                    [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                                    rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                                    font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                                    [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                                    [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                                    [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                                    [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                                    vw-accept
                                  "
                                  onClick={() => open("Accept", row)}
                                >
                                  <Check size={13} />
                                  Accept
                                </button>
                                <button
                                  className="
                                    vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                                    [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                                    rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                                    font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                                    [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                                    [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                                    [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                                    [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                                    vw-danger
                                  "
                                  onClick={() => open("Reject", row)}
                                >
                                  <X size={13} />
                                  Reject
                                </button>
                              </>
                            )}
                            <Link
                              className="
                                vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                                [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                                [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                                [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                              "
                              title="Send quotation"
                              to={`/vendor/quotations/new?event=${encodeURIComponent(row.eventId || "")}`}
                            >
                              <ReceiptText size={15} />
                            </Link>
                            <button
                              className="
                                vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                                [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                                [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                                [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                              "
                              title="Message customer"
                              onClick={() => message(row)}
                            >
                              <MessageSquare size={15} />
                            </button>
                          </>
                        )}
                        {section === "packages" && (
                          <Link
                            className="
                              vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                              [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                              [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                              [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                            "
                            title="Edit package"
                            to={`/vendor/packages/${row.id}/edit`}
                          >
                            <Pencil size={15} />
                          </Link>
                        )}
                        {editor && (
                          <button
                            className="
                              vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                              [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                              [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                              [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                            "
                            title="Edit record"
                            onClick={() => open("edit", row)}
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {mutable && (
                          <button
                            className="
                              vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                              [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                              [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                              [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                            "
                            title={row.active ? "Deactivate" : "Activate"}
                            onClick={() => open("active", row)}
                          >
                            <Power size={15} />
                          </button>
                        )}
                        {section === "quotations" && (
                          <>
                            {row.status === "Draft" && (
                              <>
                                <Link
                                  className="
                                    vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                                    [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                                    [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                                    [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                                  "
                                  title="Edit draft"
                                  to={`/vendor/quotations/${row.id}/edit`}
                                >
                                  <Pencil size={15} />
                                </Link>
                                <button
                                  className="
                                    vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                                    [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                                    rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                                    font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                                    [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                                    [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                                    [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                                    [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                                  "
                                  onClick={() => open("Send", row)}
                                >
                                  Send
                                </button>
                              </>
                            )}
                            {["Draft", "Sent", "Viewed"].includes(
                              row.status,
                            ) && (
                              <button
                                className="
                                  vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                                  [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                                  [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                                  [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                                "
                                title="Cancel quotation"
                                onClick={() => open("Cancel", row)}
                              >
                                <X size={15} />
                              </button>
                            )}
                          </>
                        )}
                        {section === "documents" && (
                          <button
                            className="
                              vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                              [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                              [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                              [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                            "
                            title="Download document"
                            onClick={async () => {
                              try {
                                download(
                                  await vendorRequest(
                                    `/documents/${row.id}/file`,
                                    { download: true },
                                  ),
                                  row.type,
                                );
                              } catch (e) {
                                notify(e.message);
                              }
                            }}
                          >
                            <Download size={15} />
                          </button>
                        )}
                        {section === "notifications" &&
                          ["Quotation", "QuotationRequest"].includes(
                            row.referenceType,
                          ) &&
                          /^[0-9a-f-]{36}$/i.test(row.referenceId || "") && (
                            <Link
                              className="
                                vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                                [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                                rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                                font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                                [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                                [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                                [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                                [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                              "
                              to={`/vendor/${row.referenceType === "Quotation" ? "quotations" : "requests"}/${row.referenceId}`}
                            >
                              View details
                            </Link>
                          )}
                        {section === "notifications" && !row.isRead && (
                          <button
                            className="
                              vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                              [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                              rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                              font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                              [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                              [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                              [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                              [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                            "
                            onClick={() =>
                              act(`/notifications/${row.id}/read`, "PATCH", {})
                            }
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {resource.data && !resource.loading && (
          <footer className="
            flex justify-between items-center gap-[12px] [padding:14px_21px] [border-top:1px_solid_#edf2e5]
            text-[#aab69b] text-[9px] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-[10px]
            vendor-phone:flex-col vendor-phone:gap-[8px]
          ">
            <span>
              {resource.data.total
                ? `${(page - 1) * 12 + 1}–${Math.min(page * 12, resource.data.total)}`
                : "0"}{" "}
              of {resource.data.total} records
            </span>
            <div>
              <button
                className="
                  vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                  [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                  [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                  [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                "
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                Page {page} of{" "}
                {Math.max(1, Math.ceil(resource.data.total / 12))}
              </span>
              <button
                className="
                  vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
                  [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
                  [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
                  [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
                "
                disabled={page * 12 >= resource.data.total}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </Panel>
      {formError && !dialog && (
        <p className="
          vw-form-error [background:#fff4ee] [border-top:1px_solid_#f0ddcf] [border-right:1px_solid_#f0ddcf]
          [border-bottom:1px_solid_#f0ddcf] [border-left:1px_solid_#f0ddcf] text-[#b6836e]! [padding:12px_15px]
          rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]
        " role="alert">
          {formError}
        </p>
      )}
      {dialog?.action === "edit" ? (
        <RecordEditor
          kind={section}
          row={dialog.row}
          close={() => setDialog(null)}
          onSaved={() => setVersion((v) => v + 1)}
        />
      ) : dialog?.action === "upload" ? (
        <DocumentUpload
          close={() => setDialog(null)}
          onSaved={() => setVersion((v) => v + 1)}
        />
      ) : (
        dialog && (
          <Modal
            title={
              dialog.action === "view"
                ? "Record details"
                : dialog.action === "active"
                  ? `${dialog.row.active ? "Deactivate" : "Activate"} ${section === "services" ? "service" : "record"}`
                  : `${dialog.action} ${section === "quotations" ? "quotation" : "booking"}`
            }
            close={() => setDialog(null)}
            busy={busy}
          >
            {dialog.action === "view" ? (
              <div className="grid gap-[19px] [padding:22px_24px]">
                <dl className="
                  vw-details grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[23px] m-[0] [&_>_div]:min-w-[0]
                  [&_dt]:text-[#a0b18d] [&_dt]:uppercase [&_dt]:text-[8px] [&_dt]:tracking-[0.6px]
                  [&_dt]:[margin:0_0_5px] [&_dd]:text-[#7d9668] [&_dd]:text-[11px] [&_dd]:[overflow-wrap:anywhere]
                  [&_dd]:whitespace-pre-wrap [&_dd]:m-[0] vendor-mobile:gap-[20px] vendor-phone:grid-cols-[1fr]
                ">
                  {Object.entries(dialog.row)
                    .filter(
                      ([key]) =>
                        !["image", "customerId", "updatedAt"].includes(key),
                    )
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
                        <dd>
                          {value === null
                            ? "Not provided"
                            : typeof value === "boolean"
                              ? value
                                ? "Yes"
                                : "No"
                              : /At$|Date$|^validUntil$/.test(key)
                                ? timestamp(value)
                                : String(value)}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>
            ) : (
              <form
                className="
                  min-w-[0] [&_fieldset]:[border-top:0] [&_fieldset]:[border-right:0] [&_fieldset]:[border-bottom:0]
                  [&_fieldset]:[border-left:0] [&_fieldset]:p-[0] [&_fieldset]:m-[0] [&_fieldset]:min-w-[0]
                  [&_>_.vw-panel_+_.vw-panel]:mt-[22px] grid gap-[19px] [padding:22px_24px]
                "
                onSubmit={(e) => {
                  e.preventDefault();
                  const fields = Object.fromEntries(
                      new FormData(e.currentTarget),
                    ),
                    version = dialog.row.updatedAt
                      ? { expectedUpdatedAt: dialog.row.updatedAt }
                      : {};
                  if (dialog.action === "active")
                    act(`/${section}/${dialog.row.id}/active`, "PATCH", {
                      active: !dialog.row.active,
                      ...version,
                    });
                  else if (dialog.action === "duplicate")
                    act(`/services/${dialog.row.id}/duplicate`, "POST", {});
                  else if (section === "bookings")
                    act(`/bookings/${dialog.row.id}/decision`, "POST", {
                      action: dialog.action,
                      note: fields.note || "",
                      ...version,
                    });
                  else
                    act(`/quotations/${dialog.row.id}/action`, "POST", {
                      action: dialog.action,
                      ...version,
                    });
                }}
              >
                {formError && (
                  <p className="
                    vw-form-error [background:#fff4ee] [border-top:1px_solid_#f0ddcf] [border-right:1px_solid_#f0ddcf]
                    [border-bottom:1px_solid_#f0ddcf] [border-left:1px_solid_#f0ddcf] text-[#b6836e]! [padding:12px_15px]
                    rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]
                  " role="alert">
                    {formError}
                  </p>
                )}
                <p className="
                  [background:#f4f7ee] [border-top:1px_solid_#e8eedc] [border-right:1px_solid_#e8eedc]
                  [border-bottom:1px_solid_#e8eedc] [border-left:1px_solid_#e8eedc] text-[#95a581]! [padding:12px_15px]
                  rounded-[6px] text-[10px]! leading-[1.8]
                ">
                  {dialog.action === "duplicate"
                    ? "Create an inactive copy with its service items. The copy will need admin approval."
                    : dialog.action === "active"
                      ? "This changes availability for sale. Existing bookings remain in your records."
                      : `Confirm your decision for ${dialog.row.number}. The customer will be notified.`}
                </p>
                {section === "requests" && (
                  <Link
                    className="
                      vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                      [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                      rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                      font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                      [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                      [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                      [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                      [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                    "
                    to={`/vendor/quotations/new?event=${encodeURIComponent(row.eventId)}`}
                  >
                    Create quotation
                  </Link>
                )}
                {section === "bookings" && (
                  <Field
                    label={
                      dialog.action === "Reject"
                        ? "Rejection reason"
                        : "Note for your customer (optional)"
                    }
                  >
                    <textarea
                      name="note"
                      rows={3}
                      maxLength={1000}
                      required={dialog.action === "Reject"}
                    />
                  </Field>
                )}
                <div className="flex justify-end gap-[9px] pt-[7px]">
                  <button
                    type="button"
                    className="
                      vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                      [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                      rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                      font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                      [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                      [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                      [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                      [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                    "
                    onClick={() => setDialog(null)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button className="
                    vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                    [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                    rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                    font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                    [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                    [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                    [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                    [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                    vw-primary
                  " disabled={busy}>
                    {busy ? "Saving…" : "Confirm"}
                  </button>
                </div>
              </form>
            )}
          </Modal>
        )
      )}
    </>
  );
}
function DocumentUpload({ close, onSaved }) {
  const { notify } = useAuth(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title="Upload verification document" close={close} busy={busy}>
      <form
        className="
          min-w-[0] [&_fieldset]:[border-top:0] [&_fieldset]:[border-right:0] [&_fieldset]:[border-bottom:0]
          [&_fieldset]:[border-left:0] [&_fieldset]:p-[0] [&_fieldset]:m-[0] [&_fieldset]:min-w-[0]
          [&_>_.vw-panel_+_.vw-panel]:mt-[22px] grid gap-[19px] [padding:22px_24px]
        "
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            fields = new FormData(form);
          setBusy(true);
          setError("");
          try {
            const file = fields.get("file");
            if (
              !["application/pdf", "image/png", "image/jpeg"].includes(
                file.type,
              )
            )
              throw new Error("Choose a PDF, PNG or JPEG document.");
            const result = await save("/documents", "POST", {
              type: fields.get("type"),
              number: fields.get("number") || "",
              base64: await readFile(file),
            });
            notify(result.message);
            onSaved();
            close();
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && (
          <p className="
            vw-form-error [background:#fff4ee] [border-top:1px_solid_#f0ddcf] [border-right:1px_solid_#f0ddcf]
            [border-bottom:1px_solid_#f0ddcf] [border-left:1px_solid_#f0ddcf] text-[#b6836e]! [padding:12px_15px]
            rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]
          " role="alert">
            {error}
          </p>
        )}
        <Field label="Document type">
          <select name="type">
            {[
              "Business Registration",
              "GST",
              "PAN",
              "Identity Proof",
              "Address Proof",
              "Other Supporting Document",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Field>
        <Field label="Document number (optional)">
          <input name="number" maxLength={100} />
        </Field>
        <Field label="Private document" hint="PDF, PNG or JPEG · Up to 5 MB">
          <input
            type="file"
            name="file"
            required
            accept="application/pdf,image/png,image/jpeg"
          />
        </Field>
        <p className="
          [background:#f4f7ee] [border-top:1px_solid_#e8eedc] [border-right:1px_solid_#e8eedc]
          [border-bottom:1px_solid_#e8eedc] [border-left:1px_solid_#e8eedc] text-[#95a581]! [padding:12px_15px]
          rounded-[6px] text-[10px]! leading-[1.8]
        ">
          Each new upload is kept as a separate document for verification. Your
          previous records are preserved.
        </p>
        <div className="flex justify-end gap-[9px] pt-[7px]">
          <button
            type="button"
            className="
              vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
              [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
              rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
              font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
              [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
              [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
              [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
              [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
            "
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button className="
            vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
            [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
            rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
            font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
            [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
            [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
            [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
            [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
            vw-primary
          " disabled={busy}>
            <Upload size={14} />
            {busy ? "Uploading…" : "Upload securely"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
