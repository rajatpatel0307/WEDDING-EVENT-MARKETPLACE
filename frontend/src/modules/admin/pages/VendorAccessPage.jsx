import { useEffect, useState } from "react";
import { adminRequest, date } from "../api";
import { Badge } from "../components/AdminTable";
import AdminDialog from "../components/AdminDialog";

const statuses = ["Pending", "Approved", "Rejected", "Suspended"];
const timestamp = (value) =>
  new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
const button =
  "rounded-md border border-[#dfe7d8] bg-white px-3 py-2 text-xs text-[#386348] disabled:opacity-40 disabled:cursor-not-allowed";
export default function VendorAccessPage() {
  const [filters, setFilters] = useState({
    q: "",
    service: "",
    booking: "",
    category: "",
  });
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [dialog, setDialog] = useState(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [dialogError, setDialogError] = useState("");
  const [notice, setNotice] = useState(""),
    [history, setHistory] = useState(null),
    [historyPage, setHistoryPage] = useState(1),
    [historyData, setHistoryData] = useState(null),
    [historyError, setHistoryError] = useState("");
  const params = new URLSearchParams(
    Object.entries({ ...filters, page, pageSize: 20 }).filter(
      ([, value]) => value !== "",
    ),
  ).toString();
  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      adminRequest(`/vendor-access?${params}`, { signal: abort.signal })
        .then((result) => {
          setData(result);
          setError("");
          setPage((p) =>
            Math.min(p, Math.max(1, Math.ceil(result.total / 20))),
          );
        })
        .catch((e) => {
          if (!abort.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [params, revision]);
  useEffect(() => {
    if (!history) return;
    const abort = new AbortController();
    adminRequest(`/vendor-access/${history.id}/history?page=${historyPage}`, {
      signal: abort.signal,
    })
      .then(setHistoryData)
      .catch((e) => {
        if (!abort.signal.aborted) setHistoryError(e.message);
      });
    return () => abort.abort();
  }, [history, historyPage]);
  function resetHistoryPage(nextPage) {
    setHistoryData(null);
    setHistoryError("");
    setHistoryPage(nextPage);
  }
  function change(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }
  function open(row, type, action) {
    setDialog({ row, type, action });
    setReason("");
    setDialogError("");
  }
  async function decide(event) {
    event.preventDefault();
    setBusy(true);
    setDialogError("");
    try {
      const result = await adminRequest(
        `/vendor-access/${dialog.row.id}/${dialog.type}/${dialog.action}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            expectedStatus: dialog.row[`${dialog.type}Status`],
            reason,
          }),
        },
      );
      setData((old) => ({
        ...old,
        rows: old.rows.map((row) =>
          row.id === result.vendor.id ? result.vendor : row,
        ),
      }));
      setNotice(result.message);
      setDialog(null);
      setRevision((r) => r + 1);
    } catch (e) {
      setDialogError(e.message);
      if (e.status === 409) setRevision((r) => r + 1);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-5 text-[#354a43]">
      <div>
        <h1 className="text-2xl font-semibold">Vendor Access Control</h1>
        <p className="mt-2 text-sm text-[#738567]">
          Manage service and booking permissions independently. Existing
          bookings remain available.
        </p>
      </div>
      {notice && (
        <p role="status" className="rounded-lg bg-[#edf6ee] p-3 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          <button className={button} onClick={() => setRevision((r) => r + 1)}>
            Retry
          </button>
        </p>
      )}
      <div className="flex flex-wrap gap-3 rounded-xl border border-[#dfe7d8] bg-white p-4">
        <input
          aria-label="Search vendors"
          className={button}
          placeholder="Name, business, email or phone"
          value={filters.q}
          onChange={(e) => change("q", e.target.value)}
        />
        {["service", "booking"].map((type) => (
          <label key={type} className="text-xs">
            {type === "service" ? "Service access" : "Booking access"}
            <select
              aria-label={`${type} access filter`}
              className={`${button} ml-2`}
              value={filters[type]}
              onChange={(e) => change(type, e.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        ))}
        <select
          aria-label="Vendor category"
          className={button}
          value={filters.category}
          onChange={(e) => change("category", e.target.value)}
        >
          <option value="">All categories</option>
          {data?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className={button}
          disabled={loading}
          onClick={() => setRevision((r) => r + 1)}
        >
          Refresh
        </button>
      </div>
      <div
        className="overflow-x-auto rounded-xl border border-[#dfe7d8] bg-white"
        aria-busy={loading}
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f4f7f1]">
            <tr>
              {[
                "Vendor Name",
                "Business Name",
                "Email",
                "Phone Number",
                "Vendor Category",
                "Service Access Status",
                "Booking Access Status",
                "Registration Date",
                "Actions",
              ].map((h) => (
                <th key={h} className="whitespace-nowrap p-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading &&
              data?.rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-[#edf1e8] align-top"
                >
                  <td className="p-3">{row.name}</td>
                  <td className="p-3">{row.businessName}</td>
                  <td className="p-3">{row.email}</td>
                  <td className="p-3">{row.phone || "—"}</td>
                  <td className="p-3">{row.category || "—"}</td>
                  <td className="p-3">
                    <Badge>{row.serviceStatus}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge>{row.bookingStatus}</Badge>
                  </td>
                  <td className="whitespace-nowrap p-3">
                    {date(row.registeredAt)}
                  </td>
                  <td className="min-w-72 p-3">
                    <div className="flex flex-col gap-3">
                      {["service", "booking"].map((type) => (
                        <div key={type} className="flex flex-wrap gap-1">
                          {[
                            ["approve", "Approved"],
                            ["reject", "Rejected"],
                            ["suspend", "Suspended"],
                          ]
                            .filter(
                              ([, status]) => row[`${type}Status`] !== status,
                            )
                            .map(([action]) => (
                              <button
                                key={action}
                                className={button}
                                onClick={() => open(row, type, action)}
                              >
                                {action[0].toUpperCase() + action.slice(1)}{" "}
                                {type === "service" ? "Service" : "Booking"}
                                {action === "suspend" ? " Access" : ""}
                              </button>
                            ))}
                        </div>
                      ))}
                      <button
                        className={button}
                        onClick={() => {
                          setHistory(row);
                          resetHistoryPage(1);
                        }}
                      >
                        Access history
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {loading && (
          <p className="p-5" role="status">
            Loading vendor access…
          </p>
        )}
        {!loading && !data?.rows.length && (
          <p className="p-5">No vendors match these filters.</p>
        )}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span>
          {data?.total || 0} vendors · Page {page}
        </span>
        <div className="flex gap-2">
          <button
            className={button}
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <button
            className={button}
            disabled={loading || !data || page * 20 >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
      {dialog && (
        <AdminDialog
          title={`${dialog.action[0].toUpperCase() + dialog.action.slice(1)} ${dialog.type} access`}
          busy={busy}
          close={() => setDialog(null)}
        >
          <form onSubmit={decide} className="flex flex-col gap-4">
            <p>
              Confirm this change for {dialog.row.businessName}. The other
              permission and existing bookings will be preserved.
            </p>
            <label className="flex flex-col gap-2">
              Reason {dialog.action === "approve" ? "(optional)" : "(required)"}
              <textarea
                rows={4}
                maxLength={1000}
                required={dialog.action !== "approve"}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {dialogError && <div role="alert">{dialogError}</div>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                className={button}
                disabled={
                  busy || (dialog.action !== "approve" && !reason.trim())
                }
              >
                {busy ? "Saving…" : "Confirm"}
              </button>
            </div>
          </form>
        </AdminDialog>
      )}
      {history && (
        <AdminDialog
          title={`Access history · ${history.businessName}`}
          close={() => setHistory(null)}
        >
          {historyError && <p role="alert">{historyError}</p>}
          {!historyData && !historyError && (
            <p role="status">Loading history…</p>
          )}
          {historyData?.rows.map((row) => (
            <div
              key={row.id}
              className="mb-4 border-b border-[#edf1e8] pb-3 text-xs"
            >
              <strong>
                {row.accessType}: {row.previousStatus} → {row.newStatus}
              </strong>
              <p>{row.reason || "No reason supplied"}</p>
              <p>
                Administrator: {row.actionBy}
                <br />
                {timestamp(row.createdAt)}
              </p>
            </div>
          ))}
          {historyData?.total === 0 && <p>No access changes recorded.</p>}
          <div className="flex justify-end gap-2">
            <button
              className={button}
              disabled={historyPage <= 1 || !historyData}
              onClick={() => resetHistoryPage(historyPage - 1)}
            >
              Previous
            </button>
            <button
              className={button}
              disabled={
                !historyData ||
                historyPage * historyData.pageSize >= historyData.total
              }
              onClick={() => resetHistoryPage(historyPage + 1)}
            >
              Next
            </button>
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
