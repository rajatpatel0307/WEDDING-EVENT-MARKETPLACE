import CommissionConfiguration from "../components/CommissionConfiguration";
import LocationManagement from "./LocationManagement";
import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Building2, Globe2, IndianRupee, LockKeyhole, Mail, ScrollText, ShieldCheck, SlidersHorizontal, Save, LoaderCircle } from "lucide-react";
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
    <section className="w-full max-w-[1100px] min-w-0 overflow-hidden rounded-[18px] border border-[#dfe8df] bg-white shadow-[0_8px_30px_#24483d06]" aria-labelledby="general-settings-heading">
      <header className="flex items-center gap-[14px] border-b border-[#e7eee3] bg-linear-to-r from-[#f5f8f1] to-white px-[26px] py-[22px] max-[600px]:px-[20px]">
        <span className="grid size-[44px] shrink-0 place-items-center rounded-[12px] border border-[#dfe8d8] bg-white text-[#63835b] shadow-[0_2px_6px_#24483d04]" aria-hidden="true"><SlidersHorizontal size={21} strokeWidth={1.6} /></span>
        <div>
          <h2 className="m-0! text-[18px]! font-semibold tracking-[-0.3px] text-[#304b39]" id="general-settings-heading">General settings</h2>
          <p className="mt-[4px] mb-0 text-[12px]! leading-[1.7] text-[#657a68]!">Fine-tune your marketplace identity and reporting preferences.</p>
        </div>
      </header>
      {error && <div className="px-[24px] pt-[20px] max-[600px]:px-[20px]"><ErrorState error={error} retry={() => { setError(null); setRevision(v => v + 1); }} /></div>}
      {!values && !error ? <Skeleton /> : values && <SettingsForm values={values} busy={busy} onSubmit={submit} />}
    </section>
  );
}

