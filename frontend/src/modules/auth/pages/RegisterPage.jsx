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
      <span className="eyebrow text-[10px] tracking-[2.5px] font-semibold flex items-center gap-[10px] [color:#916a65] [&_>_span]:w-[6px] [&_>_span]:h-[6px] [&_>_span]:[background:#956d67] [&_>_span]:rounded-full form-eyebrow [&.form-eyebrow]:text-[9px] [&.form-eyebrow]:tracking-[2px] [&.form-eyebrow]:mb-[12px]">
        LET'S MAKE SOMETHING BEAUTIFUL
      </span>
      <h2 tabIndex={-1} ref={heading}>
        {vendor ? "Grow with MarryNest." : "Your story begins here."}
      </h2>
      <p className="form-intro text-[12px] leading-[1.8] [margin:14px_0_28px] max-[480.001px]:mb-[25px]">
        {vendor
          ? "Bring your expertise to celebrations worth remembering."
          : "A little about you. A world of possibilities."}
      </p>
      {step === 0 && (
        <div className="role-picker grid grid-cols-[1fr_1fr] gap-[10px] mb-[25px] [&_button]:flex [&_button]:items-center [&_button]:gap-[10px] [&_button]:[border:1px_solid_#e6dfe0] [&_button]:rounded-[7px] [&_button]:bg-white [&_button]:text-left [&_button]:[padding:12px] [&_button]:[color:#8c7e82] [&_button]:text-[12px] [&_button.selected]:[border-color:#a46a77] [&_button.selected]:[color:#8c414e] [&_button.selected]:[background:#fdf7f8] [&_span]:flex-1 [&_small]:block [&_small]:text-[9px] [&_small]:[color:#a18d93] [&_small]:mt-[2px] max-[480.001px]:gap-[8px] max-[480.001px]:[&_button]:[padding:10px] max-[480.001px]:[&_button]:gap-[7px] max-[480.001px]:[&_small]:text-[8px]" aria-label="Account type">
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
        <ol className="progress-steps flex list-none p-0 [margin:10px_0_30px] justify-between relative [&::before]:[content:''] [&::before]:absolute [&::before]:top-[12px] [&::before]:left-[20px] [&::before]:right-[20px] [&::before]:h-[1px] [&::before]:[background:#eadddf] [&_li]:relative [&_li]:flex [&_li]:flex-col [&_li]:items-center [&_li]:gap-[7px] [&_li]:text-[9px] [&_li]:[color:#ac9da2] [&_li_>_span]:bg-white [&_li_>_span]:[border:1px_solid_#e5d8dc] [&_li_>_span]:rounded-full [&_li_>_span]:w-[24px] [&_li_>_span]:h-[24px] [&_li_>_span]:grid [&_li_>_span]:place-items-center [&_li.current]:[color:#8c414e] [&_li.current_>_span]:[background:#8c414e] [&_li.current_>_span]:text-white [&_li.current_>_span]:[border-color:#8c414e] [&_li.current_>_span]:[box-shadow:0_0_0_4px_#8c414e10] [&_li.complete_>_span]:[background:#f3e9eb] [&_li.complete_>_span]:[color:#8c414e] [&_li.complete_>_span]:[border-color:#dec1c9] max-[480.001px]:mt-[15px] max-[480.001px]:[&_small]:text-[8px] max-[480.001px]:[&_li]:gap-[6px]" aria-label="Registration progress">
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
            <label className="field block mb-[18px] text-[11px] font-medium [color:#55494d] [&_>_span]:block [&_>_span]:mb-[7px] [&_input]:block [&_input]:w-full [&_input]:[border:1px_solid_#e8dfe0] [&_input]:bg-white [&_input]:rounded-[6px] [&_input]:min-h-[45px] [&_input]:[padding:11px_13px] [&_input]:[color:#453438] [&_input]:text-[12px] [&_input]:[transition:border_0.2s,_box-shadow_0.2s] [&_textarea]:block [&_textarea]:w-full [&_textarea]:[border:1px_solid_#e8dfe0] [&_textarea]:bg-white [&_textarea]:rounded-[6px] [&_textarea]:min-h-[45px] [&_textarea]:[padding:11px_13px] [&_textarea]:[color:#453438] [&_textarea]:text-[12px] [&_textarea]:[transition:border_0.2s,_box-shadow_0.2s] [&_textarea]:resize-y [&_select]:block [&_select]:w-full [&_select]:[border:1px_solid_#e8dfe0] [&_select]:bg-white [&_select]:rounded-[6px] [&_select]:min-h-[45px] [&_select]:[padding:11px_13px] [&_select]:[color:#453438] [&_select]:text-[12px] [&_select]:[transition:border_0.2s,_box-shadow_0.2s] [&_input::placeholder]:[color:#b3a6aa] [&_textarea::placeholder]:[color:#b3a6aa] [&_input:focus]:[border-color:#ad7b82] [&_input:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_input:focus]:[outline:none] [&_textarea:focus]:[border-color:#ad7b82] [&_textarea:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_textarea:focus]:[outline:none] [&_select:focus]:[border-color:#ad7b82] [&_select:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_select:focus]:[outline:none] [&_small]:block [&_small]:[color:#95868a] [&_small]:text-[10px] [&_small]:mt-[5px] [&_small]:font-normal">
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
            <p className="step-description text-[12px] mb-[20px]">
              Choose one or more services your business offers.
            </p>
            <div className="category-grid [&_input]:[accent-color:#8c414e] [&_input]:w-[14px] [&_input]:h-[14px] [&_input]:shrink-0 grid grid-cols-[1fr_1fr] gap-[9px] [margin:20px_0_25px] [&_label]:flex [&_label]:items-center [&_label]:gap-[8px] [&_label]:[padding:11px] [&_label]:[border:1px_solid_#e8dfe1] [&_label]:rounded-[6px] [&_label]:text-[10px] [&_label]:cursor-pointer [&_label.chosen]:[background:#fcf4f6] [&_label.chosen]:[border-color:#bf929d] [&_label.chosen]:[color:#8c414e] max-[480.001px]:grid-cols-[1fr]">
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
            <div className="location-fields grid grid-cols-[1fr_1fr] gap-[0_15px] [&_>_.field:first-child]:[grid-column:1/-1] max-[480.001px]:gap-[0_10px]">
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
            <p className="step-description text-[12px] mb-[20px]">
              Upload at least one business or identity document for our
              administration team to review.
            </p>
            <label className="field block mb-[18px] text-[11px] font-medium [color:#55494d] [&_>_span]:block [&_>_span]:mb-[7px] [&_input]:block [&_input]:w-full [&_input]:[border:1px_solid_#e8dfe0] [&_input]:bg-white [&_input]:rounded-[6px] [&_input]:min-h-[45px] [&_input]:[padding:11px_13px] [&_input]:[color:#453438] [&_input]:text-[12px] [&_input]:[transition:border_0.2s,_box-shadow_0.2s] [&_textarea]:block [&_textarea]:w-full [&_textarea]:[border:1px_solid_#e8dfe0] [&_textarea]:bg-white [&_textarea]:rounded-[6px] [&_textarea]:min-h-[45px] [&_textarea]:[padding:11px_13px] [&_textarea]:[color:#453438] [&_textarea]:text-[12px] [&_textarea]:[transition:border_0.2s,_box-shadow_0.2s] [&_textarea]:resize-y [&_select]:block [&_select]:w-full [&_select]:[border:1px_solid_#e8dfe0] [&_select]:bg-white [&_select]:rounded-[6px] [&_select]:min-h-[45px] [&_select]:[padding:11px_13px] [&_select]:[color:#453438] [&_select]:text-[12px] [&_select]:[transition:border_0.2s,_box-shadow_0.2s] [&_input::placeholder]:[color:#b3a6aa] [&_textarea::placeholder]:[color:#b3a6aa] [&_input:focus]:[border-color:#ad7b82] [&_input:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_input:focus]:[outline:none] [&_textarea:focus]:[border-color:#ad7b82] [&_textarea:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_textarea:focus]:[outline:none] [&_select:focus]:[border-color:#ad7b82] [&_select:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_select:focus]:[outline:none] [&_small]:block [&_small]:[color:#95868a] [&_small]:text-[10px] [&_small]:mt-[5px] [&_small]:font-normal">
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
            <label className={`upload-box flex items-center justify-center flex-col relative [border:1px_dashed_#cdb4bc] [background:#fcf8f9] rounded-[8px] [padding:26px_15px] [color:#a07682] cursor-pointer text-center [&_strong]:font-medium [&_strong]:text-[12px] [&_strong]:mt-[10px] [&_span]:text-[9px] [&_span]:[color:#b29aa3] [&_span]:mt-[5px] [&_input]:absolute [&_input]:inset-[0] [&_input]:opacity-[0] [&_input]:w-full [&_input]:h-full [&_input]:cursor-pointer [&:focus-within]:[outline:3px_solid_#c68b96] [&:focus-within]:[outline-offset:3px] ${uploading ? "disabled" : ""}`}>
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
            <ul className="document-list list-none p-0 [margin:15px_0] [&_li]:flex [&_li]:items-center [&_li]:gap-[10px] [&_li]:mb-[10px] [&_li]:text-[11px] [&_li]:[color:#7d626c] [&_li]:[border-bottom:1px_solid_#eee4e8] [&_li]:pb-[10px] [&_li_>_span]:flex-1 [&_li_>_span]:[overflow-wrap:anywhere] [&_small]:block [&_small]:text-[9px] [&_small]:[color:#ad949e] [&_button]:border-0 [&_button]:bg-transparent [&_button]:[color:#a78591] [&_button]:[padding:7px]">
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
            <div className="info-box [border:1px_solid_#eaddd2] [background:#fcf8f2] rounded-[7px] [padding:15px] text-[12px] [color:#96785c] [margin:18px_0] [&_p]:mt-[6px]">
              After email verification, your account will be pending admin
              approval. You can sign in to check your status.
            </div>
          </>
        )}
        <div className="step-actions flex gap-[12px] items-center mt-[20px] [&_.primary-button]:flex-1">
          {step > 0 && (
            <button
              type="button"
              className="secondary-button [border:1px_solid_#dfd2d6] bg-white [color:#83656f] [padding:11px_15px] min-h-[43px] rounded-[6px] inline-flex items-center justify-center gap-[7px] text-[11px] [&:hover:not(:disabled)]:[background:#f8f2f3]"
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
      <p className="signup-prompt text-[11px] text-center mt-[23px] [&_a]:[color:#8c414e] [&_a]:font-semibold [&_a]:inline-flex [&_a]:items-center [&_a]:gap-[4px] [&_a]:ml-[3px]">
        Already part of MarryNest? <Link to="/auth/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
