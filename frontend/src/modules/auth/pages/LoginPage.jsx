import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Heart, ArrowUpRight } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { Field, Submit, ErrorBox } from "../components/FormControls";
import { mutate } from "../../../services/apollo";
import { useAuth, destination } from "../../../context/AuthContext";
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
      navigate(
        result.user.role === "Customer" &&
          params.get("redirect") === "/customer/wishlist"
          ? "/customer/wishlist"
          : destination(result.user),
        { replace: true },
      );
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
      <div className="form-icon">
        <Heart size={22} strokeWidth={1.5} />
      </div>
      <span className="eyebrow form-eyebrow">WELCOME TO MARRYNEST</span>
      <h2>
        Your next chapter
        <br />
        starts here.
      </h2>
      <p className="form-intro">Sign in to bring your celebration to life.</p>
      <form onSubmit={submit}>
        <ErrorBox message={error} />
        {unverified && (
          <Link className="text-link" to="/auth/verify-email">
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
        <div className="form-row">
          <span className="session-note">Your private planning space</span>
          <Link className="text-link" to="/auth/forgot-password">
            Forgot password?
          </Link>
        </div>
        <Submit busy={busy}>Sign in</Submit>
      </form>
      <div className="or-divider">
        <span>New beginnings await</span>
      </div>
      <p className="signup-prompt">
        New to MarryNest?{" "}
        <Link to="/auth/signup">
          Create an account <ArrowUpRight size={14} />
        </Link>
      </p>
      <div className="vendor-invite">
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
