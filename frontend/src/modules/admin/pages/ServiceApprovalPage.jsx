import ServiceReviewDetails, { ServiceReviewHeader } from "../components/ServiceReviewDetails";
import { ReviewStatusBadge } from "../components/ServiceReviewStatus";
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
          location: data.document?.location?.city,
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
    <div className={review ? "service-review-page grid min-w-0 gap-6 text-[13px] text-[#293e35] [&_:where(a,button,summary)]:[-webkit-tap-highlight-color:transparent] [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-[#a58952]! [&_:focus-visible]:outline-offset-4 [@media(width<=600px)]:gap-5 motion-reduce:[&_*]:transition-none! motion-reduce:[&_*::before]:transition-none!" : "sa-page grid gap-[22px] [&_.ad-panel]:p-[24px] [@media(width<=640px)]:[&_.ad-panel]:p-[16px] [&_h2]:text-[19px] [&_h2]:mb-[16px] [&_h3]:mt-[16px]"}>
      {review && <ServiceReviewHeader />}
      {!review && (
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
      )}
      {notice && (
        <p role="status" className={review ? "rounded-lg border border-[#d9e5cf] bg-[#edf4e8] px-[18px] py-[14px] text-[12px]! text-[#496c3d]!" : "sa-success [background:#e7f4ec] text-[#246140] p-[14px] rounded-[8px]"}>
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
                      <span className="mb-[6px] block text-[11px] text-[#839079]">{row.documents} documents</span>
                      <ReviewStatusBadge status={row.verificationStatus} entity="vendor" />
                    </td>
                    <td>
                      <ReviewStatusBadge status={row.status} />
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
        <ServiceReviewDetails
          key={data.ServiceId}
          data={data}
          service={s}
          busy={busy}
          startReview={startReview}
          setDialog={setDialog}
          actionError={actionError}
        />
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
