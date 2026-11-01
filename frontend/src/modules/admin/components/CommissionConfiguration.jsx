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
      <section className="ad-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]">
        <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
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
            className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
            onClick={() => {
              setOpen(true);
              setError("");
            }}
          >
            Change default rate
          </button>
        </div>
        <p className="ad-hint text-[10px]! mt-[15px] text-[#98a38e]!">
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
                <p className="ad-inline-error [background:#fff1ed] text-[#af6158] p-[12px] rounded-[7px] text-[12px] [margin:12px_0]" role="alert">
                  {error}
                </p>
              )}
              <button className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" disabled={busy}>
                Confirm rate change
              </button>
            </form>
          </AdminDialog>
        )}
      </section>
    </>
  );
}
