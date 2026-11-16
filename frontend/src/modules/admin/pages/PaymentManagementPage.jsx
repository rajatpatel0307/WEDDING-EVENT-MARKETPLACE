import { useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, RefreshCw } from "lucide-react";
import { useAdminData } from "../services-management.api";
import { adminRequest, date } from "../api";
import AdminTable, {
  Skeleton,
  ErrorState,
  Badge,
} from "../components/AdminTable";
import AdminDialog from "../components/AdminDialog";
import PaymentTabs from "../components/PaymentTabs";
import FinanceCards from "../components/FinanceCards";
import PaymentOverview from "../components/PaymentOverview";
import { useAuth } from "../../../context/AuthContext";
const money = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(v || 0),
  );
export default function PaymentManagementPage({ section = "overview" }) {
  const [version, setVersion] = useState(0),
    [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [decision, setDecision] = useState(null),
    { notify } = useAuth();
  const params = new URLSearchParams({
    page,
    status,
    q: query,
  });
  const path =
    section === "refunds"
      ? "/refund-requests"
      : section === "reconciliation"
        ? "/payment-reconciliation"
        : "/payment-overview";
  const state = useAdminData(section === "transactions" ? null : `${path}?${params}`, version);
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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 text-[10px] font-medium tracking-widest text-[#829487] uppercase">Finance workspace</div>
          <h1 className="m-0! flex items-center gap-2.5 text-[26px]! leading-tight! font-semibold! tracking-tight! sm:text-[30px]!">
            <CreditCard size={24} strokeWidth={1.7} className="shrink-0 text-[#176b60]" aria-hidden="true" />{section === "overview" ? "Payment overview" : "Payment management"}
          </h1>
          <p className="mt-2 text-xs! leading-relaxed text-[#75867d]! sm:text-sm!">
            {section === "overview" ? "Collections, refunds and vendor settlements in one place." : "Verified collections, refund review and settlement reconciliation."}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-[#dce6e1] bg-white px-3.5 py-2 text-xs font-medium text-[#45645a] shadow-sm transition-colors hover:border-[#a7c3b7] hover:bg-[#f1f7f4] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#176b60] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          disabled={busy || Boolean(state.loading)}
          onClick={() => setVersion((v) => v + 1)}
        >
          <RefreshCw size={16} className={state.loading ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />{state.loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {section === "overview" && <PaymentTabs />}
      {section !== "transactions" && <>
        <FinanceCards section={section === "refunds" ? "refund-review" : section} revision={version} overviewState={state} />
        {section !== "overview" && <PaymentTabs />}
      </>}
      {error && (
        <p role="alert" className="ad-inline-error [background:#fff1ed] text-[#af6158] p-[12px] rounded-[7px] text-[12px] [margin:12px_0]">
          {error}
        </p>
      )}
      {section === "transactions" ? (
        <AdminTable resource="payments" version={version} beforeTable={<PaymentTabs />} />
      ) : state.loading ? (
        <Skeleton />
      ) : state.error ? (
        <ErrorState error={state.error} retry={state.retry} />
      ) : section === "overview" ? (
        <PaymentOverview data={state.data} />
      ) : section === "refunds" ? (
        <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
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
          <div className="ad-table-wrap w-full min-w-0">
            <table className="ad-table w-full border-collapse [table-layout:fixed] text-[10px] [@media(width<=1200px)]:text-[9px] text-left [&_th]:[background:#fafbf8] [&_th]:text-[#94a08f] [&_th]:tracking-[0.3px] [&_th]:text-[9px] [&_th]:font-[500] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#eaf0e6] [&_th]:[padding:12px_17px] [@media(width<=1200px)]:[&_th]:[padding:12px_10px] [&_th]:[overflow-wrap:anywhere] [&_th_button]:flex [&_th_button]:items-center [&_th_button]:gap-[4px] [&_th_button]:max-w-full [&_th_button]:text-left [&_th_button]:[border-top-width:0] [&_th_button]:[border-top-style:none] [&_th_button]:[border-top-color:currentColor] [&_th_button]:[border-right-width:0] [&_th_button]:[border-right-style:none] [&_th_button]:[border-right-color:currentColor] [&_th_button]:[border-bottom-width:0] [&_th_button]:[border-bottom-style:none] [&_th_button]:[border-bottom-color:currentColor] [&_th_button]:[border-left-width:0] [&_th_button]:[border-left-style:none] [&_th_button]:[border-left-color:currentColor] [&_th_button]:[background:none] [&_th_button]:text-[inherit] [&_th_button]:p-[0] [&_td]:[padding:15px_17px] [@media(width<=767px)]:[&_td]:p-[0] [@media(767px<width<=1200px)]:[&_td]:[padding:12px_10px] [&_td]:[border-bottom-width:1px] [@media(width<=767px)]:[&_td]:[border-bottom-width:0] [&_td]:[border-bottom-style:solid] [@media(width<=767px)]:[&_td]:[border-bottom-style:none] [&_td]:[border-bottom-color:#f0f3ec] [@media(width<=767px)]:[&_td]:[border-bottom-color:currentColor] [&_td]:text-[#758570] [&_td]:[overflow-wrap:anywhere] [&_td]:[vertical-align:middle] [&_tbody_tr:last-child_td]:[border-bottom-width:0] [&_tbody_tr:last-child_td]:[border-bottom-style:none] [&_tbody_tr:last-child_td]:[border-bottom-color:currentColor] [&_tbody_tr:hover]:[background:#fcfdf9] [@media(width<=767px)]:[&_thead]:hidden [@media(width<=767px)]:block [@media(width<=767px)]:[&_tbody]:block [@media(width<=767px)]:[&_tbody]:w-full [@media(width<=767px)]:[&_tr]:block [@media(width<=767px)]:[&_tr]:w-full [@media(width<=767px)]:[&_td]:block [@media(width<=767px)]:[&_td]:w-full [@media(width<=767px)]:[&_tbody_tr]:[padding:13px_16px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-width:1px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-style:solid] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-color:#e9eee4] [@media(width<=767px)]:[&_tbody_tr]:grid [@media(width<=767px)]:[&_tbody_tr]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:[&_tbody_tr]:gap-[11px_17px] [@media(width<=767px)]:[&_td]:[border-top-width:0] [@media(width<=767px)]:[&_td]:[border-top-style:none] [@media(width<=767px)]:[&_td]:[border-top-color:currentColor] [@media(width<=767px)]:[&_td]:[border-right-width:0] [@media(width<=767px)]:[&_td]:[border-right-style:none] [@media(width<=767px)]:[&_td]:[border-right-color:currentColor] [@media(width<=767px)]:[&_td]:[border-left-width:0] [@media(width<=767px)]:[&_td]:[border-left-style:none] [@media(width<=767px)]:[&_td]:[border-left-color:currentColor] [@media(width<=767px)]:[&_td]:text-[10px] [@media(width<=767px)]:[&_td]:min-w-0 [@media(width<=767px)]:[&_td:before]:[content:attr(data-label)] [@media(width<=767px)]:[&_td:before]:block [@media(width<=767px)]:[&_td:before]:text-[8px] [@media(width<=767px)]:[&_td:before]:text-[#a1ad96] [@media(width<=767px)]:[&_td:before]:mb-[4px] [@media(width<=767px)]:[&_td:first-child]:col-[1/-1] [@media(width<=767px)]:[&_td:last-child_.ad-row-actions]:ml-[-5px]">
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
                            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
          <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
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
            <div className="ad-table-wrap w-full min-w-0">
              <table className="ad-table w-full border-collapse [table-layout:fixed] text-[10px] [@media(width<=1200px)]:text-[9px] text-left [&_th]:[background:#fafbf8] [&_th]:text-[#94a08f] [&_th]:tracking-[0.3px] [&_th]:text-[9px] [&_th]:font-[500] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#eaf0e6] [&_th]:[padding:12px_17px] [@media(width<=1200px)]:[&_th]:[padding:12px_10px] [&_th]:[overflow-wrap:anywhere] [&_th_button]:flex [&_th_button]:items-center [&_th_button]:gap-[4px] [&_th_button]:max-w-full [&_th_button]:text-left [&_th_button]:[border-top-width:0] [&_th_button]:[border-top-style:none] [&_th_button]:[border-top-color:currentColor] [&_th_button]:[border-right-width:0] [&_th_button]:[border-right-style:none] [&_th_button]:[border-right-color:currentColor] [&_th_button]:[border-bottom-width:0] [&_th_button]:[border-bottom-style:none] [&_th_button]:[border-bottom-color:currentColor] [&_th_button]:[border-left-width:0] [&_th_button]:[border-left-style:none] [&_th_button]:[border-left-color:currentColor] [&_th_button]:[background:none] [&_th_button]:text-[inherit] [&_th_button]:p-[0] [&_td]:[padding:15px_17px] [@media(width<=767px)]:[&_td]:p-[0] [@media(767px<width<=1200px)]:[&_td]:[padding:12px_10px] [&_td]:[border-bottom-width:1px] [@media(width<=767px)]:[&_td]:[border-bottom-width:0] [&_td]:[border-bottom-style:solid] [@media(width<=767px)]:[&_td]:[border-bottom-style:none] [&_td]:[border-bottom-color:#f0f3ec] [@media(width<=767px)]:[&_td]:[border-bottom-color:currentColor] [&_td]:text-[#758570] [&_td]:[overflow-wrap:anywhere] [&_td]:[vertical-align:middle] [&_tbody_tr:last-child_td]:[border-bottom-width:0] [&_tbody_tr:last-child_td]:[border-bottom-style:none] [&_tbody_tr:last-child_td]:[border-bottom-color:currentColor] [&_tbody_tr:hover]:[background:#fcfdf9] [@media(width<=767px)]:[&_thead]:hidden [@media(width<=767px)]:block [@media(width<=767px)]:[&_tbody]:block [@media(width<=767px)]:[&_tbody]:w-full [@media(width<=767px)]:[&_tr]:block [@media(width<=767px)]:[&_tr]:w-full [@media(width<=767px)]:[&_td]:block [@media(width<=767px)]:[&_td]:w-full [@media(width<=767px)]:[&_tbody_tr]:[padding:13px_16px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-width:1px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-style:solid] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-color:#e9eee4] [@media(width<=767px)]:[&_tbody_tr]:grid [@media(width<=767px)]:[&_tbody_tr]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:[&_tbody_tr]:gap-[11px_17px] [@media(width<=767px)]:[&_td]:[border-top-width:0] [@media(width<=767px)]:[&_td]:[border-top-style:none] [@media(width<=767px)]:[&_td]:[border-top-color:currentColor] [@media(width<=767px)]:[&_td]:[border-right-width:0] [@media(width<=767px)]:[&_td]:[border-right-style:none] [@media(width<=767px)]:[&_td]:[border-right-color:currentColor] [@media(width<=767px)]:[&_td]:[border-left-width:0] [@media(width<=767px)]:[&_td]:[border-left-style:none] [@media(width<=767px)]:[&_td]:[border-left-color:currentColor] [@media(width<=767px)]:[&_td]:text-[10px] [@media(width<=767px)]:[&_td]:min-w-0 [@media(width<=767px)]:[&_td:before]:[content:attr(data-label)] [@media(width<=767px)]:[&_td:before]:block [@media(width<=767px)]:[&_td:before]:text-[8px] [@media(width<=767px)]:[&_td:before]:text-[#a1ad96] [@media(width<=767px)]:[&_td:before]:mb-[4px] [@media(width<=767px)]:[&_td:first-child]:col-[1/-1] [@media(width<=767px)]:[&_td:last-child_.ad-row-actions]:ml-[-5px]">
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
                          className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
          <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
            <h2>Webhook processing and review</h2>
            {state.data.events.map((e) => (
              <div className="flex flex-wrap gap-3 py-3" key={e.id}>
                <span>
                  {e.type} · {e.id} · {e.status} · Attempts {e.attempts}
                  <br />
                  {e.error}
                </span>
                <button
                  className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
          <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
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
            className="ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]"
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
            <button className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" disabled={busy}>
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
        className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} · {total} records
      </span>
      <button
        className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
        disabled={page * 20 >= total}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
