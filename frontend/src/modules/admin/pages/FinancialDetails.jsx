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
  if (!rows?.length) return <p className="ad-hint">No related records.</p>;
  const columns = Object.keys(rows[0]);
  return (
    <div className="ad-table-wrap">
      <table className="ad-table">
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
      <Link className="ad-text-link" to={`/admin/${kind}`}>
        Back to {kind}
      </Link>
      <div className="ad-page-heading">
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
      <section className="ad-panel">
        <dl className="ad-details">
          {Object.entries(row)
            .filter(([, value]) => !Array.isArray(value))
            .map(([key, value]) => (
              <div key={key}>
                <dt>{label(key)}</dt>
                <dd>{format(key, value, row.Currency || "INR")}</dd>
              </div>
            ))}
        </dl>
        <div className="ad-heading-actions">
          {row.BookingId && (
            <Link className="ad-button" to={`/admin/bookings/${row.BookingId}`}>
              View booking, refund eligibility & ledger
            </Link>
          )}
          {row.VendorId && (
            <Link className="ad-button" to={`/admin/vendors/${row.VendorId}`}>
              View vendor
            </Link>
          )}
          {row.PaymentId && (
            <Link
              className="ad-button"
              to={`/admin/finance/payments/${row.PaymentId}`}
            >
              Original payment
            </Link>
          )}
          <button
            className="ad-button"
            onClick={() => {
              setError("");
              setDecision(["note", "Add internal note"]);
            }}
          >
            Add internal note
          </button>
          {actions.map(([action, title]) => (
            <button
              className="ad-button"
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
          <p className="ad-hint">
            Net payable comes from the recorded ledger. Approval does not
            transfer money.{" "}
            {settlementMode === "manual"
              ? "Reserve funds before using your approved external settlement procedure; record payment only after confirming its external reference."
              : "External settlement recording is disabled until the server operator configures an approved procedure."}
          </p>
        )}
        {kind === "refunds" && (
          <p className="ad-hint">
            Use the booking's reviewed refund workflow. Completion is recorded
            only after gateway confirmation.
          </p>
        )}
      </section>
      <section className="ad-panel">
        <div className="ad-panel-heading">
          <h2>
            {kind === "quotations" ? "Quotation items" : "Related transactions"}
          </h2>
        </div>
        <Rows rows={rows} currency={row.Currency || "INR"} />
        {row.bookings?.map((booking) => (
          <Link
            key={booking.id}
            className="ad-button"
            to={`/admin/bookings/${booking.id}`}
          >
            {booking.name} · {booking.status}
          </Link>
        ))}
        {row.refunds?.map((refund) => (
          <Link
            key={refund.id}
            className="ad-button"
            to={`/admin/finance/refunds/${refund.id}`}
          >
            {refund.name} ·{" "}
            {format("amount", refund.amount, row.Currency || "INR")} ·{" "}
            {refund.status}
          </Link>
        ))}
      </section>
      <section className="ad-panel">
        <div className="ad-panel-heading">
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
            className="ad-form"
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
              <p className="ad-inline-error" role="alert">
                {error}
              </p>
            )}
            <button className="ad-button ad-primary" disabled={busy}>
              {busy ? "Saving…" : "Confirm"}
            </button>
          </form>
        </AdminDialog>
      )}
    </>
  );
}
