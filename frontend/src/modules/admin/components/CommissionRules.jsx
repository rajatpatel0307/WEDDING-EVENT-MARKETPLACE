import { useState } from "react";
import { useAdminData } from "../services-management.api";
import { adminRequest, date, money } from "../api";
import { ErrorState, Skeleton } from "./AdminTable";
import AdminDialog from "./AdminDialog";
import RecordPicker from "./RecordPicker";
import { useAuth } from "../../../context/AuthContext";
export default function CommissionRules() {
  const [version, setVersion] = useState(0),
    [open, setOpen] = useState(false),
    [disable, setDisable] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const state = useAdminData("/commission/rules", version),
    { notify } = useAuth();
  async function submit(path, body) {
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      notify(result.message);
      setOpen(false);
      setDisable(null);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ad-panel">
      <div className="ad-panel-heading">
        <h2>Commission rules</h2>
        <button
          className="ad-button"
          onClick={() => {
            setOpen(true);
            setError("");
          }}
        >
          Create rule
        </button>
      </div>
      <p>
        Vendor rules take priority over category rules, then global rules.
        Priority resolves rules in the same scope. Category rules apply when all
        services belong to that category. Each booking or quotation preserves
        its applied rule.
      </p>
      {state.loading ? (
        <Skeleton />
      ) : state.error ? (
        <ErrorState error={state.error} retry={state.retry} />
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Rule / scope</th>
                <th>Calculation</th>
                <th>Effective period</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((r) => (
                <tr key={r.RuleId}>
                  <td>
                    {r.Name}
                    <br />
                    {r.BusinessName || r.CategoryName || "Global"}
                  </td>
                  <td>
                    {r.Type} · {r.Rate}% + {money(r.FixedAmount)}
                    <br />
                    {r.Base} · Priority {r.Priority}
                  </td>
                  <td>
                    {date(r.EffectiveFrom)} –{" "}
                    {r.EffectiveTo ? date(r.EffectiveTo) : "No end date"}
                  </td>
                  <td>
                    {r.IsActive ? (
                      <button
                        className="ad-button"
                        onClick={() => {
                          setDisable(r.RuleId);
                          setError("");
                        }}
                      >
                        Disable future use
                      </button>
                    ) : (
                      "Inactive"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!state.data.length && (
            <p>No override rules. The default percentage applies.</p>
          )}
        </div>
      )}
      {(open || disable) && (
        <AdminDialog
          title={disable ? "Disable commission rule" : "Create commission rule"}
          busy={busy}
          close={() => {
            setOpen(false);
            setDisable(null);
          }}
        >
          <form
            className="ad-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              if (disable) {
                submit(`/commission/rules/${disable}/disable`, {
                  reason: f.reason,
                });
                return;
              }
              submit("/commission/rules", {
                name: f.name,
                vendorId: f.vendorId || null,
                categoryId: f.categoryId ? Number(f.categoryId) : null,
                type: f.type,
                rate: Number(f.rate),
                fixedAmount: Number(f.fixedAmount),
                base: f.base,
                priority: Number(f.priority),
                effectiveFrom: new Date(f.effectiveFrom).toISOString(),
                effectiveTo: f.effectiveTo
                  ? new Date(f.effectiveTo).toISOString()
                  : null,
                reason: f.reason,
              });
            }}
          >
            {!disable && (
              <>
                <label>
                  Rule name
                  <input name="name" minLength={3} maxLength={150} required />
                </label>
                <label>
                  Vendor (optional)
                  <RecordPicker
                    resource="vendors"
                    name="vendorId"
                    required={false}
                  />
                </label>
                <label>
                  Category (optional)
                  <RecordPicker
                    resource="categories"
                    name="categoryId"
                    required={false}
                  />
                </label>
                <label>
                  Commission type
                  <select name="type">
                    <option>Percentage</option>
                    <option>Fixed</option>
                    <option>Combined</option>
                  </select>
                </label>
                <label>
                  Percentage
                  <input
                    name="rate"
                    type="number"
                    min={0}
                    max={100}
                    step="0.0001"
                    defaultValue={0}
                    required
                  />
                </label>
                <label>
                  Fixed fee (INR)
                  <input
                    name="fixedAmount"
                    type="number"
                    min={0}
                    max={100000000}
                    step="0.01"
                    defaultValue={0}
                    required
                  />
                </label>
                <label>
                  Calculation base
                  <select name="base">
                    <option value="BookingTotal">
                      Booking total including tax and platform fees
                    </option>
                    <option value="NetSubtotal">
                      Subtotal after discount, before tax and fees
                    </option>
                  </select>
                </label>
                <label>
                  Priority
                  <input
                    name="priority"
                    type="number"
                    min={0}
                    max={1000}
                    defaultValue={0}
                    required
                  />
                </label>
                <label>
                  Effective from (local time)
                  <input name="effectiveFrom" type="datetime-local" required />
                </label>
                <label>
                  Effective through (optional)
                  <input name="effectiveTo" type="datetime-local" />
                </label>
                <p>
                  For percentage rules, set fixed fee to zero. For fixed rules,
                  set percentage to zero. Commission is capped at the selected
                  calculation base.
                </p>
              </>
            )}
            <label>
              Reason
              <textarea name="reason" minLength={3} maxLength={1000} required />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="ad-button ad-primary" disabled={busy}>
              Confirm
            </button>
          </form>
        </AdminDialog>
      )}
    </section>
  );
}
