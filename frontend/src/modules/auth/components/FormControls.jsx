import { useState } from "react";
import { Eye, EyeOff, ArrowRight, LoaderCircle } from "lucide-react";
export function Field({ label, name, type = "text", hint, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field block mb-[18px] text-[11px] font-medium [color:#55494d] [&_>_span]:block [&_>_span]:mb-[7px] [&_input]:block [&_input]:w-full [&_input]:[border:1px_solid_#e8dfe0] [&_input]:bg-white [&_input]:rounded-[6px] [&_input]:min-h-[45px] [&_input]:[padding:11px_13px] [&_input]:[color:#453438] [&_input]:text-[12px] [&_input]:[transition:border_0.2s,_box-shadow_0.2s] [&_textarea]:block [&_textarea]:w-full [&_textarea]:[border:1px_solid_#e8dfe0] [&_textarea]:bg-white [&_textarea]:rounded-[6px] [&_textarea]:min-h-[45px] [&_textarea]:[padding:11px_13px] [&_textarea]:[color:#453438] [&_textarea]:text-[12px] [&_textarea]:[transition:border_0.2s,_box-shadow_0.2s] [&_textarea]:resize-y [&_select]:block [&_select]:w-full [&_select]:[border:1px_solid_#e8dfe0] [&_select]:bg-white [&_select]:rounded-[6px] [&_select]:min-h-[45px] [&_select]:[padding:11px_13px] [&_select]:[color:#453438] [&_select]:text-[12px] [&_select]:[transition:border_0.2s,_box-shadow_0.2s] [&_input::placeholder]:[color:#b3a6aa] [&_textarea::placeholder]:[color:#b3a6aa] [&_input:focus]:[border-color:#ad7b82] [&_input:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_input:focus]:[outline:none] [&_textarea:focus]:[border-color:#ad7b82] [&_textarea:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_textarea:focus]:[outline:none] [&_select:focus]:[border-color:#ad7b82] [&_select:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_select:focus]:[outline:none] [&_small]:block [&_small]:[color:#95868a] [&_small]:text-[10px] [&_small]:mt-[5px] [&_small]:font-normal">
      <span>{label}</span>
      <div className="input-wrap relative [&_input[type='password']]:pr-[43px]">
        <input
          name={name}
          type={type === "password" && visible ? "text" : type}
          {...props}
        />
        {type === "password" && (
          <button
            type="button"
            className="password-toggle absolute right-[12px] top-[50%] [transform:translateY(-50%)] border-0 bg-transparent [color:#a49298] flex [padding:2px]"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Submit({ busy, children = "Continue", ...props }) {
  return (
    <button className="primary-button [border:1px_solid_#8c414e] [background:#8c414e] text-white min-h-[46px] rounded-[6px] flex items-center justify-center gap-[12px] w-full text-[12px] font-medium [padding:12px_17px] [box-shadow:0_3px_5px_#8c414e0a] [&:hover:not(:disabled)]:[background:#783541] [&:hover:not(:disabled)]:[border-color:#783541] [&:hover:not(:disabled)]:[transform:translateY(-1px)] [&_svg:last-child]:ml-[6px]" disabled={busy} {...props}>
      {busy ? (
        <>
          <LoaderCircle className="spin animate-spin" size={18} /> Please wait…
        </>
      ) : (
        <>
          {children}
          <ArrowRight size={17} />
        </>
      )}
    </button>
  );
}
export function ErrorBox({ message }) {
  return message ? (
    <div className="error-box [padding:12px_14px] [border:1px_solid_#e8bac2] rounded-[6px] [background:#fff2f3] [color:#a1374a] text-[12px] mb-[20px] [overflow-wrap:anywhere]" role="alert">
      {message}
    </div>
  ) : null;
}
export const passwordProps = {
  minLength: 8,
  maxLength: 72,
  pattern: "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}",
  title:
    "Use at least 8 characters with uppercase, lowercase, a number and a special character",
  autoComplete: "new-password",
};
export function PasswordHint() {
  return (
    <p className="password-hint text-[10px] leading-[1.7] [margin:-7px_0_18px] [color:#9b878d]">
      Use 8–72 characters with uppercase and lowercase letters, a number and a
      special character.
    </p>
  );
}
