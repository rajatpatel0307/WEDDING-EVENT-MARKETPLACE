import { useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import {
  useCustomerData,
  Loading,
  ErrorView,
  Heading,
  Badge,
  Field,
} from "../components/WorkspaceUI";
import { save, money, date } from "../services/workspace.api";
import { useAuth } from "../../../context/AuthContext";
export default function RefundRequest({ bookingId }) {
  const [version, setVersion] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [key, setKey] = useState(() => crypto.randomUUID());
  const state = useCustomerData(
      `/bookings/${bookingId}/refund-eligibility`,
      version,
    ),
    { notify } = useAuth();
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorView error={state.error} retry={state.retry} />;
  return (
    <section className="cw-panel cw-prose [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden pt-[25px] [@media(width<=520px)]:pt-[23px] pr-[28px] [@media(width<=520px)]:pr-[20px] pb-[25px] [@media(width<=520px)]:pb-[23px] pl-[28px] [@media(width<=520px)]:pl-[20px] mb-[24px] [&_>_h2]:mb-[20px] [&_>_h3]:mt-[24px] [&_p]:[white-space:pre-line]">
      <h2>
        <RotateCcw size={20} /> Refunds
      </h2>
      <Link to="/customer/refunds">View refund requests and progress</Link>
      <p>
        Refundable under the current booking policy: {money(state.data.amount)}
      </p>
      {!state.data.eligible ? (
        <p>{state.data.reason}</p>
      ) : (
        <form
          className="cw-form min-w-0 [&_fieldset]:[border-top-width:0] [&_fieldset]:[border-top-style:none] [&_fieldset]:[border-top-color:currentColor] [&_fieldset]:[border-right-width:0] [&_fieldset]:[border-right-style:none] [&_fieldset]:[border-right-color:currentColor] [&_fieldset]:[border-bottom-width:0] [&_fieldset]:[border-bottom-style:none] [&_fieldset]:[border-bottom-color:currentColor] [&_fieldset]:[border-left-width:0] [&_fieldset]:[border-left-style:none] [&_fieldset]:[border-left-color:currentColor] [&_fieldset]:pt-[0] [&_fieldset]:pr-[0] [&_fieldset]:pb-[0] [&_fieldset]:pl-[0] [&_fieldset]:mt-[0] [&_fieldset]:mr-[0] [&_fieldset]:mb-[0] [&_fieldset]:ml-[0] [&_fieldset]:min-w-0 [&_>_.cw-panel_+_.cw-panel]:mt-[22px]"
          onSubmit={async (event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            setBusy(true);
            setError("");
            try {
              const result = await save("/refund-requests", "POST", {
                bookingId,
                amount: Number(values.get("amount")),
                reason: values.get("reason"),
                idempotencyKey: key,
              });
              notify(result.message);
              setVersion((v) => v + 1);
              setKey(crypto.randomUUID());
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Requested refund (INR)">
            <input
              name="amount"
              type="number"
              min="0.01"
              max={state.data.amount}
              step="0.01"
              defaultValue={state.data.amount}
              required
            />
          </Field>
          <Field label="Reason">
            <textarea name="reason" minLength={3} maxLength={1000} required />
          </Field>
          <p>
            Requests require review. Approval queues a gateway refund;
            completion follows provider confirmation.
          </p>
          <button className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" disabled={busy}>
            {busy ? "Submitting…" : "Request refund"}
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
export function RefundHistory() {
  const [page, setPage] = useState(1),
    state = useCustomerData(`/refund-requests?page=${page}`);
  return (
    <>
      <Heading
        title="Refund requests"
        description="Track review decisions and verified gateway progress."
      />
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorView error={state.error} retry={state.retry} />
      ) : (
        <section className="cw-panel cw-table-wrap [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-auto overflow-y-hidden max-w-full">
          <table>
            <thead>
              <tr>
                <th>Booking</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Reason / decision</th>
                <th>Requested</th>
              </tr>
            </thead>
            <tbody>
              {state.data.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link to={`/customer/bookings/${row.bookingId}/checkout`}>
                      {row.booking}
                    </Link>
                  </td>
                  <td>{money(row.amount)}</td>
                  <td>
                    <Badge>{row.status}</Badge>
                  </td>
                  <td>
                    {row.reason}
                    <br />
                    {row.decisionReason}
                  </td>
                  <td>{date(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!state.data.rows.length && <p>No refund requests yet.</p>}
          <div className="cw-pagination flex items-center justify-center gap-[20px] mt-[25px] mr-[0] mb-[25px] ml-[0] text-[11px] text-[#a59187]">
            <button
              className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              disabled={page * 20 >= state.data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
          <button className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" onClick={state.retry}>
            Refresh status
          </button>
        </section>
      )}
    </>
  );
}
