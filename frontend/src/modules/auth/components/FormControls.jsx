import { useState } from "react";
import { Eye, EyeOff, ArrowRight, LoaderCircle } from "lucide-react";
export function Field({ label, name, type = "text", hint, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-wrap">
        <input
          name={name}
          type={type === "password" && visible ? "text" : type}
          {...props}
        />
        {type === "password" && (
          <button
            type="button"
            className="password-toggle"
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
    <button className="primary-button" disabled={busy} {...props}>
      {busy ? (
        <>
          <LoaderCircle className="spin" size={18} /> Please wait…
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
    <div className="error-box" role="alert">
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
    <p className="password-hint">
      Use 8–72 characters with uppercase and lowercase letters, a number and a
      special character.
    </p>
  );
}
