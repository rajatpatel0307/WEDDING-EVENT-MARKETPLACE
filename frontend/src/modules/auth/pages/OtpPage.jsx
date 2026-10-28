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
      <div className="form-icon w-[48px] h-[48px] [border:1px_solid_#eaded9] rounded-[13px] grid place-items-center [color:#9a5f65] [background:#fcf8f6] mb-[23px] max-[480.001px]:mb-[20px]">
        <MailCheck size={24} />
      </div>
      <span className="eyebrow text-[10px] tracking-[2.5px] font-semibold flex items-center gap-[10px] [color:#916a65] [&_>_span]:w-[6px] [&_>_span]:h-[6px] [&_>_span]:[background:#956d67] [&_>_span]:rounded-full form-eyebrow [&.form-eyebrow]:text-[9px] [&.form-eyebrow]:tracking-[2px] [&.form-eyebrow]:mb-[12px]">ONE SMALL STEP</span>
      <h2>{reset ? "Verify OTP" : "Check your inbox."}</h2>
      <p className="form-intro text-[12px] leading-[1.8] [margin:14px_0_28px] max-[480.001px]:mb-[25px]">
        Enter the six-digit code sent to your registered email. Your code
        expires in 10 minutes.
      </p>
      {!reset && sessionStorage.getItem("verifyRole") === "Vendor" && (
        <ol className="progress-steps flex list-none p-0 [margin:10px_0_30px] justify-between relative [&::before]:[content:''] [&::before]:absolute [&::before]:top-[12px] [&::before]:left-[20px] [&::before]:right-[20px] [&::before]:h-[1px] [&::before]:[background:#eadddf] [&_li]:relative [&_li]:flex [&_li]:flex-col [&_li]:items-center [&_li]:gap-[7px] [&_li]:text-[9px] [&_li]:[color:#ac9da2] [&_li_>_span]:bg-white [&_li_>_span]:[border:1px_solid_#e5d8dc] [&_li_>_span]:rounded-full [&_li_>_span]:w-[24px] [&_li_>_span]:h-[24px] [&_li_>_span]:grid [&_li_>_span]:place-items-center [&_li.current]:[color:#8c414e] [&_li.current_>_span]:[background:#8c414e] [&_li.current_>_span]:text-white [&_li.current_>_span]:[border-color:#8c414e] [&_li.current_>_span]:[box-shadow:0_0_0_4px_#8c414e10] [&_li.complete_>_span]:[background:#f3e9eb] [&_li.complete_>_span]:[color:#8c414e] [&_li.complete_>_span]:[border-color:#dec1c9] max-[480.001px]:mt-[15px] max-[480.001px]:[&_small]:text-[8px] max-[480.001px]:[&_li]:gap-[6px]" aria-label="Registration progress">
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
        <fieldset className="otp-fieldset border-0 p-0 [margin:25px_0] [&_legend]:text-[11px] [&_legend]:[color:#76656c] [&_legend]:mb-[10px]">
          <legend>Verification code</legend>
          <div className="otp-inputs flex gap-[9px] [&_input]:w-[calc((100%_-_45px)_/_6)] [&_input]:h-[55px] [&_input]:min-w-0 [&_input]:rounded-[7px] [&_input]:[border:1px_solid_#dfd0d6] [&_input]:text-center [&_input]:text-[23px] [&_input]:[color:#8c414e] [&_input]:[background:#fffcfd] max-[480.001px]:gap-[6px] max-[480.001px]:[&_input]:w-[calc((100%_-_30px)_/_6)] max-[480.001px]:[&_input]:h-[49px]">
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
      <p className="resend-line text-center text-[11px] mt-[23px] [&_button]:border-0 [&_button]:bg-transparent [&_button]:[color:#8c414e] [&_button]:text-[11px] [&_button]:font-medium [&_button]:[padding:5px]">
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
        className="back-link inline-flex gap-[8px] items-center [color:#8d6a72] text-[12px] mt-[25px]"
        to={reset ? "/auth/forgot-password" : "/auth/login"}
      >
        <ArrowLeft size={15} />{" "}
        {reset ? "Change email / phone" : "Back to sign in"}
      </Link>
    </AuthLayout>
  );
}
