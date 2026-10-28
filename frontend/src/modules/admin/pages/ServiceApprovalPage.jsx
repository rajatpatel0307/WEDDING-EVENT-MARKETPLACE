import ApprovalTimeline from "../../../components/common/ApprovalTimeline";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminRequest, money, date } from "../api";
import DecisionDialog from "../components/ServiceDecisionDialog";
import { useAuth } from "../../../context/AuthContext";
import "../service-approval.css";

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
      <dl className="sa-fields">
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
    <div className="sa-page">
      <header className="sa-heading">
        <div>
          <p className="sa-eyebrow">SERVICE APPROVAL</p>
          <h1>{review ? "Review service" : "Pending service approvals"}</h1>
          <p>
            {review
              ? "Inspect the complete listing before making a decision."
              : "Vendor approval and service approval are reviewed separately."}
          </p>
        </div>
        <Link
          className="ad-button"
          to={review ? "/admin/services/pending" : "/admin/services"}
        >
          {review ? "Back to queue" : "All services"}
        </Link>
      </header>
      {notice && (
        <p role="status" className="sa-success">
          {notice}
        </p>
      )}
      {!review && (
        <form
          className="sa-actions"
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
          <button className="ad-button">Search</button>
        </form>
      )}
      {state.loading && (
        <section className="ad-panel" role="status">
          Loading services…
        </section>
      )}
      {state.error && (
        <section className="ad-panel" role="alert">
          <p>{state.error.message}</p>
          <button className="ad-button" onClick={refresh}>
            Try again
          </button>
        </section>
      )}
      {data && !review && (
        <section className="ad-panel">
          <h2>
            Awaiting decision <span className="sa-count">{data.total}</span>
          </h2>
          <div className="sa-table">
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
                        {row.name}
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
                      <div className="sa-actions">
                        <Link to={`/admin/services/${row.id}/review`}>
                          View
                        </Link>
                        <button
                          className="ad-button"
                          onClick={() =>
                            setDialog({ service: row, action: "approve" })
                          }
                        >
                          Approve
                        </button>
                        <button
                          className="ad-button"
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
          <footer className="sa-actions">
            <button
              className="ad-button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} · {data.total} pending
            </span>
            <button
              className="ad-button"
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
          <section className="ad-panel">
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
            <div className="sa-actions">
              {data.ApprovalStatus === "Pending" && (
                <button
                  className="ad-button"
                  disabled={busy}
                  onClick={startReview}
                >
                  {busy ? "Starting…" : "Start Admin Review"}
                </button>
              )}
              {["Pending", "UnderReview"].includes(data.ApprovalStatus) && (
                <>
                  <button
                    className="ad-button ad-primary"
                    disabled={busy}
                    onClick={() => setDialog({ service: s, action: "approve" })}
                  >
                    Approve Service
                  </button>
                  <button
                    className="ad-button"
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
                    className="ad-button"
                    onClick={() => setDialog({ service: s, action: "suspend" })}
                  >
                    Suspend Service
                  </button>
                  <button
                    className="ad-button"
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
          <section className="ad-panel">
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
          <section className="ad-panel">
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
            ["Policies", data.document.policies],
          ].map(([title, value]) => (
            <section className="ad-panel" key={title}>
              <h2>{title}</h2>
              <Fields value={value} />
            </section>
          ))}
          <section className="ad-panel">
            <h2>Images</h2>
            <div className="sa-images">
              {data.images.map((img) => (
                <a key={img.id} href={img.url} target="_blank" rel="noreferrer">
                  <img src={img.url} alt={data.ServiceName} loading="lazy" />
                </a>
              ))}
            </div>
            {!data.images.length && <p>No images provided.</p>}
          </section>
          <section className="ad-panel">
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
