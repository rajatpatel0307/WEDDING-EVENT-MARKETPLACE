import { useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Download, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useAdminData } from "../services-management.api";
import { adminRequest, saveBlob, date } from "../api";
import AdminTable, {
  Skeleton,
  ErrorState,
  Badge,
} from "../components/AdminTable";
import AdminDialog from "../components/AdminDialog";
import { useAuth } from "../../../context/AuthContext";
const money = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(v || 0),
  );
export default function PaymentManagementPage({ section = "overview" }) {
  const [version, setVersion] = useState(0),
    [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [query, setQuery] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [decision, setDecision] = useState(null),
    { notify } = useAuth();
  const params = new URLSearchParams({
    page,
    status,
    q: query,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });
  const path =
    section === "refunds"
      ? "/refund-requests"
      : section === "reconciliation"
        ? "/payment-reconciliation"
        : "/payment-overview";
  const state = useAdminData(`${path}?${params}`, version);
  async function action(path, body = {}) {
    setBusy(true);
    setError("");
    try {
      const r = await adminRequest(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      notify(r.message);
      setVersion((v) => v + 1);
      setDecision(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="ad-page-heading">
        <div>
          <div className="ad-eyebrow">FINANCE</div>
          <h1>
            <CreditCard size={25} /> Payment management
          </h1>
          <p>
            Verified collections, refund review and settlement reconciliation.
          </p>
        </div>
        <button
          className="ad-button"
          disabled={busy}
          onClick={() => setVersion((v) => v + 1)}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <nav
        className="flex flex-wrap gap-3 mb-5"
        aria-label="Payment management"
      >
        {[
          ["payment-overview", "Overview"],
          ["payments", "Transactions"],
          ["refund-requests", "Refund review"],
          ["refunds", "Refund transactions"],
          ["payouts", "Payouts"],
          ["commission", "Commission"],
          ["payment-reconciliation", "Reconciliation"],
        ].map(([path, label]) => (
          <Link key={path} className="ad-button" to={`/admin/${path}`}>
            {label}
          </Link>
        ))}
      </nav>
      {["overview", "transactions"].includes(section) && (
        <div className="ad-panel flex flex-wrap gap-4 items-end mb-5">
          <label>
            From
            <input
              aria-label="Report from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Through
            <input
              aria-label="Report through"
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            className="ad-button"
            onClick={async () => {
              try {
                saveBlob(
                  await adminRequest(`/payment-reports/export?${params}`, {
                    download: true,
                  }),
                  "payments-latest-10000.csv",
                );
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            <Download size={16} /> Export latest 10,000 transactions
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="ad-inline-error">
          {error}
        </p>
      )}
      {section === "transactions" ? (
        <AdminTable resource="payments" />
      ) : state.loading ? (
        <Skeleton />
      ) : state.error ? (
        <ErrorState error={state.error} retry={state.retry} />
      ) : section === "overview" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            {[
              ["captured", "Captured collections"],
              ["pending", "Pending payment orders"],
              ["failed", "Failed attempts"],
              ["refunded", "Completed refunds"],
              ["refundPending", "Refunds in processing"],
              ["commission", "Recorded platform commission"],
              ["payables", "Vendor payables"],
              ["paid", "Completed payouts"],
              ["failedPayouts", "Failed payouts"],
            ].map(([key, label]) => (
              <article className="ad-panel" key={key}>
                <p>{label}</p>
                <strong className="text-2xl">
                  {["pending", "failed", "failedPayouts"].includes(key)
                    ? state.data.totals[key]
                    : money(state.data.totals[key])}
                </strong>
              </article>
            ))}
          </div>
          <section className="ad-panel">
            <h2>Monthly payments, refunds, payouts and commission</h2>
            {state.data.monthly.length ? (
              <div style={{ height: 280, width: "100%" }}>
                <ResponsiveContainer>
                  <BarChart data={state.data.monthly}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={money} />
                    <Bar
                      dataKey="captured"
                      fill="#955365"
                      radius={[5, 5, 0, 0]}
                    />
                    <Bar dataKey="refunds" fill="#c67e55" />
                    <Bar dataKey="payouts" fill="#527a70" />
                    <Bar dataKey="commission" fill="#9b8bba" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p>No captured payments in this period.</p>
            )}
            <p>{state.data.commissionPolicy}</p>
          </section>
          <section className="ad-panel">
            <h2>Successful and failed attempts</h2>
            <div style={{ height: 220, width: "100%" }}>
              <ResponsiveContainer>
                <BarChart
                  data={[
                    {
                      status: "Captured",
                      count: Number(state.data.totals.successful),
                    },
                    {
                      status: "Failed",
                      count: Number(state.data.totals.failed),
                    },
                  ]}
                >
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#527a70" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="ad-panel">
            <h2>Payment methods</h2>
            {state.data.methods.length > 0 && (
              <div style={{ height: 240, width: "100%" }}>
                <ResponsiveContainer>
                  <BarChart data={state.data.methods}>
                    <XAxis dataKey="method" />
                    <YAxis />
                    <Tooltip formatter={money} />
                    <Bar dataKey="amount" fill="#955365" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {state.data.methods.map((m) => (
              <p key={m.method}>
                {m.method}: {money(m.amount)}
              </p>
            ))}
            {!state.data.methods.length && <p>No recorded payment methods.</p>}
          </section>
        </>
      ) : section === "refunds" ? (
        <section className="ad-panel">
          <label>
            Review status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {["", "Requested", "Approved", "Rejected"].map((s) => (
                <option key={s} value={s}>
                  {s || "All requests"}
                </option>
              ))}
            </select>
          </label>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Booking / vendor</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {state.data.rows.map((r) => (
                  <tr key={r.RequestId}>
                    <td>
                      <Link to={`/admin/bookings/${r.BookingId}`}>
                        {r.BookingNumber}
                      </Link>
                      <br />
                      {r.BusinessName}
                    </td>
                    <td>
                      {money(r.Amount)}
                      <br />
                      {date(r.CreatedAt)}
                    </td>
                    <td>
                      <Badge>{r.Status}</Badge>
                    </td>
                    <td>
                      {r.Reason}
                      <br />
                      {r.DecisionReason}
                    </td>
                    <td>
                      {r.Status === "Requested" &&
                        ["approve", "reject"].map((a) => (
                          <button
                            className="ad-button"
                            key={a}
                            disabled={busy}
                            onClick={() =>
                              setDecision({
                                id: r.RequestId,
                                action: a,
                                amount: r.Amount,
                              })
                            }
                          >
                            {a === "approve" ? "Approve" : "Reject"}
                          </button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!state.data.rows.length && <p>No refund requests.</p>}
          </div>
          <Pagination page={page} total={state.data.total} setPage={setPage} />
        </section>
      ) : (
        <>
          <section className="ad-panel">
            <h2>Provider payment orders</h2>
            <label>
              Search booking or provider reference
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Provider reference</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Last checked</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.orders.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link to={`/admin/bookings/${r.bookingId}`}>
                          {r.booking}
                        </Link>
                      </td>
                      <td>{r.reference}</td>
                      <td>{money(r.amount)}</td>
                      <td>
                        <Badge>{r.status}</Badge>
                      </td>
                      <td>{date(r.checkedAt)}</td>
                      <td>
                        <button
                          className="ad-button"
                          disabled={busy}
                          onClick={() =>
                            action(`/payment-orders/${r.id}/refresh`)
                          }
                        >
                          Verify with provider
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!state.data.orders.length && <p>No payment orders.</p>}
            </div>
            <Pagination
              page={page}
              total={state.data.total}
              setPage={setPage}
            />
          </section>
          <section className="ad-panel">
            <h2>Webhook processing and review</h2>
            {state.data.events.map((e) => (
              <div className="flex flex-wrap gap-3 py-3" key={e.id}>
                <span>
                  {e.type} · {e.id} · {e.status} · Attempts {e.attempts}
                  <br />
                  {e.error}
                </span>
                <button
                  className="ad-button"
                  disabled={busy}
                  onClick={() => action(`/payment-events/${e.id}/retry`)}
                >
                  Queue retry
                </button>
              </div>
            ))}
            {!state.data.events.length && (
              <p>No webhook events awaiting processing.</p>
            )}
          </section>
          <section className="ad-panel">
            <h2>Balance discrepancies</h2>
            {state.data.discrepancies.map((d) => (
              <p key={d.id}>
                <Link to={`/admin/bookings/${d.id}`}>{d.booking}</Link>:
                recorded {money(d.recorded)} · captured {money(d.captured)}
              </p>
            ))}
            {!state.data.discrepancies.length && (
              <p>Recorded booking balances match captured payments.</p>
            )}
          </section>
        </>
      )}
      {decision && (
        <AdminDialog
          title={`${decision.action === "approve" ? "Approve" : "Reject"} refund ${money(decision.amount)}`}
          busy={busy}
          close={() => setDecision(null)}
        >
          <form
            className="ad-form"
            onSubmit={(e) => {
              e.preventDefault();
              action(`/refund-requests/${decision.id}/decision`, {
                action: decision.action,
                reason: new FormData(e.currentTarget).get("reason"),
              });
            }}
          >
            <p>
              Review the booking policy and original payment first. Approval
              reserves the requested amount and queues provider processing.
            </p>
            <label>
              Decision reason
              <textarea name="reason" required minLength={3} maxLength={1000} />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="ad-button ad-primary" disabled={busy}>
              Confirm decision
            </button>
          </form>
        </AdminDialog>
      )}
    </>
  );
}
function Pagination({ page, total, setPage }) {
  return (
    <div className="flex gap-3 py-4">
      <button
        className="ad-button"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} · {total} records
      </span>
      <button
        className="ad-button"
        disabled={page * 20 >= total}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
