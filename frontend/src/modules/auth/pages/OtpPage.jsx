import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailCheck, ArrowLeft } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { Field, Submit, ErrorBox } from "../components/FormControls";
import { mutate } from "../../../services/apollo";
import { useAuth } from "../../../context/AuthContext";
export default function OtpPage({ reset = false }) {
  const [digits, setDigits] = useState(Array(6).fill("")),
    [busy, setBusy] = useState(false),
    [resending, setResending] = useState(false),
    [error, setError] = useState(""),
    [seconds, setSeconds] = useState(60),
    [identifier, setIdentifier] = useState(
      () =>
        sessionStorage.getItem(reset ? "resetIdentifier" : "verifyEmail") || "",
    );
  const inputs = useRef([]),
    navigate = useNavigate(),
    { notify, setResetToken } = useAuth();
  useEffect(() => {
    inputs.current[0]?.focus();
    const interval = setInterval(
      () => setSeconds((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(interval);
  }, [reset]);
  function fill(value, index) {
    const clean = value.replace(/\D/g, "").slice(0, 6 - index);
    if (!clean) {
      setDigits((old) => old.map((d, i) => (i === index ? "" : d)));
      return;
    }
    setDigits((old) => {
      const next = [...old];
      clean.split("").forEach((d, i) => (next[index + i] = d));
      return next;
    });
    inputs.current[Math.min(5, index + clean.length)]?.focus();
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await mutate(
        reset ? "verifyResetOtp" : "verifyEmailOtp",
        reset
          ? { identifier, code: digits.join("") }
          : { email: identifier, code: digits.join("") },
      );
      if (reset) {
        setResetToken(r.resetToken);
        navigate("/auth/reset-password");
      } else {
        sessionStorage.removeItem("verifyEmail");
        notify("Email verified successfully. Sign in to continue.");
        navigate("/auth/login", { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setResending(true);
    setError("");
    try {
      const r = await mutate(
        reset ? "forgotPassword" : "resendEmailOtp",
        reset ? { identifier } : { email: identifier },
      );
      setSeconds(60);
      notify(r.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setResending(false);
    }
  }
  return (
    <AuthLayout>
      <div className="form-icon">
        <MailCheck size={24} />
      </div>
      <span className="eyebrow form-eyebrow">ONE SMALL STEP</span>
      <h2>{reset ? "Verify OTP" : "Check your inbox."}</h2>
      <p className="form-intro">
        Enter the six-digit code sent to your registered email. Your code
        expires in 10 minutes.
      </p>
      {!reset && sessionStorage.getItem("verifyRole") === "Vendor" && (
        <ol className="progress-steps" aria-label="Registration progress">
          {[
            "Account",
            "Business",
            "Services",
            "Location",
            "Documents",
            "Verify",
          ].map((s, i) => (
            <li
              key={s}
              className={i === 5 ? "current" : "complete"}
              aria-current={i === 5 ? "step" : undefined}
            >
              <span>{i === 5 ? "6" : "✓"}</span>
              <small>{s}</small>
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={submit}>
        <ErrorBox message={error} />
        <Field
          label={reset ? "Registered email or phone" : "Email address"}
          name="identifier"
          type={reset ? "text" : "email"}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <fieldset className="otp-fieldset">
          <legend>Verification code</legend>
          <div className="otp-inputs">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                value={digit}
                aria-label={`Digit ${i + 1}`}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                onChange={(e) => fill(e.target.value, i)}
                onPaste={(e) => {
                  e.preventDefault();
                  fill(e.clipboardData.getData("text"), i);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0)
                    inputs.current[i - 1].focus();
                  if (e.key === "ArrowLeft" && i > 0)
                    inputs.current[i - 1].focus();
                  if (e.key === "ArrowRight" && i < 5)
                    inputs.current[i + 1].focus();
                }}
                required
                pattern="[0-9]"
              />
            ))}
          </div>
        </fieldset>
        <Submit busy={busy} disabled={busy || digits.some((d) => !d)}>
          Verify code
        </Submit>
      </form>
      <p className="resend-line">
        Didn't receive a code?{" "}
        <button
          disabled={seconds > 0 || resending || !identifier}
          onClick={resend}
        >
          {resending
            ? "Sending…"
            : seconds > 0
              ? `Resend in ${seconds}s`
              : "Resend code"}
        </button>
      </p>
      <Link
        className="back-link"
        to={reset ? "/auth/forgot-password" : "/auth/login"}
      >
        <ArrowLeft size={15} />{" "}
        {reset ? "Change email / phone" : "Back to sign in"}
      </Link>
    </AuthLayout>
  );
}
