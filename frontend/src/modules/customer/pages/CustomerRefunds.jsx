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
    <section className="cw-panel cw-prose">
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
          className="cw-form"
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
          <button className="cw-button cw-primary" disabled={busy}>
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
        <section className="cw-panel cw-table-wrap">
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
          <div className="cw-pagination">
            <button
              className="cw-button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              className="cw-button"
              disabled={page * 20 >= state.data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
          <button className="cw-button" onClick={state.retry}>
            Refresh status
          </button>
        </section>
      )}
    </>
  );
}
