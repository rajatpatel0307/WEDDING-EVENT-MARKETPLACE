import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { adminRequest, date, number } from "../api";
import { Badge, Empty, ErrorState, Skeleton } from "../components/AdminTable";
import VendorDecisionDialog from "../components/VendorDecisionDialog";
import { vendorChangedEvent } from "../vendor-workflow";
import "../customer-details.css";
import "../vendor-workflow.css";

const initial = {
  q: "",
  category: "",
  city: "",
  from: "",
  to: "",
  documentStatus: "",
  status: "",
};
export default function VendorApprovalPage() {
  const [filters, setFilters] = useState(initial),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [result, setResult] = useState(null),
    [facets, setFacets] = useState({ categories: [], cities: [] }),
    [error, setError] = useState(null),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [dialog, setDialog] = useState(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(filters.q);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.q]);
  useEffect(() => {
    const changed = () => setRevision((v) => v + 1);
    window.addEventListener(vendorChangedEvent, changed);
    return () => window.removeEventListener(vendorChangedEvent, changed);
  }, []);
  const params = new URLSearchParams(
    Object.entries({ ...filters, q: search, page, pageSize: 20 }).filter(
      ([, value]) => value !== "",
    ),
  ).toString();
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(null);
    adminRequest(`/vendors/pending?${params}`, { signal: abort.signal })
      .then((value) => {
        setResult(value);
        setFacets({ categories: value.categories, cities: value.cities });
        setPage((p) => Math.min(p, Math.max(1, Math.ceil(value.total / 20))));
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [params, revision]);
  function change(name, value) {
    setFilters((old) => ({ ...old, [name]: value }));
    if (name !== "q") setPage(1);
  }
  return (
    <div className="cd-page">
      <header className="va-queue-heading">
        <div>
          <div className="ad-eyebrow">VENDOR VERIFICATION</div>
          <h1>Vendor approval queue</h1>
          <p>
            Review applications, verify documents and welcome trusted
            professionals.
          </p>
        </div>
        <div className="va-queue-count">
          <strong>{result ? number(result.pendingCount) : "—"}</strong> awaiting
          review
        </div>
      </header>
      <section className="ad-panel">
        <div className="ad-panel-heading">
          <div>
            <h2>Applications</h2>
            <p>Pending and under-review applications appear by default.</p>
          </div>
          <ShieldCheck size={20} />
        </div>
        <div className="va-filters">
          <label className="va-search">
            Search vendor
            <input
              value={filters.q}
              onChange={(e) => change("q", e.target.value)}
              placeholder="Business, owner or email"
              maxLength={200}
            />
          </label>
          <label>
            Category
            <select
              value={filters.category}
              onChange={(e) => change("category", e.target.value)}
            >
              <option value="">All categories</option>
              {facets.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            City
            <select
              value={filters.city}
              onChange={(e) => change("city", e.target.value)}
            >
              <option value="">All cities</option>
              {facets.cities.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Registered from
            <input
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => change("from", e.target.value)}
            />
          </label>
          <label>
            Registered until
            <input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => change("to", e.target.value)}
            />
          </label>
          <label>
            Document status
            <select
              value={filters.documentStatus}
              onChange={(e) => change("documentStatus", e.target.value)}
            >
              <option value="">All document statuses</option>
              {["Missing", "Pending", "Approved", "Rejected"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Verification status
            <select
              value={filters.status}
              onChange={(e) => change("status", e.target.value)}
            >
              <option value="">Awaiting review</option>
              {[
                "Pending",
                "UnderReview",
                "Approved",
                "Rejected",
                "Suspended",
              ].map((s) => (
                <option key={s} value={s}>
                  {s === "UnderReview" ? "Under Review" : s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="va-queue-toolbar">
          <p>
            {result
              ? `${number(result.total)} matching applications`
              : "Loading applications"}
          </p>
          <button
            className="ad-button"
            onClick={() => {
              setFilters(initial);
              setSearch("");
              setPage(1);
              setRevision((v) => v + 1);
            }}
          >
            <RefreshCw size={13} /> Reset filters
          </button>
        </div>
        {loading ? (
          <Skeleton rows={6} />
        ) : error ? (
          <ErrorState error={error} retry={() => setRevision((v) => v + 1)} />
        ) : !result?.rows.length ? (
          <Empty
            text="No matching vendor applications"
            description="Change the filters or return later for new applications."
          />
        ) : (
          <div className="ad-table-wrap">
            <table className="ad-table cd-table">
              <caption className="sr-only">
                Vendor approval applications
              </caption>
              <thead>
                <tr>
                  {[
                    "Business",
                    "Owner",
                    "Category",
                    "Location",
                    "Documents",
                    "Registration date",
                    "Status",
                    "Actions",
                  ].map((label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Business">
                      <Link
                        className="ad-text-link"
                        to={`/admin/vendors/${row.id}`}
                      >
                        {row.name}
                      </Link>
                      <small className="ad-record-contact">{row.email}</small>
                    </td>
                    <td data-label="Owner">{row.owner}</td>
                    <td data-label="Category">
                      {row.categories || "Not provided"}
                    </td>
                    <td data-label="Location">{row.city || "Not provided"}</td>
                    <td data-label="Documents">
                      <div className="va-document-count">
                        <Badge>{row.documentStatus}</Badge>
                        <span>{number(row.documents)} files</span>
                      </div>
                    </td>
                    <td data-label="Registration date">
                      {date(row.createdAt)}
                    </td>
                    <td data-label="Status">
                      <Badge>{row.status}</Badge>
                    </td>
                    <td data-label="Actions">
                      <div className="va-row-actions">
                        <Link
                          className="ad-button"
                          to={`/admin/vendors/${row.id}`}
                        >
                          <Eye size={13} /> View
                        </Link>
                        {["Pending", "UnderReview", "Suspended"].includes(
                          row.status,
                        ) && (
                          <button
                            className="ad-button ad-primary"
                            onClick={() =>
                              setDialog({ id: row.id, action: "Approved" })
                            }
                          >
                            <Check size={13} /> Approve
                          </button>
                        )}
                        {["Pending", "UnderReview"].includes(row.status) && (
                          <button
                            className="ad-button ad-danger"
                            onClick={() =>
                              setDialog({ id: row.id, action: "Rejected" })
                            }
                          >
                            <X size={13} /> Reject
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
        {result && !loading && !error && (
          <div className="cd-pagination">
            <span>
              {result.total
                ? `${number((page - 1) * 20 + 1)}–${number(Math.min(page * 20, result.total))}`
                : "0"}{" "}
              of {number(result.total)}
            </span>
            <div>
              <button
                className="ad-button"
                aria-label="Previous page"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={15} />
              </button>
              <span>
                Page {page} of {Math.max(1, Math.ceil(result.total / 20))}
              </span>
              <button
                className="ad-button"
                aria-label="Next page"
                disabled={page * 20 >= result.total}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>
      {dialog && (
        <VendorDecisionDialog
          vendorId={dialog.id}
          action={dialog.action}
          close={() => setDialog(null)}
        />
      )}
    </div>
  );
}
