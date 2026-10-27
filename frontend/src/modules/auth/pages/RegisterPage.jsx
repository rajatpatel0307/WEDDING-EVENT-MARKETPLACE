import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Heart,
  Store,
  Check,
  Upload,
  FileCheck2,
  X,
  ArrowLeft,
} from "lucide-react";
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
export const categories = [
  "Venue & Location",
  "Catering & Food",
  "Tent & Infrastructure",
  "Decoration",
  "Lighting",
  "DJ & Entertainment",
  "Photography & Videography",
  "Makeup & Beauty",
  "Mehndi",
  "Wedding Clothing",
  "Jewellery & Accessories",
  "Transportation",
  "Religious & Ceremony Services",
  "Traditional Wedding Services",
  "Flowers & Florist",
  "Event Support",
  "Technology",
];
const steps = [
  "Account",
  "Business",
  "Services",
  "Location",
  "Documents",
  "Verify",
];
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
  businessName: "",
  businessDescription: "",
  businessEmail: "",
  businessPhone: "",
  categories: [],
  location: {
    address: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
    latitude: "",
    longitude: "",
  },
  documents: [],
};
const documentTypes = [
  "Business Registration",
  "GST",
  "PAN",
  "Identity Proof",
  "Address Proof",
  "Other Supporting Document",
];
export default function RegisterPage() {
  const [params] = useSearchParams(),
    [role, setRole] = useState(
      params.get("role") === "vendor" ? "Vendor" : "Customer",
    ),
    [step, setStep] = useState(0),
    [data, setData] = useState(initial),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [documentType, setDocumentType] = useState(documentTypes[0]);
  const navigate = useNavigate(),
    { notify } = useAuth(),
    heading = useRef();
  const vendor = role === "Vendor";
  function update(name, value) {
    setData((old) => ({
      ...old,
      [name]: value,
      ...(name === "email"
        ? { profilePhotoToken: "", profilePhotoUrl: "", documents: [] }
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
  function go(next) {
    setStep(next);
    setError("");
    setTimeout(() => heading.current?.focus(), 0);
  }
  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose a document under 5 MB.");
      return;
    }
    if (data.documents.length >= 6) {
      setError("Upload up to six documents.");
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const r = await mutate("uploadVendorDocument", {
        email: data.email,
        name: file.name,
        base64,
      });
      setData((old) => ({
        ...old,
        documents: [
          ...old.documents,
          { type: documentType, uploadToken: r.uploadToken, name: r.name },
        ],
      }));
      notify("Document uploaded securely.");
    } catch (err) {
      setError(err.message || "Unable to upload. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }
  async function submit(e) {
    e.preventDefault();
    setError("");
    if (step === 0 && data.password !== data.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (vendor && step === 2 && !data.categories.length) {
      setError("Select at least one service category.");
      return;
    }
    if (vendor && step === 4 && !data.documents.length) {
      setError("Upload at least one verification document.");
      return;
    }
    if (vendor && step < 4) {
      go(step + 1);
      return;
    }
    setBusy(true);
    try {
      const {
        businessName,
        businessDescription,
        businessEmail,
        businessPhone,
        categories: services,
        location,
        documents,
        profilePhotoUrl: _photoPreview,
        ...account
      } = data;
      const input = vendor
        ? {
            ...account,
            businessName,
            businessDescription,
            businessEmail,
            businessPhone,
            categories: services,
            location: {
              ...location,
              latitude:
                location.latitude === "" ? null : Number(location.latitude),
              longitude:
                location.longitude === "" ? null : Number(location.longitude),
            },
            documents: documents.map(({ type, uploadToken }) => ({
              type,
              uploadToken,
            })),
          }
        : account;
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
    <AuthLayout wide={vendor}>
      <span className="eyebrow form-eyebrow">
        LET'S MAKE SOMETHING BEAUTIFUL
      </span>
      <h2 tabIndex={-1} ref={heading}>
        {vendor ? "Grow with MarryNest." : "Your story begins here."}
      </h2>
      <p className="form-intro">
        {vendor
          ? "Bring your expertise to celebrations worth remembering."
          : "A little about you. A world of possibilities."}
      </p>
      {step === 0 && (
        <div className="role-picker" aria-label="Account type">
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
      )}
      {vendor && (
        <ol className="progress-steps" aria-label="Registration progress">
          {steps.map((label, i) => (
            <li
              key={label}
              className={i === step ? "current" : i < step ? "complete" : ""}
              aria-current={i === step ? "step" : undefined}
            >
              <span>{i < step ? <Check size={12} /> : i + 1}</span>
              <small>{label}</small>
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={submit}>
        <ErrorBox message={error} />
        {step === 0 && (
          <>
            <div className="field-grid">
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
            {field("phone", "Phone Number", "tel", {
              autoComplete: "tel",
              placeholder: "+919876543210",
              pattern: "\\+?[1-9][0-9]{7,14}",
              maxLength: 16,
              hint: "Include your country code, without spaces.",
            })}
            <div className="field-grid">
              {field("password", "Password", "password", passwordProps)}
              {field(
                "confirmPassword",
                "Confirm Password",
                "password",
                passwordProps,
              )}
            </div>
            <PasswordHint />
            <div className="agreements">
              <label>
                <input
                  type="checkbox"
                  required
                  checked={data.terms}
                  onChange={(e) => update("terms", e.target.checked)}
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
                  onChange={(e) => update("privacy", e.target.checked)}
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
        )}
        {vendor && step === 1 && (
          <>
            {field("businessName", "Business Name", "text", { maxLength: 200 })}
            <label className="field">
              <span>Business Description</span>
              <textarea
                value={data.businessDescription}
                onChange={(e) => update("businessDescription", e.target.value)}
                minLength={10}
                maxLength={5000}
                required
                rows={4}
                placeholder="Tell us about your business and what makes your services special."
              />
            </label>
            {field("businessEmail", "Business Email", "email", {
              maxLength: 320,
            })}
            {field("businessPhone", "Business Phone", "tel", {
              pattern: "\\+?[1-9][0-9]{7,14}",
              placeholder: "+919876543210",
            })}
          </>
        )}
        {vendor && step === 2 && (
          <>
            <h3>What do you bring to the celebration?</h3>
            <p className="step-description">
              Choose one or more services your business offers.
            </p>
            <div className="category-grid">
              {categories.map((category) => (
                <label
                  key={category}
                  className={data.categories.includes(category) ? "chosen" : ""}
                >
                  <input
                    type="checkbox"
                    checked={data.categories.includes(category)}
                    onChange={(e) =>
                      update(
                        "categories",
                        e.target.checked
                          ? [...data.categories, category]
                          : data.categories.filter((c) => c !== category),
                      )
                    }
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </>
        )}
        {vendor && step === 3 && (
          <>
            <h3>Where can couples find you?</h3>
            <div className="location-fields">
              {Object.entries({
                address: "Address",
                city: "City",
                state: "State",
                country: "Country",
                postalCode: "Postal Code",
                latitude: "Latitude",
                longitude: "Longitude",
              }).map(([name, label]) => (
                <Field
                  key={name}
                  label={label}
                  name={name}
                  value={data.location[name]}
                  type={
                    ["latitude", "longitude"].includes(name) ? "number" : "text"
                  }
                  step={
                    ["latitude", "longitude"].includes(name) ? "any" : undefined
                  }
                  min={
                    name === "latitude"
                      ? -90
                      : name === "longitude"
                        ? -180
                        : undefined
                  }
                  max={
                    name === "latitude"
                      ? 90
                      : name === "longitude"
                        ? 180
                        : undefined
                  }
                  maxLength={name === "address" ? 300 : 100}
                  required={!["latitude", "longitude"].includes(name)}
                  onChange={(e) =>
                    update("location", {
                      ...data.location,
                      [name]: e.target.value,
                    })
                  }
                />
              ))}
            </div>
          </>
        )}
        {vendor && step === 4 && (
          <>
            <h3>A little verification. A lot of trust.</h3>
            <p className="step-description">
              Upload at least one business or identity document for our
              administration team to review.
            </p>
            <label className="field">
              <span>Document type</span>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                {documentTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className={`upload-box ${uploading ? "disabled" : ""}`}>
              <Upload size={25} />
              <strong>
                {uploading
                  ? "Uploading securely…"
                  : "Choose a verification document"}
              </strong>
              <span>PDF, PNG or JPEG · Up to 5 MB each · Maximum 6 files</span>
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                onChange={upload}
                disabled={uploading || data.documents.length >= 6}
              />
            </label>
            <ul className="document-list">
              {data.documents.map((d, i) => (
                <li key={d.uploadToken}>
                  <FileCheck2 size={18} />
                  <span>
                    {d.name}
                    <small>{d.type}</small>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${d.name}`}
                    onClick={() =>
                      update(
                        "documents",
                        data.documents.filter((_, n) => n !== i),
                      )
                    }
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="info-box">
              After email verification, your account will be pending admin
              approval. You can sign in to check your status.
            </div>
          </>
        )}
        <div className="step-actions">
          {step > 0 && (
            <button
              type="button"
              className="secondary-button"
              disabled={busy || uploading}
              onClick={() => go(step - 1)}
            >
              <ArrowLeft size={15} /> Back
            </button>
          )}
          <Submit busy={busy} disabled={busy || uploading}>
            {vendor
              ? step === 4
                ? "Submit & verify email"
                : "Continue"
              : "Create account"}
          </Submit>
        </div>
      </form>
      <p className="signup-prompt">
        Already part of MarryNest? <Link to="/auth/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
