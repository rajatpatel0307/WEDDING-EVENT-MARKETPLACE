import { useContent } from "../../content/api";
import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Heart, Store, Check } from "lucide-react";
import PhotoUpload from "../../../components/common/PhotoUpload";
import AuthLayout from "../components/AuthLayout";
import {
  Field,
  Submit,
  ErrorBox,
  PasswordHint,
  passwordProps,
} from "../components/FormControls";
import { mutate } from "../../../services/apollo";
import { useAuth } from "../../../context/AuthContext";

const initial = {
  profilePhotoToken: "",
  profilePhotoUrl: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  terms: false,
  privacy: false,
};
export default function RegisterPage() {
  const legalVersions = useContent("/legal/current"),
    [acceptedVersions, setAcceptedVersions] = useState({});
  const acceptDocument = (type, checked) => {
    update(type, checked);
    setAcceptedVersions((old) => ({
      ...old,
      [type]: checked
        ? legalVersions.data?.find((v) => v.type === type)?.id
        : null,
    }));
  };
  const [params] = useSearchParams(),
    [role, setRole] = useState(
      params.get("role") === "vendor" ? "Vendor" : "Customer",
    ),
    [data, setData] = useState(initial),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  const navigate = useNavigate(),
    { notify } = useAuth(),
    heading = useRef();
  const vendor = role === "Vendor";
  function update(name, value) {
    setData((old) => ({
      ...old,
      [name]: value,
      ...(name === "email"
        ? { profilePhotoToken: "", profilePhotoUrl: "" }
        : {}),
    }));
  }
  function field(name, label, type = "text", extra = {}) {
    return (
      <Field
        key={name}
        label={label}
        name={name}
        type={type}
        value={data[name]}
        onChange={(e) => update(name, e.target.value)}
        required
        {...extra}
      />
    );
  }
  async function submit(e) {
    e.preventDefault();
    setError("");
    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { profilePhotoUrl: _photoPreview, ...account } = data;
      const input = account;
      if (data.terms && acceptedVersions.terms)
        input.termsVersionId = acceptedVersions.terms;
      if (data.privacy && acceptedVersions.privacy)
        input.privacyVersionId = acceptedVersions.privacy;
      const result = await mutate(
        vendor ? "registerVendor" : "registerCustomer",
        input,
      );
      sessionStorage.setItem("verifyEmail", data.email);
      sessionStorage.setItem("verifyRole", role);
      notify(result.message);
      setData(initial);
      navigate("/auth/verify-email");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout centered compact>
      <span className="eyebrow text-[10px] tracking-[2.5px] font-semibold flex items-center gap-[10px] [color:#916a65] [&_>_span]:w-[6px] [&_>_span]:h-[6px] [&_>_span]:[background:#956d67] [&_>_span]:rounded-full form-eyebrow [&.form-eyebrow]:text-[9px] [&.form-eyebrow]:tracking-[2px] [&.form-eyebrow]:mb-[12px]">
        LET'S MAKE SOMETHING BEAUTIFUL
      </span>
      <h2 tabIndex={-1} ref={heading}>
        {vendor ? "Grow with MarryNest." : "Your story begins here."}
      </h2>
      <p className="form-intro text-[12px] leading-[1.8] [margin:14px_0_28px] max-[480.001px]:mb-[25px]">
        {vendor
          ? "Create your account, then complete your business profile from your dashboard."
          : "A little about you. A world of possibilities."}
      </p>
      {
        <div
          className="role-picker grid grid-cols-[1fr_1fr] gap-[10px] mb-[25px] [&_button]:flex [&_button]:items-center [&_button]:gap-[10px] [&_button]:[border:1px_solid_#e6dfe0] [&_button]:rounded-[7px] [&_button]:bg-white [&_button]:text-left [&_button]:[padding:12px] [&_button]:[color:#8c7e82] [&_button]:text-[12px] [&_button.selected]:[border-color:#a46a77] [&_button.selected]:[color:#8c414e] [&_button.selected]:[background:#fdf7f8] [&_span]:flex-1 [&_small]:block [&_small]:text-[9px] [&_small]:[color:#a18d93] [&_small]:mt-[2px] max-[480.001px]:gap-[8px] max-[480.001px]:[&_button]:[padding:10px] max-[480.001px]:[&_button]:gap-[7px] max-[480.001px]:[&_small]:text-[8px]"
          aria-label="Account type"
        >
          {["Customer", "Vendor"].map((r) => (
            <button
              key={r}
              className={role === r ? "selected" : ""}
              type="button"
              aria-pressed={role === r}
              onClick={() => {
                setRole(r);
                setError("");
              }}
            >
              {r === "Customer" ? <Heart size={18} /> : <Store size={18} />}
              <span>
                {r}
                <small>
                  {r === "Customer"
                    ? "Plan your celebration"
                    : "Offer your services"}
                </small>
              </span>
              {role === r && <Check size={15} />}
            </button>
          ))}
        </div>
      }
      <form onSubmit={submit}>
        <ErrorBox message={error} />
        {
          <>
            <div className="field-grid grid grid-cols-[1fr_1fr] gap-[14px] max-[480.001px]:gap-[10px]">
              {field("firstName", "First Name", "text", {
                autoComplete: "given-name",
                maxLength: 100,
              })}
              {field("lastName", "Last Name", "text", {
                autoComplete: "family-name",
                maxLength: 100,
              })}
            </div>
            {field("email", "Email", "email", {
              autoComplete: "email",
              placeholder: "you@example.com",
              maxLength: 320,
              disabled: uploading,
            })}
            {!vendor && (
              <PhotoUpload
                email={data.email}
                url={data.profilePhotoUrl}
                onBusy={setUploading}
                onUploaded={({ uploadToken, url }) =>
                  setData((old) => ({
                    ...old,
                    profilePhotoToken: uploadToken,
                    profilePhotoUrl: url,
                  }))
                }
              />
            )}
            {field("phone", "Phone Number", "tel", {
              autoComplete: "tel",
              placeholder: "+919876543210",
              pattern: "\\+?[1-9][0-9]{7,14}",
              maxLength: 16,
              hint: "Include your country code, without spaces.",
            })}
            <div className="field-grid grid grid-cols-[1fr_1fr] gap-[14px] max-[480.001px]:gap-[10px]">
              {field("password", "Password", "password", passwordProps)}
              {field(
                "confirmPassword",
                "Confirm Password",
                "password",
                passwordProps,
              )}
            </div>
            <PasswordHint />
            <div className="agreements flex flex-col gap-[9px] text-[11px] [color:#8b7a7f] [margin:10px_0_24px] [&_label]:flex [&_label]:items-center [&_label]:gap-[8px] [&_input]:[accent-color:#8c414e] [&_input]:w-[14px] [&_input]:h-[14px] [&_a]:[color:#8c414e] [&_a]:underline [&_a]:[text-underline-offset:2px]">
              <label>
                <input
                  type="checkbox"
                  required
                  checked={data.terms}
                  onChange={(e) => acceptDocument("terms", e.target.checked)}
                />
                <span>
                  I agree to the{" "}
                  <Link to="/terms" target="_blank">
                    Terms & Conditions
                  </Link>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  required
                  checked={data.privacy}
                  onChange={(e) => acceptDocument("privacy", e.target.checked)}
                />
                <span>
                  I agree to the{" "}
                  <Link to="/privacy" target="_blank">
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>
          </>
        }
        <div className="step-actions flex gap-[12px] items-center mt-[20px] [&_.primary-button]:flex-1">
          <Submit busy={busy} disabled={busy || uploading}>
            Create account
          </Submit>
        </div>
      </form>
      <p className="signup-prompt text-[11px] text-center mt-[23px] [&_a]:[color:#8c414e] [&_a]:font-semibold [&_a]:inline-flex [&_a]:items-center [&_a]:gap-[4px] [&_a]:ml-[3px]">
        Already part of MarryNest? <Link to="/auth/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