export function SettingsForm({ values, busy = false, onSubmit }) {
  return (
    <form onSubmit={onSubmit} aria-busy={busy}>
      <fieldset disabled={busy} className="m-0 grid min-w-0 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-[30px] border-0 p-[26px] disabled:opacity-70 max-[1000px]:grid-cols-1 max-[1000px]:gap-[24px] max-[600px]:p-[20px]">
        <legend className="sr-only">Platform settings</legend>
        <section className="min-w-0" aria-labelledby="marketplace-identity-heading">
          <div className="mb-[20px] flex items-start gap-[10px]">
            <Building2 className="mt-[2px] shrink-0 text-[#739267]" size={18} strokeWidth={1.7} aria-hidden="true" />
            <div><h3 className="m-0 text-[14px] font-semibold text-[#35503c]" id="marketplace-identity-heading">Marketplace identity</h3><p className="mt-[4px] mb-0 text-[11px]! leading-[1.7] text-[#6d806c]!">The name and contact details your marketplace uses.</p></div>
          </div>
          <label className="mb-[20px] block text-[12px] font-medium text-[#3f5b45]">
            <span className="mb-[8px] block">Platform name</span>
            <input className="min-h-[44px] w-full! rounded-[9px]! border-[#dce6dc]! bg-white px-[13px]! py-[10px]! text-[13px]! placeholder:text-[#80917d] focus:border-[#83ad9e]!" name="platformName" defaultValue={values.platformName || "MarryNest"} required minLength={2} maxLength={100} autoComplete="organization" />
          </label>
          <label className="block text-[12px] font-medium text-[#3f5b45]">
            <span className="mb-[8px] flex items-center gap-[6px]"><Mail size={13} strokeWidth={1.6} aria-hidden="true" />Support email</span>
            <input className="min-h-[44px] w-full! rounded-[9px]! border-[#dce6dc]! bg-white px-[13px]! py-[10px]! text-[13px]! placeholder:text-[#80917d] focus:border-[#83ad9e]!" name="supportEmail" type="email" defaultValue={values.supportEmail || ""} placeholder="support@example.com" required maxLength={320} autoComplete="email" aria-describedby="support-email-hint" />
          </label>
          <p className="mt-[8px] mb-0 text-[11px]! leading-[1.7] text-[#72816d]!" id="support-email-hint">Use an inbox your support team can access.</p>
        </section>
        <section className="min-w-0 rounded-[14px] border border-[#e6ecdf] bg-[#f8faf5] p-[20px]" aria-labelledby="reporting-preferences-heading">
          <div className="mb-[18px] flex items-start gap-[10px]">
            <Globe2 className="mt-[2px] shrink-0 text-[#739267]" size={18} strokeWidth={1.7} aria-hidden="true" />
            <div><h3 className="m-0 text-[14px] font-semibold text-[#35503c]" id="reporting-preferences-heading">Reporting preferences</h3><p className="mt-[4px] mb-0 text-[11px]! leading-[1.7] text-[#6d806c]!">Consistent dates and amounts across reports.</p></div>
          </div>
          <div className="grid grid-cols-2 gap-[12px] max-[600px]:grid-cols-1">
            <label className="block min-w-0 text-[11px] font-medium text-[#57704f]">
              <span className="mb-[8px] flex items-center gap-[6px]"><Globe2 size={13} aria-hidden="true" />Reporting timezone</span>
              <input className="min-h-[44px] w-full! rounded-[9px]! border-[#dfe7d8]! bg-white! px-[11px]! py-[10px]! text-[12px]! text-[#4e694a]!" name="timezone" value="Asia/Kolkata" readOnly aria-describedby="reporting-defaults-hint" />
            </label>
            <label className="block min-w-0 text-[11px] font-medium text-[#57704f]">
              <span className="mb-[8px] flex items-center gap-[6px]"><IndianRupee size={13} aria-hidden="true" />Reporting currency</span>
              <input className="min-h-[44px] w-full! rounded-[9px]! border-[#dfe7d8]! bg-white! px-[11px]! py-[10px]! text-[12px]! text-[#4e694a]!" name="currency" value="INR" readOnly aria-describedby="reporting-defaults-hint" />
            </label>
          </div>
          <p className="mt-[16px] mb-0 flex items-start gap-[7px] text-[11px]! leading-[1.7] text-[#667d5e]!" id="reporting-defaults-hint"><LockKeyhole className="mt-[3px] shrink-0" size={12} aria-hidden="true" />These values are fixed for this workspace.</p>
        </section>
      </fieldset>
      <div className="mx-[26px] mb-[24px] flex items-start gap-[9px] rounded-[10px] border border-[#e8ecdf] bg-[#fafbf7] px-[14px] py-[12px] max-[600px]:mx-[20px] max-[600px]:mb-[20px]">
        <ShieldCheck className="mt-[2px] shrink-0 text-[#779269]" size={16} strokeWidth={1.6} aria-hidden="true" />
        <p className="m-0 text-[11px]! leading-[1.7] text-[#65765e]!">Payment gateway credentials and database configuration are managed securely on the server.</p>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-[16px] border-t border-[#e7ede2] bg-[#fcfdfa] px-[26px] py-[17px] max-[600px]:px-[20px]">
        <span className="inline-flex items-center gap-[8px] text-[11px] text-[#667b62]"><ScrollText size={15} strokeWidth={1.6} aria-hidden="true" />Changes are recorded in the audit log.</span>
        <button className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-[8px] rounded-[9px] border border-[#176b60] bg-[#176b60] px-[20px] py-[10px] text-[12px] font-semibold text-white shadow-[0_3px_8px_#176b6012] transition-colors hover:bg-[#11594f] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#88ad91] disabled:cursor-wait disabled:opacity-60 max-[480px]:w-full" disabled={busy} type="submit">
          {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          {busy ? "Saving settings..." : "Save settings"}
        </button>
      </footer>
    </form>
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
                ? "Manage your marketplace identity, contact details and reporting preferences."
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
      ) : resource === "locations" ? (
        <LocationManagement />
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
