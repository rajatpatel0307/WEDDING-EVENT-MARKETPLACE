import { useState } from "react";
import { useAdminData } from "../services-management.api";
import { adminRequest, date } from "../api";
import { useAuth } from "../../../context/AuthContext";
import { ErrorState, Skeleton } from "./AdminTable";
import AdminDialog from "./AdminDialog";
import CommissionRules from "./CommissionRules";
export default function CommissionConfiguration() {
  const [revision, setRevision] = useState(0),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const state = useAdminData("/commission/configuration", revision),
    { notify } = useAuth();
  if (state.loading) return <Skeleton rows={2} />;
  if (state.error)
    return <ErrorState error={state.error} retry={state.retry} />;
  return (
    <>
      <CommissionRules />
      <section className="ad-panel">
        <div className="ad-panel-heading">
          <div>
            <h2>Default booking commission</h2>
            <p>
              {state.data.rate == null
                ? "Not configured"
                : `${state.data.rate}%`}{" "}
              · Applies to future booking policy snapshots.
            </p>
          </div>
          <button
            className="ad-button"
            onClick={() => {
              setOpen(true);
              setError("");
            }}
          >
            Change default rate
          </button>
        </div>
        <p className="ad-hint">
          Existing commission entries and booking snapshots retain their
          recorded rates. Effective vendor, category and global overrides are
          managed above.
        </p>
        <details>
          <summary>Configuration history</summary>
          {state.data.history.map((item, index) => (
            <p key={index}>
              {date(item.createdAt)} · {item.rate}% · {item.note}
            </p>
          ))}
        </details>
        {open && (
          <AdminDialog
            title="Change default commission"
            busy={busy}
            close={() => setOpen(false)}
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
                    "/commission/configuration",
                    {
                      method: "PUT",
                      body: JSON.stringify({
                        rate: Number(values.rate),
                        note: values.note,
                        expectedUpdatedAt: state.data.updatedAt,
                      }),
                    },
                  );
                  notify(result.message);
                  setOpen(false);
                  setRevision((v) => v + 1);
                } catch (failure) {
                  setError(failure.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p>
                Confirm the default commission for new snapshots. Recorded
                financial history will be preserved.
              </p>
              <label>
                Commission (%)
                <input
                  type="number"
                  name="rate"
                  min={0}
                  max={100}
                  step="0.0001"
                  defaultValue={state.data.rate ?? ""}
                  required
                />
              </label>
              <label>
                Reason
                <textarea name="note" minLength={3} maxLength={2000} required />
              </label>
              {error && (
                <p className="ad-inline-error" role="alert">
                  {error}
                </p>
              )}
              <button className="ad-button ad-primary" disabled={busy}>
                Confirm rate change
              </button>
            </form>
          </AdminDialog>
        )}
      </section>
    </>
  );
}
