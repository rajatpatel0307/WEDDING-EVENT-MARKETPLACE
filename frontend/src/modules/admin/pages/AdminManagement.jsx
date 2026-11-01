import CommissionConfiguration from "../components/CommissionConfiguration";
import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ShieldCheck, Save, LoaderCircle } from "lucide-react";
import { resourceTitle, adminNavigation, paymentNavigation } from "../navigation";
import PaymentTabs from "../components/PaymentTabs";
import FinanceCards from "../components/FinanceCards";
import { adminRequest } from "../api";
import { useAuth } from "../../../context/AuthContext";
import AdminTable, { ErrorState, Skeleton } from "../components/AdminTable";
function Settings() {
  const { notify } = useAuth(),
    [values, setValues] = useState(null),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    adminRequest("/settings", { signal: abort.signal })
      .then(setValues)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e);
      });
    return () => abort.abort();
  }, [revision]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = Object.fromEntries(new FormData(e.currentTarget));
      const result = await adminRequest("/settings", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setValues(body);
      notify(result.message);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ad-panel ad-settings [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden] max-w-[760px] [&_>_.ad-form]:[padding:6px_24px_26px] [&_.ad-panel-heading]:p-[24px] [&_.ad-panel-heading_>_svg]:text-[#8bab8a]">
      <div className="ad-panel-heading flex items-center justify-between gap-[15px] [padding:21px_22px_17px] [@media(width<=767px)]:[padding:18px_16px] [@media(767px<width<=1200px)]:[padding:17px_16px] [&_p]:text-[10px] [@media(width<=1200px)]:[&_p]:text-[9px] [&_p]:mt-[4px] [@media(width<=767px)]:[&_h2]:text-[14px] [@media(767px<width<=1200px)]:[&_h2]:text-[13px] [@media(width<=767px)]:flex-wrap">
        <div>
          <h2>General settings</h2>
          <p>Manage your platform’s identity and contact details.</p>
        </div>
        <ShieldCheck size={21} />
      </div>
      {error && (
        <ErrorState
          error={error}
          retry={() => {
            setError(null);
            setRevision((v) => v + 1);
          }}
        />
      )}
      {!values && !error ? (
        <Skeleton />
      ) : (
        values && (
          <form className="ad-form flex flex-col gap-[17px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[11px] [&_label]:text-[#7c8e76] [&_input]:w-full [&_input]:text-[12px]! [&_textarea]:w-full [&_textarea]:text-[12px]! [&_select]:w-full [&_select]:text-[12px]! [&_textarea]:min-h-[90px] [&_textarea]:[resize:vertical] [&_p]:text-[12px] [&_p]:text-[#86977d] [&_p]:leading-[1.7]" onSubmit={submit}>
            <label>
              Platform name
              <input
                name="platformName"
                defaultValue={values.platformName || "MarryNest"}
                required
                maxLength={100}
              />
            </label>
            <label>
              Support email
              <input
                name="supportEmail"
                type="email"
                defaultValue={values.supportEmail || ""}
                placeholder="Your published support address"
                required
                maxLength={320}
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                Reporting timezone
                <input name="timezone" value="Asia/Kolkata" readOnly />
              </label>
              <label>
                Reporting currency
                <input name="currency" value="INR" readOnly />
              </label>
            </div>
            <p className="ad-hint text-[10px]! mt-[15px] text-[#98a38e]!">
              All settings changes are saved to the audit log. Payment gateway
              credentials and database configuration are managed securely on the
              server.
            </p>
            <button
              className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
              disabled={busy}
              type="submit"
            >
              {busy ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}{" "}
              Save settings
            </button>
          </form>
        )
      )}
    </section>
  );
}
export default function AdminManagement() {
  const { resource } = useParams(),
    [params] = useSearchParams();
  const [financeRevision, setFinanceRevision] = useState(0);
  const valid = adminNavigation
    .flatMap((g) => g.items)
    .some((i) => i[0] === resource) || paymentNavigation.some(([path]) => path === resource);
  return (
    <>
      <div className="ad-page-heading flex items-center [@media(width<=1000px)]:items-start justify-between gap-[20px] [@media(width<=767px)]:gap-[14px] [@media(width<=767px)]:flex-col [@media(width<=767px)]:[&_p]:text-[11px]">
        <div>
          <div className="ad-eyebrow text-[8px] [@media(width<=767px)]:text-[7px] tracking-[1.7px] text-[#7d9183] flex items-center gap-[6px] [&_>_span]:w-[5px] [&_>_span]:h-[5px] [&_>_span]:[background:#bfa471] [&_>_span]:rounded-[50%]">MARKETPLACE MANAGEMENT</div>
          <h1>{resourceTitle(resource)}</h1>
          <p>
            {resource === "applications"
              ? "Review applications and welcome trusted professionals to your marketplace."
              : resource === "settings"
                ? "A considered foundation for your marketplace."
                : "A clear view of your marketplace. Search, review, and manage every detail."}
          </p>
        </div>
        <span className="ad-workspace-tag flex items-center gap-[6px] [background:#eef4ef] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dde8df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dde8df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dde8df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dde8df] rounded-[30px] text-[10px] [@media(width<=767px)]:text-[9px] [padding:6px_10px] text-[#72927f]">
          <ShieldCheck size={14} /> Admin workspace
        </span>
      </div>
      {["refunds", "payouts", "commission"].includes(resource) && <FinanceCards key={resource} section={resource} revision={financeRevision} />}
      {paymentNavigation.some(([path]) => path === resource) && <PaymentTabs />}
      {resource === "commission" && <CommissionConfiguration />}
      {!valid ? (
        <div className="ad-panel ad-empty [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden] [padding:42px_20px] flex items-center justify-center flex-col gap-[8px] text-center text-[#a5b19b] min-h-[160px] [&_strong]:text-[12px] [&_strong]:font-[500] [&_strong]:text-[#7d8d72] [&_p]:text-[10px] [&_p]:max-w-[320px]">
          This admin page is not available.
        </div>
      ) : resource === "settings" ? (
        <Settings />
      ) : (
        <AdminTable
          key={resource}
          resource={resource}
          initialStatus={params.get("status") || ""}
          initialQuery={params.get("q") || ""}
          onChange={() => setFinanceRevision((value) => value + 1)}
        />
      )}
    </>
  );
}
