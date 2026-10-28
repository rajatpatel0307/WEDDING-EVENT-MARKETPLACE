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
      <div className="form-icon w-[48px] h-[48px] [border:1px_solid_#eaded9] rounded-[13px] grid place-items-center [color:#9a5f65] [background:#fcf8f6] mb-[23px] max-[480.001px]:mb-[20px]">
        <KeyRound size={22} />
      </div>
      <h2>Forgot Password?</h2>
      <p className="form-intro text-[12px] leading-[1.8] [margin:14px_0_28px] max-[480.001px]:mb-[25px]">
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
      <Link className="back-link inline-flex gap-[8px] items-center [color:#8d6a72] text-[12px] mt-[25px]" to="/auth/login">
        <ArrowLeft size={15} /> Back to sign in
      </Link>
    </AuthLayout>
  );
}
