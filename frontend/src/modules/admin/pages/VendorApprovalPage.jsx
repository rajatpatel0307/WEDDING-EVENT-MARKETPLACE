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
    <div className="cd-page w-full min-w-0 max-w-[1720px] [margin:0_auto]">
      <header className="va-queue-heading flex items-center [@media(width<=600px)]:items-start justify-between gap-[20px] mb-[24px] [@media(width<=600px)]:flex-col">
        <div>
          <div className="ad-eyebrow text-[8px] [@media(width<=767px)]:text-[7px] tracking-[1.7px] text-[#7d9183] flex items-center gap-[6px] [&_>_span]:w-[5px] [&_>_span]:h-[5px] [&_>_span]:[background:#bfa471] [&_>_span]:rounded-[50%]">VENDOR VERIFICATION</div>
          <h1>Vendor approval queue</h1>
          <p>
            Review applications, verify documents and welcome trusted
            professionals.
          </p>
        </div>
        <div className="va-queue-count [padding:12px_18px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dbe8dd] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dbe8dd] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dbe8dd] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dbe8dd] rounded-[9px] [background:#eaf3ec] text-[#48704f] text-[12px] whitespace-nowrap [&_strong]:text-[20px] [&_strong]:mr-[6px]">
          <strong>{result ? number(result.pendingCount) : "—"}</strong> awaiting
          review
        </div>
      </header>
      <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
        <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
          <div>
            <h2>Applications</h2>
            <p>Pending and under-review applications appear by default.</p>
          </div>
          <ShieldCheck size={20} />
        </div>
        <div className="va-filters grid grid-cols-[repeat(4,_minmax(0,_1fr))] [@media(width<=600px)]:grid-cols-[1fr] [@media(600px<width<=1000px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[15px] p-[22px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e7eee3] [&_label]:grid [&_label]:gap-[5px] [&_label]:min-w-0 [&_label]:text-[10px] [&_label]:text-[#7d8f79] [&_input]:w-full [&_select]:w-full [&_.va-search]:col-[span_2] [@media(width<=600px)]:[&_.va-search]:col-[auto]">
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
        <div className="va-queue-toolbar flex justify-between items-center gap-[12px] [padding:15px_22px] [&_p]:m-[0]">
          <p>
            {result
              ? `${number(result.total)} matching applications`
              : "Loading applications"}
          </p>
          <button
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
          <div className="ad-table-wrap w-full min-w-0">
            <table className="ad-table cd-table w-full border-collapse [table-layout:fixed] text-[10px] [@media(width<=1200px)]:text-[9px] text-left [&_th]:[background:#fafbf8] [&_th]:text-[#94a08f] [&_th]:tracking-[0.3px] [&_th]:text-[9px] [&_th]:font-[500] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#eaf0e6] [&_th]:[padding:12px_17px] [@media(width<=1200px)]:[&_th]:[padding:12px_10px] [&_th]:[overflow-wrap:anywhere] [&_th_button]:flex [&_th_button]:items-center [&_th_button]:gap-[4px] [&_th_button]:max-w-full [&_th_button]:text-left [&_th_button]:[border-top-width:0] [&_th_button]:[border-top-style:none] [&_th_button]:[border-top-color:currentColor] [&_th_button]:[border-right-width:0] [&_th_button]:[border-right-style:none] [&_th_button]:[border-right-color:currentColor] [&_th_button]:[border-bottom-width:0] [&_th_button]:[border-bottom-style:none] [&_th_button]:[border-bottom-color:currentColor] [&_th_button]:[border-left-width:0] [&_th_button]:[border-left-style:none] [&_th_button]:[border-left-color:currentColor] [&_th_button]:[background:none] [&_th_button]:text-[inherit] [&_th_button]:p-[0] [&_td]:[padding:15px_17px] [@media(width<=767px)]:[&_td]:p-[0] [@media(767px<width<=1200px)]:[&_td]:[padding:12px_10px] [&_td]:[border-bottom-width:1px] [@media(width<=767px)]:[&_td]:[border-bottom-width:0] [&_td]:[border-bottom-style:solid] [@media(width<=767px)]:[&_td]:[border-bottom-style:none] [&_td]:[border-bottom-color:#f0f3ec] [@media(width<=767px)]:[&_td]:[border-bottom-color:currentColor] [&_td]:text-[#758570] [&_td]:[overflow-wrap:anywhere] [&_td]:[vertical-align:top] [&_tbody_tr:last-child_td]:[border-bottom-width:0] [&_tbody_tr:last-child_td]:[border-bottom-style:none] [&_tbody_tr:last-child_td]:[border-bottom-color:currentColor] [&_tbody_tr:hover]:[background:#fcfdf9] [@media(width<=767px)]:[&_thead]:hidden [@media(width<=767px)]:block [@media(width<=767px)]:[&_tbody]:block [@media(width<=767px)]:[&_tbody]:w-full [@media(width<=767px)]:[&_tr]:block [@media(width<=767px)]:[&_tr]:w-full [@media(width<=767px)]:[&_td]:block [@media(width<=767px)]:[&_td]:w-full [@media(width<=767px)]:[&_tbody_tr]:[padding:13px_16px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-width:1px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-style:solid] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-color:#e9eee4] [@media(width<=767px)]:[&_tbody_tr]:grid [@media(width<=767px)]:[&_tbody_tr]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:[&_tbody_tr]:gap-[11px_17px] [@media(width<=767px)]:[&_td]:[border-top-width:0] [@media(width<=767px)]:[&_td]:[border-top-style:none] [@media(width<=767px)]:[&_td]:[border-top-color:currentColor] [@media(width<=767px)]:[&_td]:[border-right-width:0] [@media(width<=767px)]:[&_td]:[border-right-style:none] [@media(width<=767px)]:[&_td]:[border-right-color:currentColor] [@media(width<=767px)]:[&_td]:[border-left-width:0] [@media(width<=767px)]:[&_td]:[border-left-style:none] [@media(width<=767px)]:[&_td]:[border-left-color:currentColor] [@media(width<=767px)]:[&_td]:text-[10px] [@media(width<=767px)]:[&_td]:min-w-0 [@media(width<=767px)]:[&_td:before]:[content:attr(data-label)] [@media(width<=767px)]:[&_td:before]:block [@media(width<=767px)]:[&_td:before]:text-[8px] [@media(width<=767px)]:[&_td:before]:text-[#a1ad96] [@media(width<=767px)]:[&_td:before]:mb-[4px] [@media(width<=767px)]:[&_td:first-child]:col-[1/-1] [@media(width<=767px)]:[&_td:last-child_.ad-row-actions]:ml-[-5px] [&_th]:whitespace-nowrap [&_td]:max-w-[300px] [@media(width<=600px)]:[&_td]:max-w-[none] [@media(width<=600px)]:[&_.cd-long-text]:min-w-0 [@media(width<=600px)]:[&_.cd-long-text]:max-w-[none] [@media(width<=600px)]:[&_.cd-nowrap]:[white-space:normal]">
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
                        className="ad-text-link flex items-center gap-[5px] text-[#5a8671] text-[10px] whitespace-nowrap"
                        to={`/admin/vendors/${row.id}`}
                      >
                        {row.name}
                      </Link>
                      <small className="ad-record-contact block text-[8px] font-[400] text-[#9aa890] mt-[3px] [overflow-wrap:anywhere]">{row.email}</small>
                    </td>
                    <td data-label="Owner">{row.owner}</td>
                    <td data-label="Category">
                      {row.categories || "Not provided"}
                    </td>
                    <td data-label="Location">{row.city || "Not provided"}</td>
                    <td data-label="Documents">
                      <div className="va-document-count grid gap-[5px] [justify-items:start]">
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
                      <div className="va-row-actions flex gap-[6px] flex-wrap min-w-[170px]">
                        <Link
                          className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                          to={`/admin/vendors/${row.id}`}
                        >
                          <Eye size={13} /> View
                        </Link>
                        {["Pending", "UnderReview", "Suspended"].includes(
                          row.status,
                        ) && (
                          <button
                            className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                            onClick={() =>
                              setDialog({ id: row.id, action: "Approved" })
                            }
                          >
                            <Check size={13} /> Approve
                          </button>
                        )}
                        {["Pending", "UnderReview"].includes(row.status) && (
                          <button
                            className="ad-button ad-danger inline-flex justify-center items-center gap-[7px] [background:#fff8f5] [border-top-width:1px] [border-top-style:solid] [border-top-color:#efd7d3] [border-right-width:1px] [border-right-style:solid] [border-right-color:#efd7d3] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#efd7d3] [border-left-width:1px] [border-left-style:solid] [border-left-color:#efd7d3] rounded-[7px] [padding:8px_12px] text-[#b25454] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f9e8e3] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff]"
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
          <div className="cd-pagination flex items-center [&_>_div]:flex [&_>_div]:items-center justify-between gap-[15px] [padding:17px_23px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edf1ed] text-[11px] text-[#839087] [&_>_div]:gap-[12px] [@media(width<=600px)]:flex-col">
            <span>
              {result.total
                ? `${number((page - 1) * 20 + 1)}–${number(Math.min(page * 20, result.total))}`
                : "0"}{" "}
              of {number(result.total)}
            </span>
            <div>
              <button
                className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
                className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
