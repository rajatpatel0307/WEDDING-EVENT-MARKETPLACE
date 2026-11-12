import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import {
  Field,
  Submit,
  ErrorBox,
  PasswordHint,
  passwordProps,
} from "../components/FormControls";
import { mutate, client } from "../../../services/apollo";
import { useAuth } from "../../../context/AuthContext";
function PasswordLayout({ embedded, children }) {
  if (!embedded) return <AuthLayout centered compact>{children}</AuthLayout>;
  return (
    <div className="mx-auto w-full max-w-[960px] py-[12px] max-[600px]:py-0">
      <Link to="/admin/profile" className="mb-[22px] inline-flex items-center gap-[8px] text-[12px] font-medium text-[#547163] hover:text-[#176b60]">
        <ArrowLeft size={15} aria-hidden="true" /> Back to profile
      </Link>
      <section className="overflow-hidden rounded-[20px] border border-[#dfe8df] bg-white shadow-[0_10px_36px_#24483d08] [&_.field]:mb-[22px] [&_.field]:text-[12px] [&_.field]:text-[#365345] [&_.field_input]:min-h-[46px] [&_.field_input]:w-full [&_.field_input]:rounded-[10px] [&_.field_input]:border-[#dfe8e3] [&_.field_input]:bg-[#fbfcfa] [&_.field_input]:text-[14px] [&_.field_input]:pr-[44px] [&_.field_input:focus]:border-[#83ad9e] [&_.field_input:focus]:bg-white [&_.field_input:focus]:shadow-[0_0_0_3px_#176b6010] [&_.password-toggle]:text-[#708878] [&_.password-toggle:hover]:text-[#176b60] [&_.primary-button]:min-h-[44px] [&_.primary-button]:w-auto [&_.primary-button]:rounded-[9px] [&_.primary-button]:border-[#176b60]! [&_.primary-button]:bg-[#176b60]! [&_.primary-button]:px-[20px] [&_.primary-button]:text-[13px] [&_.primary-button]:shadow-[0_3px_10px_#176b6014] [&_.primary-button:hover]:border-[#11594f]! [&_.primary-button:hover]:bg-[#11594f]! max-[480px]:[&_.primary-button]:w-full">
        {children}
      </section>
    </div>
  );
}

