import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Heart, ArrowUpRight } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { Field, Submit, ErrorBox } from "../components/FormControls";
import { mutate } from "../../../services/apollo";
import { useAuth } from "../../../context/AuthContext";
import { customerLoginDestination } from "../../../routes/authNavigation";
export default function LoginPage() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [unverified, setUnverified] = useState(false);
  const [params] = useSearchParams();
  const { setUser, notify } = useAuth(),
    navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setUnverified(false);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await mutate("login", data);
      setUser(result.user);
      notify("Welcome back to MarryNest.");
      navigate(customerLoginDestination(result.user, params.get("redirect")), {
        replace: true,
      });
    } catch (e) {
      setError(e.message);
      if (e.errors?.some((x) => x.extensions?.code === "EMAIL_UNVERIFIED")) {
        sessionStorage.setItem("verifyEmail", data.identifier);
        setUnverified(true);
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <div className="form-icon w-[48px] h-[48px] [border:1px_solid_#eaded9] rounded-[13px] grid place-items-center [color:#9a5f65] [background:#fcf8f6] mb-[23px] max-[480.001px]:mb-[20px]">
        <Heart size={22} strokeWidth={1.5} />
      </div>
      <span className="eyebrow text-[10px] tracking-[2.5px] font-semibold flex items-center gap-[10px] [color:#916a65] [&_>_span]:w-[6px] [&_>_span]:h-[6px] [&_>_span]:[background:#956d67] [&_>_span]:rounded-full form-eyebrow [&.form-eyebrow]:text-[9px] [&.form-eyebrow]:tracking-[2px] [&.form-eyebrow]:mb-[12px]">
        WELCOME TO MARRYNEST
      </span>
      <h2>
        Your next chapter
        <br />
        starts here.
      </h2>
      <p className="form-intro text-[12px] leading-[1.8] [margin:14px_0_28px] max-[480.001px]:mb-[25px]">
        Sign in to bring your celebration to life.
      </p>
      <form onSubmit={submit}>
        <ErrorBox message={error} />
        {unverified && (
          <Link
            className="text-link [color:#8c414e] font-medium inline-flex items-center gap-[7px] [&:hover]:underline"
            to="/auth/verify-email"
          >
            Verify your email →
          </Link>
        )}
        <Field
          label="Email or phone number"
          name="identifier"
          placeholder="you@example.com"
          autoComplete="username"
          required
          maxLength={320}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          maxLength={72}
        />
        <div className="form-row flex justify-between items-center gap-[8px] text-[10px] [margin:-1px_0_24px]">
          <span className="session-note [color:#aa9a9e]">
            Your private planning space
          </span>
          <Link
            className="text-link [color:#8c414e] font-medium inline-flex items-center gap-[7px] [&:hover]:underline"
            to="/auth/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
        <Submit busy={busy}>Sign in</Submit>
      </form>
      <div className="or-divider flex items-center gap-[13px] [margin:27px_0_19px] [color:#b8a7ab] text-[9px] tracking-[0.3px] [&::before]:[content:''] [&::before]:h-[1px] [&::before]:[background:#eee6e7] [&::before]:flex-1 [&::after]:[content:''] [&::after]:h-[1px] [&::after]:[background:#eee6e7] [&::after]:flex-1">
        <span>New beginnings await</span>
      </div>
      <p className="signup-prompt text-[11px] text-center mt-[23px] [&_a]:[color:#8c414e] [&_a]:font-semibold [&_a]:inline-flex [&_a]:items-center [&_a]:gap-[4px] [&_a]:ml-[3px]">
        New to MarryNest?{" "}
        <Link to="/auth/signup">
          Create an account <ArrowUpRight size={14} />
        </Link>
      </p>
      <div className="vendor-invite flex items-center justify-between [background:#faf7f4] [border:1px_solid_#f0e8e3] rounded-[6px] [padding:15px] mt-[30px] gap-[10px] [&_strong]:font-medium [&_strong]:text-[10px] [&_strong]:[color:#695254] [&_p]:text-[9px] [&_p]:mt-[4px] [&_p]:[color:#9c888b] [&_>_a]:[color:#9b6b70]">
        <div>
          <strong>Make beautiful celebrations your business.</strong>
          <p>Connect with couples looking for someone like you.</p>
        </div>
        <Link to="/auth/signup?role=vendor" aria-label="Join as a vendor">
          <ArrowUpRight size={20} />
        </Link>
      </div>
    </AuthLayout>
  );
}
