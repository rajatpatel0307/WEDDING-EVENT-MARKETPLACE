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
    <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
      <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
        <h2>Commission rules</h2>
        <button
          className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
        <div className="ad-table-wrap w-full min-w-0">
          <table className="ad-table w-full border-collapse [table-layout:fixed] text-[10px] [@media(width<=1200px)]:text-[9px] text-left [&_th]:[background:#fafbf8] [&_th]:text-[#94a08f] [&_th]:tracking-[0.3px] [&_th]:text-[9px] [&_th]:font-[500] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:#eaf0e6] [&_th]:[padding:12px_17px] [@media(width<=1200px)]:[&_th]:[padding:12px_10px] [&_th]:[overflow-wrap:anywhere] [&_th_button]:flex [&_th_button]:items-center [&_th_button]:gap-[4px] [&_th_button]:max-w-full [&_th_button]:text-left [&_th_button]:[border-top-width:0] [&_th_button]:[border-top-style:none] [&_th_button]:[border-top-color:currentColor] [&_th_button]:[border-right-width:0] [&_th_button]:[border-right-style:none] [&_th_button]:[border-right-color:currentColor] [&_th_button]:[border-bottom-width:0] [&_th_button]:[border-bottom-style:none] [&_th_button]:[border-bottom-color:currentColor] [&_th_button]:[border-left-width:0] [&_th_button]:[border-left-style:none] [&_th_button]:[border-left-color:currentColor] [&_th_button]:[background:none] [&_th_button]:text-[inherit] [&_th_button]:p-[0] [&_td]:[padding:15px_17px] [@media(width<=767px)]:[&_td]:p-[0] [@media(767px<width<=1200px)]:[&_td]:[padding:12px_10px] [&_td]:[border-bottom-width:1px] [@media(width<=767px)]:[&_td]:[border-bottom-width:0] [&_td]:[border-bottom-style:solid] [@media(width<=767px)]:[&_td]:[border-bottom-style:none] [&_td]:[border-bottom-color:#f0f3ec] [@media(width<=767px)]:[&_td]:[border-bottom-color:currentColor] [&_td]:text-[#758570] [&_td]:[overflow-wrap:anywhere] [&_td]:[vertical-align:middle] [&_tbody_tr:last-child_td]:[border-bottom-width:0] [&_tbody_tr:last-child_td]:[border-bottom-style:none] [&_tbody_tr:last-child_td]:[border-bottom-color:currentColor] [&_tbody_tr:hover]:[background:#fcfdf9] [@media(width<=767px)]:[&_thead]:hidden [@media(width<=767px)]:block [@media(width<=767px)]:[&_tbody]:block [@media(width<=767px)]:[&_tbody]:w-full [@media(width<=767px)]:[&_tr]:block [@media(width<=767px)]:[&_tr]:w-full [@media(width<=767px)]:[&_td]:block [@media(width<=767px)]:[&_td]:w-full [@media(width<=767px)]:[&_tbody_tr]:[padding:13px_16px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-width:1px] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-style:solid] [@media(width<=767px)]:[&_tbody_tr]:[border-bottom-color:#e9eee4] [@media(width<=767px)]:[&_tbody_tr]:grid [@media(width<=767px)]:[&_tbody_tr]:grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:[&_tbody_tr]:gap-[11px_17px] [@media(width<=767px)]:[&_td]:[border-top-width:0] [@media(width<=767px)]:[&_td]:[border-top-style:none] [@media(width<=767px)]:[&_td]:[border-top-color:currentColor] [@media(width<=767px)]:[&_td]:[border-right-width:0] [@media(width<=767px)]:[&_td]:[border-right-style:none] [@media(width<=767px)]:[&_td]:[border-right-color:currentColor] [@media(width<=767px)]:[&_td]:[border-left-width:0] [@media(width<=767px)]:[&_td]:[border-left-style:none] [@media(width<=767px)]:[&_td]:[border-left-color:currentColor] [@media(width<=767px)]:[&_td]:text-[10px] [@media(width<=767px)]:[&_td]:min-w-0 [@media(width<=767px)]:[&_td:before]:[content:attr(data-label)] [@media(width<=767px)]:[&_td:before]:block [@media(width<=767px)]:[&_td:before]:text-[8px] [@media(width<=767px)]:[&_td:before]:text-[#a1ad96] [@media(width<=767px)]:[&_td:before]:mb-[4px] [@media(width<=767px)]:[&_td:first-child]:col-[1/-1] [@media(width<=767px)]:[&_td:last-child_.ad-row-actions]:ml-[-5px]">
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
                        className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
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
            className="ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]"
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
            <button className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" disabled={busy}>
              Confirm
            </button>
          </form>
        </AdminDialog>
      )}
    </section>
  );
}
