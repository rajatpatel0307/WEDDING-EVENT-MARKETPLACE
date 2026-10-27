import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, ArrowLeft } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { Field, Submit, ErrorBox } from "../components/FormControls";
import { mutate } from "../../../services/apollo";
import { useAuth } from "../../../context/AuthContext";
export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate(),
    { notify } = useAuth();
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const identifier = new FormData(e.currentTarget).get("identifier");
    try {
      const result = await mutate("forgotPassword", { identifier });
      sessionStorage.setItem("resetIdentifier", identifier);
      notify(result.message);
      navigate("/auth/verify-reset-otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <div className="form-icon">
        <KeyRound size={22} />
      </div>
      <h2>Forgot Password?</h2>
      <p className="form-intro">
        Enter your registered email or phone number and we'll send you a
        verification code.
      </p>
      <form onSubmit={submit}>
        <ErrorBox message={error} />
        <Field
          label="Email / Phone"
          name="identifier"
          autoComplete="username"
          placeholder="Email or phone with country code"
          required
          maxLength={320}
        />
        <Submit busy={busy}>Send OTP</Submit>
      </form>
      <Link className="back-link" to="/auth/login">
        <ArrowLeft size={15} /> Back to sign in
      </Link>
    </AuthLayout>
  );
}
