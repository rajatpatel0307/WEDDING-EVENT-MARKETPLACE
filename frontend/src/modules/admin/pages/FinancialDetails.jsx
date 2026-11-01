import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminRequest, date } from "../api";
import { useAdminData } from "../services-management.api";
import { Skeleton, ErrorState, Badge } from "../components/AdminTable";
import AdminDialog from "../components/AdminDialog";
import { useAuth } from "../../../context/AuthContext";

const label = (key) =>
  key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (s) => s.toUpperCase());
const format = (key, value, currency = "INR") => {
  if (value == null || value === "") return "—";
  if (/(At|Date|Until)$/.test(key)) return date(value);
  if (
    /(Amount|Total|PlatformCommission|TaxDeduction|RefundDeduction|ApplicableFees)$/i.test(
      key,
    )
  )
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(Number(value));
  if (/Rate$/.test(key)) return `${value}%`;
  return String(value);
};
function Rows({ rows, currency = "INR" }) {
  if (!rows?.length) return <p className="ad-hint text-[10px]! mt-[15px] text-[#98a38e]!">No related records.</p>;
  const columns = Object.keys(rows[0]);
  return (
    <div className="ad-table-wrap w-full min-w-0">
      <table className="ad-table w-full border-collapse [table-layout:fixed] text-[10px] [@media(width<=1200px)]:text-[9px] text-left [&_th]:[background:#fafbf8] [&_th]:text-[#94a08f] [&_th]:tracking-[0.3px] [&_th]:text-[9px] [&_th]:font-[500] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#eaf0e6] [&_th]:[padding:12px_17px] [@media(width<=1200px)]:[&_th]:[padding:12px_10px] [&_th]:[overflow-wrap:anywhere] [&_th_button]:flex [&_th_button]:items-center [&_th_button]:gap-[4px] [&_th_button]:max-w-full [&_th_button]:text-left [&_th_button]:[border-top-width:0] [&_th_button]:[border-top-style:none] [&_th_button]:[border-top-color:currentColor] [&_th_button]:[border-right-width:0] [&_th_button]:[border-right-style:none] [&_th_button]:[border-right-color:currentColor] [&_th_button]:[border-bottom-width:0] [&_th_button]:[border-bottom-style:none] [&_th_button]:[border-bottom-color:currentColor] [&_th_button]:[border-left-width:0] [&_th_button]:[border-left-style:none] [&_th_button]:[border-left-color:currentColor] [&_th_button]:[background:none] [&_th_button]:text-[inherit] [&_th_button]:p-[0] [&_td]:[padding:15px_17px] [@media(width<=767px)]:[&_td]:p-[0] [@media(767px<width<=1200px)]:[&_td]:[padding:12px_10px] [&_td]:[border-bottom-width:1px] [@media(width<=767px)]:[&_td]:[border-bottom-width:0] [&_td]:[border-bottom-style:solid] [@media(width<=767px)]:[&_td]:[border-bottom-style:none] [&_td]:[border-bottom-color:#f0f3ec] [@media(width<=767px)]:[&_td]:[border-bottom-color:currentColor] [&_td]:text-[#758570] [&_td]:[overflow-wrap:anywhere] [&_td]:[vertical-align:middle] [&_tbody_tr:last-child_td]:[border-bottom-width:0] [&_tbody_tr:last-child_td]:[border-bottom-style:none] [&_tbody_tr:last-child_td]:[border-bottom-color:currentColor] [&_tbody_tr:hover]:[background:#fcfdf9] [@media(width<=767px)]:[&_thead]:hidden [@media(width<=767px)]:block [@media(width<=767px)]:[&_tbody]:block [@media(width<=767px)]:[&_tbody]:w-full [@media(width<=767px)]:[&_tr]:block [@media(width<=767px)]:[&_tr]:w-full [@media(width<=767px)]:[&_td]:block [@media(width<=767px)]:[&_td]:w-full [@media(width<=767px)]:[&_tbody_tr]:[padding:13px_16px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-width:1px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-style:solid] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-color:#e9eee4] [@media(width<=767px)]:[&_tbody_tr]:grid [@media(width<=767px)]:[&_tbody_tr]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:[&_tbody_tr]:gap-[11px_17px] [@media(width<=767px)]:[&_td]:[border-top-width:0] [@media(width<=767px)]:[&_td]:[border-top-style:none] [@media(width<=767px)]:[&_td]:[border-top-color:currentColor] [@media(width<=767px)]:[&_td]:[border-right-width:0] [@media(width<=767px)]:[&_td]:[border-right-style:none] [@media(width<=767px)]:[&_td]:[border-right-color:currentColor] [@media(width<=767px)]:[&_td]:[border-left-width:0] [@media(width<=767px)]:[&_td]:[border-left-style:none] [@media(width<=767px)]:[&_td]:[border-left-color:currentColor] [@media(width<=767px)]:[&_td]:text-[10px] [@media(width<=767px)]:[&_td]:min-w-0 [@media(width<=767px)]:[&_td:before]:[content:attr(data-label)] [@media(width<=767px)]:[&_td:before]:block [@media(width<=767px)]:[&_td:before]:text-[8px] [@media(width<=767px)]:[&_td:before]:text-[#a1ad96] [@media(width<=767px)]:[&_td:before]:mb-[4px] [@media(width<=767px)]:[&_td:first-child]:col-[1/-1] [@media(width<=767px)]:[&_td:last-child_.ad-row-actions]:ml-[-5px]">
        <thead>
          <tr>
            {columns.map((key) => (
              <th key={key}>{label(key)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map((key) => (
                <td key={key} data-label={label(key)}>
                  {format(key, row[key], row.Currency || currency)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function FinancialDetails() {
  const { kind, id } = useParams();
  const [revision, setRevision] = useState(0),
    [decision, setDecision] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const state = useAdminData(`/finance/${kind}/${id}`, revision);
  const { notify } = useAuth();
  if (state.loading) return <Skeleton />;
  if (state.error)
    return <ErrorState error={state.error} retry={state.retry} />;
  const { record: row, rows, history, settlementMode } = state.data;
  const actions =
    kind === "payouts" && row.status !== "Paid"
      ? row.status === "Processing"
        ? settlementMode === "manual"
          ? [
              ["confirm-paid", "Record confirmed external settlement"],
              ["record-failure", "Record externally confirmed failure"],
            ]
          : []
        : [
            ["approve", "Approve payout"],
            ["hold", "Place on hold"],
            ["reject", "Reject payout"],
            ...(row.ReviewStatus === "Approved" && settlementMode === "manual"
              ? [["start-settlement", "Reserve for external settlement"]]
              : []),
          ]
      : [];
  return (
    <>
      <Link className="ad-text-link flex items-center gap-[5px] text-[#5a8671] text-[10px] whitespace-nowrap" to={`/admin/${kind}`}>
        Back to {kind}
      </Link>
      <div className="ad-page-heading flex items-center [@media(width<=1000px)]:items-start justify-between gap-[20px] [@media(width<=767px)]:gap-[14px] [@media(width<=767px)]:flex-col [@media(width<=767px)]:[&_p]:text-[11px]">
        <div>
          <h1>{row.name}</h1>
          <p>
            {kind === "quotations"
              ? "Agreed amounts are preserved. Administrative notes do not amend the quotation."
              : "Recorded financial information and audit history."}
          </p>
        </div>
        <Badge>{row.status || "Recorded"}</Badge>
      </div>
      <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
        <dl className="ad-details grid grid-cols-[1fr_1fr] gap-[18px] [@media(width<=767px)]:gap-[15px] [margin:0_0_22px] [&_>_div]:min-w-0 [&_dt]:text-[10px] [&_dt]:text-[#98a38e] [&_dt]:mb-[5px] [&_dd]:text-[12px] [&_dd]:m-[0] [&_dd]:[overflow-wrap:anywhere]">
          {Object.entries(row)
            .filter(([, value]) => !Array.isArray(value))
            .map(([key, value]) => (
              <div key={key}>
                <dt>{label(key)}</dt>
                <dd>{format(key, value, row.Currency || "INR")}</dd>
              </div>
            ))}
        </dl>
        <div className="ad-heading-actions flex gap-[8px] shrink-0 [&_select]:text-[10px] [@media(width<=1000px)]:flex-wrap [@media(width<=767px)]:justify-start [@media(767px<width<=1000px)]:justify-end">
          {row.BookingId && (
            <Link className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" to={`/admin/bookings/${row.BookingId}`}>
              View booking, refund eligibility & ledger
            </Link>
          )}
          {row.VendorId && (
            <Link className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" to={`/admin/vendors/${row.VendorId}`}>
              View vendor
            </Link>
          )}
          {row.PaymentId && (
            <Link
              className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
              to={`/admin/finance/payments/${row.PaymentId}`}
            >
              Original payment
            </Link>
          )}
          <button
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            onClick={() => {
              setError("");
              setDecision(["note", "Add internal note"]);
            }}
          >
            Add internal note
          </button>
          {actions.map(([action, title]) => (
            <button
              className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
              key={action}
              onClick={() => {
                setError("");
                setDecision([action, title, crypto.randomUUID()]);
              }}
            >
              {title}
            </button>
          ))}
        </div>
        {kind === "payouts" && (
          <p className="ad-hint text-[10px]! mt-[15px] text-[#98a38e]!">
            Net payable comes from the recorded ledger. Approval does not
            transfer money.{" "}
            {settlementMode === "manual"
              ? "Reserve funds before using your approved external settlement procedure; record payment only after confirming its external reference."
              : "External settlement recording is disabled until the server operator configures an approved procedure."}
          </p>
        )}
        {kind === "refunds" && (
          <p className="ad-hint text-[10px]! mt-[15px] text-[#98a38e]!">
            Use the booking's reviewed refund workflow. Completion is recorded
            only after gateway confirmation.
          </p>
        )}
      </section>
      <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
        <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
          <h2>
            {kind === "quotations" ? "Quotation items" : "Related transactions"}
          </h2>
        </div>
        <Rows rows={rows} currency={row.Currency || "INR"} />
        {row.bookings?.map((booking) => (
          <Link
            key={booking.id}
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            to={`/admin/bookings/${booking.id}`}
          >
            {booking.name} · {booking.status}
          </Link>
        ))}
        {row.refunds?.map((refund) => (
          <Link
            key={refund.id}
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            to={`/admin/finance/refunds/${refund.id}`}
          >
            {refund.name} ·{" "}
            {format("amount", refund.amount, row.Currency || "INR")} ·{" "}
            {refund.status}
          </Link>
        ))}
      </section>
      <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
        <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
          <h2>Administrative history</h2>
        </div>
        <Rows rows={history} />
      </section>
      {decision && (
        <AdminDialog
          title={decision[1]}
          busy={busy}
          close={() => setDecision(null)}
        >
          <form
            className="ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]"
            onSubmit={async (event) => {
              event.preventDefault();
              const values = Object.fromEntries(
                new FormData(event.currentTarget),
              );
              setBusy(true);
              setError("");
              try {
                const result = await adminRequest(
                  decision[0] === "note"
                    ? `/finance/${kind}/${id}/notes`
                    : `/payouts/${id}/decision`,
                  {
                    method: "POST",
                    body: JSON.stringify(
                      decision[0] === "note"
                        ? { note: values.note }
                        : {
                            action: decision[0],
                            expectedUpdatedAt: row.UpdatedAt,
                            note: values.note,
                            ...(decision[0] === "start-settlement"
                              ? {
                                  destination: values.destination,
                                  destinationVerified:
                                    values.destinationVerified === "on",
                                }
                              : {}),
                            ...(["confirm-paid", "record-failure"].includes(
                              decision[0],
                            )
                              ? {
                                  reference: values.reference,
                                  idempotencyKey: decision[2],
                                }
                              : {}),
                          },
                    ),
                  },
                );
                notify(result.message);
                setDecision(null);
                setRevision((value) => value + 1);
              } catch (failure) {
                setError(failure.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>This action will be recorded in the audit history.</p>
            {decision[0] === "start-settlement" && (
              <>
                <label>
                  Masked external destination reference
                  <input
                    name="destination"
                    required
                    minLength={6}
                    maxLength={150}
                    placeholder="Verified beneficiary — account ending 1234"
                  />
                </label>
                <label>
                  <input name="destinationVerified" type="checkbox" required />{" "}
                  I verified the external beneficiary belongs to this vendor and
                  is eligible for settlement.
                </label>
              </>
            )}
            <label>
              Reason / internal note
              <textarea name="note" required minLength={3} maxLength={2000} />
            </label>
            {["confirm-paid", "record-failure"].includes(decision[0]) && (
              <>
                <p>
                  Record only a verified external result. Successful settlements
                  must be confirmed as paid; failures must be confirmed before
                  releasing the reservation. This application will not initiate
                  a transfer.
                </p>
                <label>
                  External settlement reference
                  <input
                    name="reference"
                    required
                    minLength={6}
                    maxLength={150}
                  />
                </label>
              </>
            )}
            {error && (
              <p className="ad-inline-error [background:#fff1ed] text-[#af6158] p-[12px] rounded-[7px] text-[12px] [margin:12px_0]" role="alert">
                {error}
              </p>
            )}
            <button className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" disabled={busy}>
              {busy ? "Saving…" : "Confirm"}
            </button>
          </form>
        </AdminDialog>
      )}
    </>
  );
}