export default function ResetPasswordPage({ change = false, embedded = false }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const { user, resetToken, setResetToken, setUser, notify } = useAuth();
  if (saved) return <Navigate to="/auth/login" replace />;
  if (change && !embedded && user?.role === "Admin")
    return <Navigate to="/admin/change-password" replace />;
  if (!change && !resetToken)
    return <Navigate to="/auth/forgot-password" replace />;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const r = await mutate(
        change ? "changePassword" : "resetPassword",
        change ? data : { ...data, resetToken },
      );
      setSaved(true);
      setResetToken("");
      setUser(null);
      notify(r.message);
      // Cache cleanup must not interrupt the successful-save redirect.
      await client.clearStore().catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <PasswordLayout embedded={embedded}>
      {embedded ? (
        <header className="flex items-start gap-[17px] border-b border-[#e8eee5] bg-linear-to-r from-[#f6f9f2] to-white px-[30px] py-[27px] max-[600px]:gap-[12px] max-[600px]:px-[20px] max-[600px]:py-[23px]">
          <span className="grid size-[50px] shrink-0 place-items-center rounded-[14px] border border-[#dce8d7] bg-white text-[#557e60] shadow-[0_2px_6px_#24483d05] max-[480px]:size-[42px]" aria-hidden="true"><LockKeyhole size={23} strokeWidth={1.7} /></span>
          <div>
            <p className="m-0! mb-[6px]! text-[10px]! font-semibold tracking-[1.7px] text-[#91774e]! uppercase">Account security</p>
            <h1 className="m-0! text-[26px]! leading-[1.25] font-semibold tracking-[-0.7px] text-[#29483d] max-[480px]:text-[22px]!">Change password</h1>
            <p className="mt-[8px] mb-0 text-[12px]! leading-[1.7] text-[#64796a]!">Keep your account protected with a strong, unique password.</p>
          </div>
        </header>
      ) : <>
      <div className="mb-[23px] grid size-[48px] place-items-center rounded-[13px] border border-[#eaded9] bg-[#fcf8f6] text-[#9a5f65] max-[480px]:mb-[20px]">
        <LockKeyhole size={23} />
      </div>
      <h2>{change ? "Change password." : "A fresh start."}</h2>
      <p className="form-intro text-[12px] leading-[1.8] [margin:14px_0_28px] max-[480.001px]:mb-[25px]">
        Choose a strong password to keep your account protected.
      </p>
      </>}
      <div className={embedded ? "grid grid-cols-[minmax(0,1fr)_245px] max-[1100px]:grid-cols-1" : undefined}>
      <form className={embedded ? "min-w-0 p-[30px] max-[600px]:p-[20px]" : undefined} onSubmit={submit} aria-busy={busy}>
        <ErrorBox message={error} />
        {change && (
          <Field
            label="Current Password"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            placeholder={embedded ? "Enter current password" : undefined}
          />
        )}
        <Field
          label="New Password"
          name="password"
          type="password"
          required
          {...passwordProps}
          placeholder={embedded ? "Create a new password" : undefined}
          aria-describedby={embedded ? "password-requirements" : undefined}
        />
        {!embedded && <PasswordHint />}
        <Field
          label={change ? "Confirm New Password" : "Confirm Password"}
          name="confirmPassword"
          type="password"
          required
          {...passwordProps}
          placeholder={embedded ? "Re-enter your new password" : undefined}
        />
        <div className={embedded ? "mt-[6px] flex flex-wrap items-center justify-between gap-[14px] border-t border-[#edf1e9] pt-[22px] max-[480px]:flex-col-reverse max-[480px]:items-stretch" : undefined}>
        {embedded && <Link className="inline-flex min-h-[40px] items-center justify-center rounded-[8px] px-[8px] text-[12px] font-medium text-[#63786a] hover:text-[#176b60]" to="/admin/profile">Cancel</Link>}
        <Submit busy={busy}>
          {change ? "Change password" : "Reset Password"}
        </Submit>
        </div>
      </form>
      {embedded && (
        <aside className="min-w-0 border-l border-[#e8eee4] bg-[#fafbf7] p-[25px] max-[1100px]:grid max-[1100px]:grid-cols-2 max-[1100px]:gap-[26px] max-[1100px]:border-t max-[1100px]:border-l-0 max-[600px]:grid-cols-1 max-[600px]:gap-[22px] max-[600px]:p-[20px]" aria-label="Password guidance">
          <div id="password-requirements">
            <span className="mb-[14px] grid size-[34px] place-items-center rounded-[10px] border border-[#e3e9dc] bg-white text-[#779164]" aria-hidden="true"><KeyRound size={17} strokeWidth={1.7} /></span>
            <h2 className="m-0! text-[13px]! font-semibold text-[#39553e]">Password requirements</h2>
            <ul className="m-0 mt-[15px] grid list-none gap-[13px] p-0 text-[11px] leading-[1.7] text-[#60745c]">
              {["8 to 72 characters", "Uppercase and lowercase letters", "At least one number", "At least one special character"].map(rule => <li key={rule} className="flex items-start gap-[8px]"><span className="mt-[7px] size-[4px] shrink-0 rounded-full bg-[#91a27e]" aria-hidden="true" />{rule}</li>)}
            </ul>
          </div>
          <div className="mt-[25px] border-t border-[#e3e9dc] pt-[20px] max-[1100px]:mt-0 max-[1100px]:border-t-0 max-[1100px]:pt-0 max-[600px]:border-t max-[600px]:pt-[20px]">
            <ShieldCheck className="mb-[9px] text-[#6d8d69]" size={19} strokeWidth={1.6} aria-hidden="true" />
            <h2 className="m-0! text-[12px]! font-semibold text-[#39553e]">After you update</h2>
            <p className="mt-[7px] mb-0 text-[11px]! leading-[1.8] text-[#65795f]!">After changing your password, sign in again with your new password.</p>
          </div>
        </aside>
      )}
      </div>
      {!embedded && (
        <Link className="back-link inline-flex gap-[8px] items-center [color:#8d6a72] text-[12px] mt-[25px]" to="/auth/login">
          Back to sign in
        </Link>
      )}
    </PasswordLayout>
  );
}
