import ApprovalTimeline from "../../../components/common/ApprovalTimeline";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminRequest, money, date } from "../api";
import DecisionDialog from "../components/ServiceDecisionDialog";
import { useAuth } from "../../../context/AuthContext";

function useReviewData(path, revision) {
  const [state, setState] = useState({ loading: true });
  const key = `${path}:${revision}`;
  useEffect(() => {
    const abort = new AbortController();
    adminRequest(path, { signal: abort.signal })
      .then((data) => setState({ key, data }))
      .catch((error) => {
        if (error.name !== "AbortError") setState({ key, error });
      });
    return () => abort.abort();
  }, [path, key]);
  return state.key === key ? state : { loading: true };
}
function Fields({ value }) {
  if (value == null || value === "") return <span>Not provided</span>;
  if (Array.isArray(value))
    return value.length ? (
      <ul>
        {value.map((item, i) => (
          <li key={i}>
            <Fields value={item} />
          </li>
        ))}
      </ul>
    ) : (
      <p>No records.</p>
    );
  if (typeof value === "object")
    return (
      <dl className="sa-fields grid gap-[10px] [margin:14px_0] [overflow-wrap:anywhere] [&_>_div]:grid [&_>_div]:grid-cols-[minmax(120px,_1fr)_minmax(0,_3fr)] [@media(width<=640px)]:[&_>_div]:grid-cols-[1fr] [&_>_div]:gap-[16px] [&_>_div]:[padding:9px_0] [&_>_div]:[border-bottom-width:1px] [&_>_div]:[border-bottom-style:solid] [&_>_div]:[border-bottom-color:#edf0ed] [&_dt]:font-[600] [&_dt]:text-[#64716a] [&_dd]:m-[0] [&_dd]:whitespace-pre-wrap">
        {Object.entries(value)
          .filter(([key]) => !["DetailsJson", "AttributesJson"].includes(key))
          .map(([key, val]) => (
            <div key={key}>
              <dt>{key.replace(/([a-z])([A-Z])/g, "$1 $2")}</dt>
              <dd>
                <Fields value={val} />
              </dd>
            </div>
          ))}
      </dl>
    );
  return (
    <span>
      {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
    </span>
  );
}
export default function ServiceApprovalPage({ review = false }) {
  const { serviceId } = useParams(),
    { notify } = useAuth();
  const [revision, setRevision] = useState(0),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [dialog, setDialog] = useState(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const refresh = () => setRevision((v) => v + 1);
  const state = useReviewData(
    review
      ? `/services/${serviceId}/review`
      : `/services/pending?page=${page}&q=${encodeURIComponent(search)}`,
    revision,
  );
  useEffect(() => {
    const update = () => setRevision((v) => v + 1);
    window.addEventListener("focus", update);
    return () => window.removeEventListener("focus", update);
  }, []);
  const saved = (message) => {
    setDialog(null);
    setNotice(message);
    notify(message);
    refresh();
  };
  const data = state.data;
  const s =
    review && data
      ? {
          id: data.ServiceId,
          name: data.ServiceName,
          vendor: data.BusinessName,
          category: data.CategoryName,
          price: data.BasePrice,
          location: data.document.location?.city,
          updatedAt: data.UpdatedAt,
        }
      : null;
  async function startReview() {
    setBusy(true);
    setActionError("");
    try {
      const result = await adminRequest(`/services/${serviceId}/start-review`, {
        method: "POST",
        body: JSON.stringify({
          expectedUpdatedAt: new Date(s.updatedAt).toISOString(),
        }),
      });
      setActionError("");
      saved(result.message);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="sa-page grid gap-[22px] [&_.ad-panel]:p-[24px] [@media(width<=640px)]:[&_.ad-panel]:p-[16px] [&_h2]:text-[19px] [&_h2]:mb-[16px] [&_h3]:mt-[16px]">
      <header className="sa-heading flex justify-between items-center [@media(width<=640px)]:items-start gap-[18px] [&_h1]:text-[28px] [&_h1]:[margin:6px_0] [&_p]:text-[#68716d] [@media(width<=640px)]:flex-col">
        <div>
          <p className="sa-eyebrow text-[11px] tracking-[2px] font-[700]">SERVICE APPROVAL</p>
          <h1>{review ? "Review service" : "Pending service approvals"}</h1>
          <p>
            {review
              ? "Inspect the complete listing before making a decision."
              : "Vendor approval and service approval are reviewed separately."}
          </p>
        </div>
        <Link
          className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
          to={review ? "/admin/services/pending" : "/admin/services"}
        >
          {review ? "Back to queue" : "All services"}
        </Link>
      </header>
      {notice && (
        <p role="status" className="sa-success [background:#e7f4ec] text-[#246140] p-[14px] rounded-[8px]">
          {notice}
        </p>
      )}
      {!review && (
        <form
          className="sa-actions flex gap-[10px] items-center flex-wrap [&_input]:min-w-[220px] [&_input]:p-[10px] [&_input]:[border-top-width:1px] [&_input]:[border-top-style:solid] [&_input]:[border-top-color:#dce2dd] [&_input]:[border-right-width:1px] [&_input]:[border-right-style:solid] [&_input]:[border-right-color:#dce2dd] [&_input]:[border-bottom-width:1px] [&_input]:[border-bottom-style:solid] [&_input]:[border-bottom-color:#dce2dd] [&_input]:[border-left-width:1px] [&_input]:[border-left-style:solid] [&_input]:[border-left-color:#dce2dd] [&_input]:rounded-[8px]"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(query);
          }}
        >
          <input
            aria-label="Search services or vendors"
            placeholder="Search service or vendor…"
            maxLength={200}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]">Search</button>
        </form>
      )}
      {state.loading && (
        <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]" role="status">
          Loading services…
        </section>
      )}
      {state.error && (
        <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]" role="alert">
          <p>{state.error.message}</p>
          <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={refresh}>
            Try again
          </button>
        </section>
      )}
      {data && !review && (
        <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
          <h2>
            Awaiting decision <span className="sa-count [padding:4px_10px] [background:#ecf1eb] rounded-[20px] text-[14px]">{data.total}</span>
          </h2>
          <div className="sa-table [overflow-x:auto] overflow-y-auto [margin:20px_0] [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px] [&_th]:[padding:14px_12px] [&_th]:text-left [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#e7ece8] [&_td]:[padding:14px_12px] [&_td]:text-left [&_td]:[border-bottom-width:1px] [&_td]:[border-bottom-style:solid] [&_td]:[border-bottom-color:#e7ece8] [&_th]:whitespace-nowrap [&_th]:text-[#68716d]">
            <table>
              <thead>
                <tr>
                  {[
                    "Service",
                    "Vendor",
                    "Category",
                    "Price",
                    "Location",
                    "Submitted Date",
                    "Documents / Verification",
                    "Status",
                    "Actions",
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/admin/services/${row.id}/review`}>
                        {row.name}{row.offerType && <small className="block">{({Sell:"Sell Only",Book:"Book Only",Both:"Sell & Book Both"})[row.offerType]}</small>}
                      </Link>
                    </td>
                    <td>{row.vendor}</td>
                    <td>{row.category}</td>
                    <td>{money(row.price)}</td>
                    <td>{row.location || "Not provided"}</td>
                    <td>{date(row.submittedAt)}</td>
                    <td>
                      {row.documents} documents · Vendor{" "}
                      {row.verificationStatus}
                    </td>
                    <td>
                      {row.status === "Pending"
                        ? "Pending Approval"
                        : "Admin Review"}
                    </td>
                    <td>
                      <div className="sa-actions flex gap-[10px] items-center flex-wrap [&_input]:min-w-[220px] [&_input]:p-[10px] [&_input]:[border-top-width:1px] [&_input]:[border-top-style:solid] [&_input]:[border-top-color:#dce2dd] [&_input]:[border-right-width:1px] [&_input]:[border-right-style:solid] [&_input]:[border-right-color:#dce2dd] [&_input]:[border-bottom-width:1px] [&_input]:[border-bottom-style:solid] [&_input]:[border-bottom-color:#dce2dd] [&_input]:[border-left-width:1px] [&_input]:[border-left-style:solid] [&_input]:[border-left-color:#dce2dd] [&_input]:rounded-[8px]">
                        <Link to={`/admin/services/${row.id}/review`}>
                          View
                        </Link>
                        <button
                          className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                          onClick={() =>
                            setDialog({ service: row, action: "approve" })
                          }
                        >
                          Approve
                        </button>
                        <button
                          className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                          onClick={() =>
                            setDialog({ service: row, action: "reject" })
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.rows.length && <p>No services awaiting review.</p>}
          <footer className="sa-actions flex gap-[10px] items-center flex-wrap [&_input]:min-w-[220px] [&_input]:p-[10px] [&_input]:[border-top-width:1px] [&_input]:[border-top-style:solid] [&_input]:[border-top-color:#dce2dd] [&_input]:[border-right-width:1px] [&_input]:[border-right-style:solid] [&_input]:[border-right-color:#dce2dd] [&_input]:[border-bottom-width:1px] [&_input]:[border-bottom-style:solid] [&_input]:[border-bottom-color:#dce2dd] [&_input]:[border-left-width:1px] [&_input]:[border-left-style:solid] [&_input]:[border-left-color:#dce2dd] [&_input]:rounded-[8px]">
            <button
              className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} · {data.total} pending
            </span>
            <button
              className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
              disabled={page * data.pageSize >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </footer>
        </section>
      )}
      {data && review && (
        <>
          <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
            <h2>{data.ServiceName}</h2>
            <p>
              {data.BusinessName} · {data.CategoryName} ·{" "}
              {money(data.BasePrice)}
            </p>
            <p>
              Status:{" "}
              {data.ApprovalStatus === "Pending"
                ? "Pending Approval"
                : data.ApprovalStatus === "UnderReview"
                  ? "Admin Review"
                  : data.ApprovalStatus}{" "}
              · {data.IsActive ? "Active" : "Inactive"}
            </p>
            <div className="sa-actions flex gap-[10px] items-center flex-wrap [&_input]:min-w-[220px] [&_input]:p-[10px] [&_input]:[border-top-width:1px] [&_input]:[border-top-style:solid] [&_input]:[border-top-color:#dce2dd] [&_input]:[border-right-width:1px] [&_input]:[border-right-style:solid] [&_input]:[border-right-color:#dce2dd] [&_input]:[border-bottom-width:1px] [&_input]:[border-bottom-style:solid] [&_input]:[border-bottom-color:#dce2dd] [&_input]:[border-left-width:1px] [&_input]:[border-left-style:solid] [&_input]:[border-left-color:#dce2dd] [&_input]:rounded-[8px]">
              {data.ApprovalStatus === "Pending" && (
                <button
                  className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                  disabled={busy}
                  onClick={startReview}
                >
                  {busy ? "Starting…" : "Start Admin Review"}
                </button>
              )}
              {["Pending", "UnderReview"].includes(data.ApprovalStatus) && (
                <>
                  <button
                    className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                    disabled={busy}
                    onClick={() => setDialog({ service: s, action: "approve" })}
                  >
                    Approve Service
                  </button>
                  <button
                    className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                    disabled={busy}
                    onClick={() => setDialog({ service: s, action: "reject" })}
                  >
                    Reject Service
                  </button>
                </>
              )}
              {data.ApprovalStatus === "Approved" && (
                <>
                  <button
                    className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                    onClick={() => setDialog({ service: s, action: "suspend" })}
                  >
                    Suspend Service
                  </button>
                  <button
                    className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
                    onClick={() =>
                      setDialog({
                        service: s,
                        action: data.IsActive ? "deactivate" : "activate",
                      })
                    }
                  >
                    {data.IsActive ? "Deactivate" : "Activate"} Service
                  </button>
                </>
              )}
            </div>
            {actionError && <p role="alert">{actionError}</p>}
          </section>
          <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
            <h2>Service Information</h2>
            <Fields
              value={{
                name: data.ServiceName,
                description: data.Description,
                shortDescription: data.document.shortDescription,
                attributes: data.attributes,
                submittedAt: data.SubmittedAt,
                approvalCycle: data.ApprovalCycle,
                approvedAt: data.ApprovedAt,
                approvedBy: data.ApprovedBy,
                rejectedAt: data.RejectedAt,
                rejectedBy: data.RejectedBy,
                rejectionReason: data.RejectionReason,
                adminNote: data.AdminNote,
              }}
            />
          </section>
          <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
            <h2>Vendor Information</h2>
            <Link to={`/admin/vendors/${data.VendorId}`}>
              {data.BusinessName}
            </Link>
            <p>
              {data.VerificationStatus} ·{" "}
              {data.VendorActive ? "Active" : "Inactive"}
            </p>
            <Fields value={data.vendor} />
            <h3>Documents / Verification</h3>
            {data.documents.map((d) => (
              <p key={d.id}>
                <Link to={`/admin/vendors/${data.VendorId}`}>
                  {d.DocumentType}
                </Link>{" "}
                · {d.VerificationStatus}
              </p>
            ))}
          </section>
          {[
            [
              "Pricing",
              { ...data.document.pricing, calculatedPrice: data.BasePrice },
            ],
            ["Service Items", data.items],
            [
              "Packages",
              data.packages.map((p) => ({
                ...p,
                details: JSON.parse(p.DetailsJson || "{}"),
              })),
            ],
            ["Location", data.document.location],
            [
              "Availability",
              {
                schedule: data.document.availability,
                dates: data.availability,
              },
            ],
            ["Product Service Options", data.document.offer],
            ["Policies", data.document.policies],
          ].map(([title, value]) => (
            <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]" key={title}>
              <h2>{title}</h2>
              <Fields value={value} />
            </section>
          ))}
          <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
            <h2>Images</h2>
            <div className="sa-images grid grid-cols-[repeat(auto-fit,_minmax(180px,_1fr))] gap-[14px] [&_img]:w-full [&_img]:h-[200px] [&_img]:object-cover [&_img]:rounded-[10px]">
              {data.images.map((img) => (
                <a key={img.id} href={img.url} target="_blank" rel="noreferrer">
                  <img src={img.url} alt={data.ServiceName} loading="lazy" />
                </a>
              ))}
            </div>
            {!data.images.length && <p>No images provided.</p>}
          </section>
          <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
            <h2>Previous Approval History</h2>
            <ApprovalTimeline rows={data.history} />
          </section>
        </>
      )}
      {dialog && (
        <DecisionDialog
          {...dialog}
          close={() => setDialog(null)}
          saved={saved}
        />
      )}
    </div>
  );
}
