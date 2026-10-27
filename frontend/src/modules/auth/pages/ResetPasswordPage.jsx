import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
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
export default function ResetPasswordPage({ change = false }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { resetToken, setResetToken, setUser, notify } = useAuth(),
    navigate = useNavigate();
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
      setResetToken("");
      setUser(null);
      await client.clearStore();
      notify(r.message);
      navigate("/auth/login", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <div className="form-icon">
        <LockKeyhole size={23} />
      </div>
      <h2>{change ? "Change password." : "A fresh start."}</h2>
      <p className="form-intro">
        Choose a strong password to keep your account protected.
      </p>
      <form onSubmit={submit}>
        <ErrorBox message={error} />
        {change && (
          <Field
            label="Current Password"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
          />
        )}
        <Field
          label="New Password"
          name="password"
          type="password"
          required
          {...passwordProps}
        />
        <PasswordHint />
        <Field
          label={change ? "Confirm New Password" : "Confirm Password"}
          name="confirmPassword"
          type="password"
          required
          {...passwordProps}
        />
        <Submit busy={busy}>
          {change ? "Change password" : "Reset Password"}
        </Submit>
      </form>
      <Link className="back-link" to="/auth/login">
        Back to sign in
      </Link>
    </AuthLayout>
  );
}
