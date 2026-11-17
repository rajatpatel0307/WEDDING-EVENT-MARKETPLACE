import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { Modal, Field } from "./WorkspaceUI";
import { LocationFields } from "./LocationFields";
import { save } from "../services/workspace.api";

export default function AddressForm({ address, close, done }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    { notify } = useAuth();
  return (
    <Modal
      title={address ? "Edit address" : "Add address"}
      busy={busy}
      close={close}
    >
      <form
        className="grid min-w-0 gap-4 p-5 sm:grid-cols-2 sm:p-6 [&_.cw-field]:text-xs [&_.cw-field]:text-slate-600 [&_input:not([type=checkbox])]:min-h-11 [&_input:not([type=checkbox])]:rounded-xl [&_select]:min-h-11 [&_select]:rounded-xl [&_input]:text-sm! [&_select]:text-sm! [&_>_p]:col-span-full"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setError("");
          const f = Object.fromEntries(new FormData(e.currentTarget));
          setBusy(true);
          try {
            const r = await save(
              `/addresses${address ? `/${address.id}` : ""}`,
              address ? "PUT" : "POST",
              { ...f, isDefault: f.isDefault === "on" },
            );
            notify(r.message);
            done();
            close();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Address type">
          <select name="type" defaultValue={address?.type || "Home"}>
            {["Home", "Work", "Billing", "Other"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        {["fullName", "phone"].map((k) => (
          <Field
            key={k}
            label={k === "fullName" ? "Contact name" : "Phone number"}
          >
            <input
              name={k}
              maxLength={k === "phone" ? 30 : 200}
              defaultValue={address?.[k] || ""}
            />
          </Field>
        ))}
        <LocationFields value={address || {}} />
        <label className="col-span-full flex items-center gap-2.5 text-xs font-medium text-slate-600 [&_input]:size-4 [&_input]:accent-[#873f52]">
          <input
            name="isDefault"
            type="checkbox"
            defaultChecked={address?.isDefault}
          />{" "}
          Set as default address
        </label>
        {error && (
          <p className="cw-form-error [background:#fff4ee] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f0ddcf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#f0ddcf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#f0ddcf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#f0ddcf] text-[#b6836e]! pt-[12px] pr-[15px] pb-[12px] pl-[15px] rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="col-span-full inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#873f52] bg-[#873f52] px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#723247] disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#873f52]">
          {busy ? "Saving…" : "Save address"}
        </button>
      </form>
    </Modal>
  );
}
