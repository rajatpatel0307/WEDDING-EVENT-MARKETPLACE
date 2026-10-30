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
    return <span className="vw-muted">—</span>;
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
      <span className="vw-rating">
        <Star size={13} fill="currentColor" />
        {value} / 5
      </span>
    );
  if (/At$|Date$|^validUntil$/.test(name)) return date(value);
  return (
    <span
      className={
        ["review", "message", "services", "description", "reason"].includes(
          name,
        )
          ? "vw-long-text"
          : ""
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
      <Link className="vw-button vw-primary" to="/vendor/services/new">
        <Plus size={15} /> Add service
      </Link>
    ) : section === "packages" ? (
      <Link className="vw-button vw-primary" to="/vendor/packages/new">
        <Plus size={15} /> Create package
      </Link>
    ) : ["quotations", "requests"].includes(section) ? (
      <Link className="vw-button vw-primary" to="/vendor/quotations/new">
        <Plus size={15} /> Create quotation
      </Link>
    ) : editor || section === "documents" ? (
      <button
        className="vw-button vw-primary"
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
          <span className="vw-result-count">
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
            className="vw-resource-search"
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
            <button className="vw-button">Search</button>
            {search && (
              <button
                type="button"
                className="vw-text-link"
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
          <div className="vw-service-grid">
            {resource.data.rows.map((row) => (
              <article className="vw-service-card" key={row.id}>
                <Link to={`/vendor/services/${row.id}`}>
                  <Image
                    src={row.image}
                    alt={row.name}
                    className="vw-service-card-image"
                  />
                </Link>
                <div>
                  <div className="vw-service-meta">
                    <span>{row.category}</span>
                    <span className="vw-rating">
                      <Star size={12} fill="currentColor" />
                      {row.rating == null
                        ? "New"
                        : Number(row.rating).toFixed(1)}
                    </span>
                  </div>
                  <Link to={`/vendor/services/${row.id}`}>
                    <h3>{row.name}</h3>
                  </Link>
                  <div className="vw-service-price">
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
                      className="vw-icon"
                      title="View service"
                      aria-label={`View ${row.name}`}
                    >
                      <Eye size={15} />
                    </Link>
                    <Link
                      to={`/vendor/services/${row.id}/edit`}
                      className="vw-icon"
                      title="Edit service"
                      aria-label={`Edit ${row.name}`}
                    >
                      <Pencil size={15} />
                    </Link>
                    <button
                      className="vw-icon"
                      onClick={() => open("duplicate", row)}
                      title="Duplicate service"
                      aria-label={`Duplicate ${row.name}`}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      className="vw-icon"
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
          <div className="vw-table-wrap">
            <table className="vw-table">
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
                      <div className="vw-row-actions">
                        <button
                          className="vw-icon"
                          title="View details"
                          aria-label="View details"
                          onClick={() => open("view", row)}
                        >
                          <Eye size={15} />
                        </button>
                        {section === "requests" && (
                          <Link
                            className="vw-button"
                            to={`/vendor/quotations/new?event=${encodeURIComponent(row.eventId)}`}
                          >
                            Create quotation
                          </Link>
                        )}
                        {section === "bookings" && (
                          <>
                            <Link
                              className="vw-button"
                              to={`/vendor/bookings/${row.id}`}
                            >
                              Manage booking
                            </Link>
                            {row.status === "Pending" && (
                              <>
                                <button
                                  className="vw-button vw-accept"
                                  onClick={() => open("Accept", row)}
                                >
                                  <Check size={13} />
                                  Accept
                                </button>
                                <button
                                  className="vw-button vw-danger"
                                  onClick={() => open("Reject", row)}
                                >
                                  <X size={13} />
                                  Reject
                                </button>
                              </>
                            )}
                            <Link
                              className="vw-icon"
                              title="Send quotation"
                              to={`/vendor/quotations/new?event=${encodeURIComponent(row.eventId || "")}`}
                            >
                              <ReceiptText size={15} />
                            </Link>
                            <button
                              className="vw-icon"
                              title="Message customer"
                              onClick={() => message(row)}
                            >
                              <MessageSquare size={15} />
                            </button>
                          </>
                        )}
                        {section === "packages" && (
                          <Link
                            className="vw-icon"
                            title="Edit package"
                            to={`/vendor/packages/${row.id}/edit`}
                          >
                            <Pencil size={15} />
                          </Link>
                        )}
                        {editor && (
                          <button
                            className="vw-icon"
                            title="Edit record"
                            onClick={() => open("edit", row)}
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {mutable && (
                          <button
                            className="vw-icon"
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
                                  className="vw-icon"
                                  title="Edit draft"
                                  to={`/vendor/quotations/${row.id}/edit`}
                                >
                                  <Pencil size={15} />
                                </Link>
                                <button
                                  className="vw-button"
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
                                className="vw-icon"
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
                            className="vw-icon"
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
                        {section === "notifications" && !row.isRead && (
                          <button
                            className="vw-button"
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
          <footer className="vw-pagination">
            <span>
              {resource.data.total
                ? `${(page - 1) * 12 + 1}–${Math.min(page * 12, resource.data.total)}`
                : "0"}{" "}
              of {resource.data.total} records
            </span>
            <div>
              <button
                className="vw-icon"
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
                className="vw-icon"
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
        <p className="vw-form-error" role="alert">
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
              <div className="vw-modal-form">
                <dl className="vw-details">
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
                className="vw-form vw-modal-form"
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
                  <p className="vw-form-error" role="alert">
                    {formError}
                  </p>
                )}
                <p className="vw-form-note">
                  {dialog.action === "duplicate"
                    ? "Create an inactive copy with its service items. The copy will need admin approval."
                    : dialog.action === "active"
                      ? "This changes availability for sale. Existing bookings remain in your records."
                      : `Confirm your decision for ${dialog.row.number}. The customer will be notified.`}
                </p>
                {section === "requests" && (
                  <Link
                    className="vw-button"
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
                <div className="vw-modal-actions">
                  <button
                    type="button"
                    className="vw-button"
                    onClick={() => setDialog(null)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button className="vw-button vw-primary" disabled={busy}>
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
        className="vw-form vw-modal-form"
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
          <p className="vw-form-error" role="alert">
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
        <p className="vw-form-note">
          Each new upload is kept as a separate document for verification. Your
          previous records are preserved.
        </p>
        <div className="vw-modal-actions">
          <button
            type="button"
            className="vw-button"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button className="vw-button vw-primary" disabled={busy}>
            <Upload size={14} />
            {busy ? "Uploading…" : "Upload securely"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
