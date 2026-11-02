import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  LifeBuoy,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Tags,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { readyToSubmit } from "../services/onboarding.validation";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Field, ErrorBox } from "../../auth/components/FormControls";
import { useAuth } from "../../../context/AuthContext";
import {
  vendorRequest,
  save,
  readFile,
  download,
} from "../services/workspace.api";

const documentTypes = [
  "Business Registration",
  "GST",
  "PAN",
  "Identity Proof",
  "Address Proof",
  "Other Supporting Document",
];
const blank = {
  businessName: "",
  businessDescription: "",
  businessEmail: "",
  businessPhone: "",
  gst: "",
  pan: "",
  categories: [],
  location: {
    address: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
    latitude: null,
    longitude: null,
  },
};

function SectionHeading({ section, index }) {
  const Icon = section.icon;
  return (
    <div className="vo-section-heading flex items-center [gap:12px] [&_h2]:[font-family:Georgia,_serif] [&_h2]:[font-size:23px] [&_h2]:font-normal [&_h2]:[letter-spacing:-0.35px] [&_h2]:[line-height:1.3] [&_h2]:[margin:1px_0_0] [&_h2]:[color:#5b414b] max-[480px]:[&_h2]:[font-size:21px] max-[480px]:[gap:10px]">
      <span className="vo-section-icon grid place-items-center [width:41px] [height:43px] [background:#f8f0f2] [color:#a16b79] [border-radius:10px] shrink-0 max-[480px]:[width:35px] max-[480px]:[height:39px]">
        <Icon size={21} strokeWidth={1.7} />
      </span>
      <div>
        <span className="vo-overline [font-size:8px] [letter-spacing:1.3px] font-semibold [color:#b1939d]">
          STEP 0{index + 1}
        </span>
        <h2>{section.title}</h2>
      </div>
      {section.complete && (
        <span className="vo-section-complete ml-auto inline-flex items-center [gap:4px] [font-size:9px] [color:#748e67] max-[480px]:[font-size:0]">
          <Check size={14} /> Complete
        </span>
      )}
    </div>
  );
}

export default function VendorOnboardingPage() {
  const { user, notify, reload } = useAuth();
  const [profile, setProfile] = useState(null),
    [fields, setFields] = useState(blank);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [type, setType] = useState(documentTypes[0]),
    [number, setNumber] = useState("");
  const [retry, setRetry] = useState(0);
  const [lastSaved, setLastSaved] = useState("");
  useEffect(() => {
    let live = true;
    vendorRequest("/onboarding")
      .then((data) => {
        if (!live) return;
        setProfile(data);
        setFields({
          ...blank,
          businessEmail: user.email,
          businessPhone: user.phone || "",
          ...data.fields,
          location: { ...blank.location, ...data.fields.location },
        });
        setError("");
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [user.id, user.email, user.phone, retry]);
  async function refreshProfile() {
    const data = await vendorRequest("/onboarding");
    setProfile(data);
  }
  async function action(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function persist(submit) {
    await action(async () => {
      const result = await save(
        submit ? "/onboarding/submit" : "/onboarding",
        submit ? "POST" : "PUT",
        { ...fields, expectedUpdatedAt: profile.updatedAt },
      );
      notify(result.message);
      setLastSaved(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      await refreshProfile();
      await reload();
    });
  }
  const update = (name, value) =>
    setFields((old) => ({ ...old, [name]: value }));
  function field(name, label, maxLength, inputType = "text") {
    return (
      <Field
        key={name}
        label={label}
        type={inputType}
        value={fields[name]}
        maxLength={maxLength}
        onChange={(e) => update(name, e.target.value)}
        disabled={busy || !profile.editable}
      />
    );
  }
  const businessComplete =
    fields.businessName.trim().length >= 2 &&
    fields.businessDescription.trim().length >= 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.businessEmail.trim()) &&
    /^\+?[1-9]\d{7,14}$/.test(fields.businessPhone.trim());
  const sections = [
    {
      id: "business",
      title: "Business details",
      subtitle: "Introduce your business",
      icon: Building2,
      complete: businessComplete,
    },
    {
      id: "services",
      title: "Service categories",
      subtitle: "What you bring to celebrations",
      icon: Tags,
      complete: fields.categories.length > 0,
    },
    {
      id: "location",
      title: "Business location",
      subtitle: "Where couples can find you",
      icon: MapPin,
      complete: ["address", "city", "state", "country", "postalCode"].every(
        (key) => fields.location[key].trim(),
      ),
    },
    {
      id: "documents",
      title: "Verification documents",
      subtitle: "Build trust with your documents",
      icon: FileCheck2,
      complete:
        !!profile?.documents.length &&
        profile.documents.every((doc) => doc.status !== "Rejected"),
    },
  ];
  const completed = sections.filter((section) => section.complete).length;
  const ready = !!profile && readyToSubmit(fields, profile.documents);
  const reviewing =
    profile &&
    !profile.editable &&
    ["Pending", "UnderReview"].includes(profile.status);
  const statusLabel = profile?.editable
    ? profile.status === "Rejected"
      ? "Changes requested"
      : "Profile in progress"
    : profile?.status === "Pending"
      ? "Pending approval"
      : profile?.status === "UnderReview"
        ? "Under review"
        : profile?.status;
  return (
    <div className="vendor-onboarding [background:#faf8f6] [color:#46363a] min-h-screen [font-size:13px] [line-height:1.65] [&_*]:box-border [&_fieldset]:border-0 [&_fieldset]:p-0 [&_fieldset]:m-0 [&_fieldset]:min-w-0 [&_button:disabled]:[opacity:0.5] [&_button:disabled]:cursor-not-allowed [&_fieldset:disabled]:[opacity:0.75] [&_:is(button,a,input,select):focus-visible]:[outline:2px_solid_#ae7e8e] [&_:is(button,a,input,select):focus-visible]:[outline-offset:3px] motion-reduce:[&_*]:[animation:none]! motion-reduce:[&_*]:[transition:none]! motion-reduce:[&_*::before]:[animation:none]! motion-reduce:[&_*::before]:[transition:none]! motion-reduce:[&_*::after]:[animation:none]! motion-reduce:[&_*::after]:[transition:none]!">
      <main
        id="main-content"
        className="vo-container [max-width:1280px] m-auto [padding:46px_40px_24px] max-[1100px]:[padding:32px_26px_22px] max-[480px]:[padding:26px_15px_18px]"
      >
        <header className="vo-header flex items-center justify-between [gap:24px] [margin-bottom:28px] [&_h1]:[font-family:Georgia,_serif] [&_h1]:font-normal [&_h1]:[font-size:clamp(30px,_3.3vw,_43px)] [&_h1]:[letter-spacing:-1.6px] [&_h1]:[line-height:1.2] [&_h1]:[margin:12px_0] [&_h1]:[color:#413036] [&_h1_>_span]:[color:#ad7d87] [&_p]:m-0 [&_p]:[color:#8c7c80] [&_p]:[font-size:12px] max-[800px]:items-start max-[480px]:[gap:10px] max-[480px]:[margin-bottom:22px] max-[480px]:[&_h1]:[font-size:30px] max-[480px]:[&_h1]:[letter-spacing:-1px] max-[480px]:[&_p]:[font-size:11px] max-[480px]:[&_p]:[line-height:1.8]">
          <div>
            <span className="vo-eyebrow flex items-center [gap:9px] [font-size:9px] font-semibold [letter-spacing:2px] [color:#8c414e] [&_>_span]:[width:6px] [&_>_span]:[height:6px] [&_>_span]:[border-radius:50%] [&_>_span]:[background:#b88790] max-[480px]:[font-size:8px] max-[480px]:[letter-spacing:1.4px]">
              <span /> YOUR PARTNER WORKSPACE
            </span>
            <h1>
              Vendor Dashboard<span>.</span>
            </h1>
            <p>
              Welcome, {user.firstName}. Let's get your business ready for
              beautiful celebrations.
            </p>
          </div>
          <Link
            className="vo-profile-link flex items-center [gap:11px] [border:1px_solid_#eee4e5] bg-white [padding:11px_14px] [border-radius:11px] no-underline [color:#46363a] whitespace-nowrap [font-size:12px] [&_small]:block [&_small]:[color:#8c7c80] [&_small]:[font-size:10px] [&_>_svg]:[color:#b49ba3] [&_>_svg]:[margin-left:9px] max-[800px]:[padding:9px] max-[800px]:[&_>_span:nth-child(2)]:hidden max-[800px]:[&_>_svg]:[margin-left:0] max-[480px]:border-0 max-[480px]:p-0 max-[480px]:bg-transparent max-[480px]:[margin-top:22px] max-[480px]:[&_>_svg]:hidden"
            to="/vendor/profile"
          >
            <span className="vo-avatar grid place-items-center [width:36px] [height:36px] [border-radius:50%] [background:#f5e9ec] [color:#8c414e] [font-family:Georgia,_serif] [font-size:19px] max-[480px]:[width:31px] max-[480px]:[height:31px]">
              {user.firstName?.charAt(0)}
            </span>
            <span>
              My profile<small>Personal details & photo</small>
            </span>
            <ChevronRight size={16} />
          </Link>
        </header>
        <ErrorBox message={error} />
        {!profile ? (
          <div className="vo-loading flex flex-col items-center [gap:12px] [padding:65px_20px] [border:1px_solid_#eee4e5] [border-radius:12px] bg-white text-center [color:#a07b8b] [&_h2]:[font-family:Georgia,_serif] [&_h2]:[font-size:25px] [&_h2]:[color:#765363] [&_h2]:font-normal [&_p]:[font-size:12px]">
            <ShieldCheck size={30} />
            <h2>Your business journey starts here</h2>
            <p>
              {error
                ? "We couldn't load your profile. Please try again."
                : "Getting your profile ready..."}
            </p>
            <button
              className="vo-button inline-flex items-center justify-center [gap:7px] [min-height:42px] [padding:10px_13px] [font-size:10px] font-medium [border:1px_solid_transparent] [border-radius:6px] cursor-pointer [transition:background_0.2s,_box-shadow_0.2s] whitespace-nowrap max-[480px]:[font-size:9px] max-[480px]:[padding:10px_8px] max-[480px]:[gap:5px] vo-secondary [border-color:#e2d4dc] [color:#997384] bg-white [&:hover:not(:disabled)]:[background:#fbf6f8]"
              onClick={() => setRetry((v) => v + 1)}
            >
              <RefreshCw size={16} /> Retry loading
            </button>
          </div>
        ) : (
          <>
            <section
              className={`vo-status flex items-center [gap:20px] [padding:25px_27px] [border:1px_solid_#eadbd7] [border-radius:13px] [background:linear-gradient(110deg,_#f6eeea,_#fcf8f4)] [margin-bottom:28px] [&_h2]:[font-size:20px] [&_h2]:[font-family:Georgia,_serif] [&_h2]:font-normal [&_h2]:[letter-spacing:-0.3px] [&_h2]:[margin:5px_0_6px] [&_h2]:[line-height:1.35] [&_h2]:[color:#694d49] [&_p]:[font-size:11px] [&_p]:[line-height:1.85] [&_p]:[color:#977e76] [&_p]:m-0 [&_p]:[max-width:630px] [&_.vo-rejection-reason]:[margin-top:10px] [&_.vo-rejection-reason]:[color:#984b58] max-[800px]:[padding:20px] max-[800px]:flex-wrap max-[800px]:[gap:14px] max-[480px]:[margin-bottom:20px] max-[480px]:[padding:17px] max-[480px]:[gap:11px] max-[480px]:[&_h2]:[font-size:18px] ${profile.status === "Rejected" ? "vo-status-rejected [border-color:#eacbd1]! [background:#fcf0f2]!" : ""}`}
              aria-label="Verification status"
            >
              <span className="vo-status-icon grid place-items-center shrink-0 [width:57px] [height:65px] [border-radius:15px] [background:#fff9f5] [color:#a77b65] [border:1px_solid_#eddfd5] max-[800px]:[width:43px] max-[800px]:[height:50px] max-[480px]:hidden">
                {reviewing ? (
                  <Clock3 size={26} strokeWidth={1.5} />
                ) : (
                  <ShieldCheck size={27} strokeWidth={1.5} />
                )}
              </span>
              <div className="vo-status-copy flex-1 min-w-0 max-[800px]:[flex-basis:calc(100%_-_60px)] max-[480px]:[flex-basis:100%]">
                <span className="vo-status-label [font-size:9px] [letter-spacing:1px] uppercase [color:#9e7867] font-semibold">
                  {statusLabel}
                </span>
                <h2>
                  {profile.editable
                    ? profile.status === "Rejected"
                      ? "A few updates, then you're ready to reapply."
                      : "Your next chapter starts with a complete profile."
                    : reviewing
                      ? "Your profile is with our verification team."
                      : "Your account needs attention."}
                </h2>
                <p>
                  {profile.editable
                    ? "Tell us about your business, choose your services and upload your documents. You can save your progress and return whenever you're ready."
                    : reviewing
                      ? "Your application has been submitted successfully. We'll notify you when our team has reviewed your details."
                      : "Review the account information below or reach out to our support team."}
                </p>
                {profile.reason && (
                  <p className="vo-rejection-reason">
                    <strong>Admin feedback:</strong> {profile.reason}
                  </p>
                )}
              </div>
              <button
                className="vo-refresh inline-flex items-center justify-center [gap:8px] [padding:9px_12px] [background:#fff9] [border:1px_solid_#e5d6ce] [border-radius:7px] [font-size:10px] [color:#947467] whitespace-nowrap max-[800px]:[margin-left:57px] max-[480px]:[margin-left:0]"
                type="button"
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    await refreshProfile();
                    await reload();
                  })
                }
              >
                <RefreshCw
                  size={16}
                  className={busy ? "vo-spin animate-spin" : ""}
                />
                <span>Refresh status</span>
              </button>
            </section>
            <div className="vo-workspace grid [grid-template-columns:268px_minmax(0,_1fr)] items-start [gap:26px] max-[1100px]:[grid-template-columns:235px_minmax(0,_1fr)] max-[1100px]:[gap:20px] max-[800px]:[grid-template-columns:minmax(0,_1fr)]">
              <aside className="vo-sidebar sticky [top:24px] grid [gap:17px] max-[800px]:[position:static]">
                <div className="vo-progress-card bg-white [border:1px_solid_#eee4e5] [border-radius:12px] [padding:23px_20px_0] overflow-hidden [&_>_p]:[font-size:10px] [&_>_p]:[color:#8c7c80] [&_>_p]:[margin:8px_0_22px] [&_nav]:grid [&_nav]:[gap:5px] [&_nav]:[margin-bottom:20px] [&_nav_a]:flex [&_nav_a]:[gap:11px] [&_nav_a]:items-center [&_nav_a]:[padding:10px_0] [&_nav_a]:[font-size:11px] [&_nav_a]:no-underline [&_nav_a]:[color:#604b52] [&_nav_a_>_span:nth-child(2)]:flex-1 [&_nav_a_small]:block [&_nav_a_small]:[color:#a29599] [&_nav_a_small]:[font-size:9px] [&_nav_a_small]:[margin-top:2px] [&_nav_a_>_svg]:[color:#baaab0] max-[800px]:[padding-top:17px] max-[800px]:[&_nav]:[grid-template-columns:repeat(4,_minmax(0,_1fr))] max-[800px]:[&_nav]:[gap:12px] max-[800px]:[&_nav]:[margin-bottom:13px] max-[800px]:[&_nav_a]:items-start max-[800px]:[&_nav_a]:flex-col max-[800px]:[&_nav_a]:[gap:7px] max-[800px]:[&_nav_a]:[font-size:10px] max-[800px]:[&_nav_a_>_svg]:hidden max-[800px]:[&_nav_a_small]:hidden max-[800px]:[&_>_p]:[margin-bottom:7px] max-[480px]:[padding-left:16px] max-[480px]:[padding-right:16px] max-[480px]:[&_nav]:[gap:8px]">
                  <div className="vo-progress-top flex items-center justify-between [&_>_span]:[font-size:9px] [&_>_span]:font-semibold [&_>_span]:[letter-spacing:1.2px] [&_>_span]:[color:#8e747c] [&_strong]:[font-size:17px] [&_strong]:[color:#8c414e] [&_strong]:font-medium">
                    <span>PROFILE COMPLETION</span>
                    <strong>{completed * 25}%</strong>
                  </div>
                  <div
                    className="vo-progress-track [height:5px] [background:#f1e8eb] [border-radius:5px] overflow-hidden [margin-top:12px] [&_>_span]:block [&_>_span]:h-full [&_>_span]:[background:#9d5c6a] [&_>_span]:[border-radius:inherit] [&_>_span]:[transition:width_0.3s]"
                    role="progressbar"
                    aria-label="Profile sections completed"
                    aria-valuenow={completed}
                    aria-valuemin={0}
                    aria-valuemax={4}
                  >
                    <span className={["w-0", "w-1/4", "w-1/2", "w-3/4", "w-full"][completed]} />
                  </div>
                  <p>{completed} of 4 sections complete</p>
                  <nav aria-label="Profile sections">
                    {sections.map((section, i) => (
                      <a key={section.id} href={`#vo-${section.id}`}>
                        <span
                          className={
                            section.complete
                              ? "vo-step-number grid place-items-center [width:30px] [height:30px] [border-radius:9px] [border:1px_solid_#e9dce1] [background:#fcf8f9] [color:#a77e8a] [font-size:10px] shrink-0 [&.is-complete]:[background:#edf3eb] [&.is-complete]:[border-color:#e1e9dd] [&.is-complete]:[color:#6d8a60] is-complete"
                              : "vo-step-number grid place-items-center [width:30px] [height:30px] [border-radius:9px] [border:1px_solid_#e9dce1] [background:#fcf8f9] [color:#a77e8a] [font-size:10px] shrink-0 [&.is-complete]:[background:#edf3eb] [&.is-complete]:[border-color:#e1e9dd] [&.is-complete]:[color:#6d8a60]"
                          }
                        >
                          {section.complete ? <Check size={14} /> : `0${i + 1}`}
                        </span>
                        <span>
                          {section.title}
                          <small>
                            {section.complete ? "All set" : section.subtitle}
                          </small>
                        </span>
                        <ChevronRight size={14} />
                      </a>
                    ))}
                  </nav>
                  <div className="vo-autosave-note flex items-center justify-center [gap:7px] [margin:0_-20px] [padding:13px_12px] [background:#fbf9fa] [border-top:1px_solid_#f2ebee] [color:#a08c94] [font-size:9px] max-[480px]:[margin:0_-16px]">
                    <Save size={14} />
                    <span>
                      {lastSaved
                        ? `Progress saved at ${lastSaved}`
                        : "Save your progress at any time"}
                    </span>
                  </div>
                </div>
                <div className="vo-trust-card [padding:23px_21px] [border:1px_solid_#e9e5dc] [border-radius:12px] [background:#f2f2eb] [&_h3]:[font-family:Georgia,_serif] [&_h3]:[font-size:21px] [&_h3]:font-normal [&_h3]:[color:#667157] [&_h3]:[line-height:1.4] [&_h3]:[margin:14px_0_10px] [&_p]:[font-size:11px] [&_p]:[color:#919582] [&_p]:[line-height:1.8] [&_p]:[margin-bottom:16px] [&_>_div]:flex [&_>_div]:[gap:6px] [&_>_div]:items-center [&_>_div]:[color:#7e876d] [&_>_div]:[font-size:9px] [&_>_div]:[padding-top:14px] [&_>_div]:[border-top:1px_solid_#e3e6d9] max-[800px]:hidden">
                  <span className="vo-trust-icon grid place-items-center [background:#e6eadf] [width:36px] [height:36px] [color:#7e8b6c] [border-radius:10px]">
                    <LockKeyhole size={20} strokeWidth={1.6} />
                  </span>
                  <h3>
                    A little verification.
                    <br />A lot more trust.
                  </h3>
                  <p>
                    Once approved, you can upload services and start connecting
                    with couples.
                  </p>
                  <div>
                    <ShieldCheck size={14} /> Your documents are stored securely
                  </div>
                </div>
                <Link
                  className="vo-help-link flex items-center [gap:10px] [color:#947b85] [font-size:11px] no-underline [padding:8px_10px] [&_>_span]:flex-1 [&_small]:block [&_small]:[color:#ac9ca3] [&_small]:[font-size:10px] max-[800px]:hidden"
                  to="/contact"
                >
                  <LifeBuoy size={18} />
                  <span>
                    Need a hand?<small>We're here to help</small>
                  </span>
                  <ArrowRight size={15} />
                </Link>
              </aside>
              <form
                className="vo-form min-w-0 grid [gap:21px]"
                onSubmit={(e) => {
                  e.preventDefault();
                  persist(true);
                }}
              >
                <section
                  id="vo-business"
                  className="vo-card min-w-0 [border:1px_solid_#eee4e5] bg-white [border-radius:12px] [padding:26px_28px] [scroll-margin-top:25px] [box-shadow:0_3px_15px_#49303902] [&_.field]:[font-size:11px] [&_.field]:[color:#7d646e] [&_.field]:font-medium [&_.field]:[margin-bottom:19px] [&_.field_input]:[min-height:44px] [&_.field_input]:[font-size:12px] [&_.field_input]:[border-color:#e9e1e4] [&_.field_input]:[border-radius:7px] [&_.field_input]:bg-white [&_.field_input]:[color:#5e4851] [&_.field_input]:[padding:11px_13px] [&_.field_input:focus]:[border-color:#af7b8a] [&_.field_input:focus]:[box-shadow:0_0_0_3px_#8c414e0b] [&_.field_input:focus]:outline-none max-[1100px]:[padding:22px] max-[480px]:[padding:21px_17px]"
                >
                  <SectionHeading section={sections[0]} index={0} />
                  <p className="vo-section-description [margin:15px_0_23px] [font-size:11px] [color:#a08f95] [&_>_span]:block [&_>_span]:[margin-top:5px] [&_>_span]:[font-size:9px] [&_>_span]:[color:#af9da4]">
                    Help us get to know the business behind the celebrations.{" "}
                    <span>* Required fields</span>
                  </p>
                  <fieldset
                    disabled={busy || !profile.editable}
                    aria-label="Business details"
                  >
                    <div className="vo-field-grid grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:0_18px] max-[480px]:[grid-template-columns:minmax(0,_1fr)]">
                      {field("businessName", "Business name *", 200)}
                      {field("businessEmail", "Business email *", 320, "email")}
                      {field("businessPhone", "Business phone *", 20, "tel")}
                      <div className="vo-field-note flex items-center [gap:10px] [color:#b3a1a9] [padding:21px_5px_16px] [&_>_svg]:shrink-0 [&_p]:m-0 [&_p]:[font-size:10px] [&_p]:[max-width:205px] [&_p]:[line-height:1.7] max-[480px]:hidden">
                        <UserRound size={17} />
                        <p>
                          Use the contact details you'd like associated with
                          your business.
                        </p>
                      </div>
                    </div>
                    <label className="vo-textarea-label block [font-size:11px] [color:#7d646e] font-medium [&_textarea]:block [&_textarea]:w-full [&_textarea]:[border:1px_solid_#e9e1e4] [&_textarea]:[border-radius:7px] [&_textarea]:bg-white [&_textarea]:[font-size:12px] [&_textarea]:[padding:12px_13px] [&_textarea]:[margin-top:7px] [&_textarea]:[color:#5e4851] [&_textarea]:[min-height:108px] [&_textarea]:resize-y [&_textarea]:[line-height:1.8] [&_textarea::placeholder]:[color:#baaab0] [&_textarea:focus]:outline-none [&_textarea:focus]:[border-color:#af7b8a] [&_textarea:focus]:[box-shadow:0_0_0_3px_#8c414e0b] [&_>_small]:flex [&_>_small]:justify-between [&_>_small]:[gap:10px] [&_>_small]:[font-size:9px] [&_>_small]:[color:#b2a1a9] [&_>_small]:[margin-top:7px] [&_>_small]:font-normal">
                      <span>Business description *</span>
                      <textarea
                        rows={4}
                        maxLength={5000}
                        placeholder="Tell us what you do, your experience and what makes your business special..."
                        value={fields.businessDescription}
                        onChange={(e) =>
                          update("businessDescription", e.target.value)
                        }
                      />
                      <small>
                        <span>At least 10 characters</span>
                        <span>
                          {fields.businessDescription.length.toLocaleString()} /
                          5,000
                        </span>
                      </small>
                    </label>
                    <div className="vo-field-grid grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:0_18px] max-[480px]:[grid-template-columns:minmax(0,_1fr)] vo-tax-fields [margin-top:23px] [padding-top:19px] [border-top:1px_solid_#f2ecee] [&_.field]:[margin-bottom:0]! max-[480px]:[gap:17px]">
                      {field("gst", "GST number (optional)", 50)}
                      {field("pan", "PAN number (optional)", 20)}
                    </div>
                  </fieldset>
                </section>
                <section
                  id="vo-services"
                  className="vo-card min-w-0 [border:1px_solid_#eee4e5] bg-white [border-radius:12px] [padding:26px_28px] [scroll-margin-top:25px] [box-shadow:0_3px_15px_#49303902] [&_.field]:[font-size:11px] [&_.field]:[color:#7d646e] [&_.field]:font-medium [&_.field]:[margin-bottom:19px] [&_.field_input]:[min-height:44px] [&_.field_input]:[font-size:12px] [&_.field_input]:[border-color:#e9e1e4] [&_.field_input]:[border-radius:7px] [&_.field_input]:bg-white [&_.field_input]:[color:#5e4851] [&_.field_input]:[padding:11px_13px] [&_.field_input:focus]:[border-color:#af7b8a] [&_.field_input:focus]:[box-shadow:0_0_0_3px_#8c414e0b] [&_.field_input:focus]:outline-none max-[1100px]:[padding:22px] max-[480px]:[padding:21px_17px]"
                >
                  <SectionHeading section={sections[1]} index={1} />
                  <p className="vo-section-description [margin:15px_0_23px] [font-size:11px] [color:#a08f95] [&_>_span]:block [&_>_span]:[margin-top:5px] [&_>_span]:[font-size:9px] [&_>_span]:[color:#af9da4]">
                    Choose all the categories your business offers.
                  </p>
                  <fieldset
                    disabled={busy || !profile.editable}
                    aria-label="Service categories"
                  >
                    <div className="vo-category-grid grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:10px] max-[480px]:[grid-template-columns:minmax(0,_1fr)]">
                      {profile.categories.map((category) => (
                        <label
                          key={category}
                          className={`vo-category flex items-center [gap:10px] [padding:12px] [border:1px_solid_#ece5e8] [border-radius:7px] [font-size:10px] [color:#8f7b84] cursor-pointer [transition:border-color_0.2s,_background_0.2s] [&.is-selected]:[border-color:#c9a0ad] [&.is-selected]:[background:#fcf4f6] [&.is-selected]:[color:#8c414e] [&_input]:[accent-color:#8c414e] [&_input]:[width:13px] [&_input]:[height:13px] [&_input]:shrink-0 ${fields.categories.includes(category) ? "is-selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={fields.categories.includes(category)}
                            onChange={(e) =>
                              update(
                                "categories",
                                e.target.checked
                                  ? [...fields.categories, category]
                                  : fields.categories.filter(
                                      (c) => c !== category,
                                    ),
                              )
                            }
                          />
                          <span>{category}</span>
                        </label>
                      ))}
                    </div>
                    <p className="vo-selection-count flex items-center [gap:6px] [font-size:10px] [color:#a58b96] [margin:14px_0_0]">
                      <Tags size={13} />{" "}
                      {fields.categories.length
                        ? `${fields.categories.length} ${fields.categories.length === 1 ? "category" : "categories"} selected`
                        : "Select at least one category to continue"}
                    </p>
                  </fieldset>
                </section>
                <section
                  id="vo-location"
                  className="vo-card min-w-0 [border:1px_solid_#eee4e5] bg-white [border-radius:12px] [padding:26px_28px] [scroll-margin-top:25px] [box-shadow:0_3px_15px_#49303902] [&_.field]:[font-size:11px] [&_.field]:[color:#7d646e] [&_.field]:font-medium [&_.field]:[margin-bottom:19px] [&_.field_input]:[min-height:44px] [&_.field_input]:[font-size:12px] [&_.field_input]:[border-color:#e9e1e4] [&_.field_input]:[border-radius:7px] [&_.field_input]:bg-white [&_.field_input]:[color:#5e4851] [&_.field_input]:[padding:11px_13px] [&_.field_input:focus]:[border-color:#af7b8a] [&_.field_input:focus]:[box-shadow:0_0_0_3px_#8c414e0b] [&_.field_input:focus]:outline-none max-[1100px]:[padding:22px] max-[480px]:[padding:21px_17px]"
                >
                  <SectionHeading section={sections[2]} index={2} />
                  <p className="vo-section-description [margin:15px_0_23px] [font-size:11px] [color:#a08f95] [&_>_span]:block [&_>_span]:[margin-top:5px] [&_>_span]:[font-size:9px] [&_>_span]:[color:#af9da4]">
                    Add your primary business address for verification.
                  </p>
                  <fieldset
                    disabled={busy || !profile.editable}
                    aria-label="Business location"
                  >
                    <div className="vo-field-grid grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:0_18px] max-[480px]:[grid-template-columns:minmax(0,_1fr)]">
                      {[
                        ["address", "Street address", 300],
                        ["city", "City", 100],
                        ["state", "State", 100],
                        ["country", "Country", 100],
                        ["postalCode", "Postal code", 20],
                      ].map(([name, label, maxLength]) => (
                        <div
                          key={name}
                          className={
                            name === "address"
                              ? "vo-full-width [grid-column:1_/_-1]"
                              : undefined
                          }
                        >
                          <Field
                            label={`${label} *`}
                            value={fields.location[name]}
                            maxLength={maxLength}
                            onChange={(e) =>
                              update("location", {
                                ...fields.location,
                                [name]: e.target.value,
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <details className="vo-coordinates [border-top:1px_solid_#f2ecee] [margin-top:2px] [padding-top:14px] [&_summary]:cursor-pointer [&_summary]:[font-size:11px] [&_summary]:[color:#9b7a88] [&_summary_>_span]:[font-size:9px] [&_summary_>_span]:[color:#b5a3ab] [&_summary_>_span]:[margin-left:5px] [&[open]_summary]:[margin-bottom:16px]">
                      <summary>
                        Map coordinates <span>Optional</span>
                      </summary>
                      <div className="vo-field-grid grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:0_18px] max-[480px]:[grid-template-columns:minmax(0,_1fr)]">
                        {["latitude", "longitude"].map((name) => (
                          <Field
                            key={name}
                            label={
                              name === "latitude" ? "Latitude" : "Longitude"
                            }
                            type="number"
                            step="any"
                            min={name === "latitude" ? -90 : -180}
                            max={name === "latitude" ? 90 : 180}
                            value={fields.location[name] ?? ""}
                            onChange={(e) =>
                              update("location", {
                                ...fields.location,
                                [name]:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              })
                            }
                          />
                        ))}
                      </div>
                    </details>
                  </fieldset>
                </section>
                <section
                  id="vo-documents"
                  className="vo-card min-w-0 [border:1px_solid_#eee4e5] bg-white [border-radius:12px] [padding:26px_28px] [scroll-margin-top:25px] [box-shadow:0_3px_15px_#49303902] [&_.field]:[font-size:11px] [&_.field]:[color:#7d646e] [&_.field]:font-medium [&_.field]:[margin-bottom:19px] [&_.field_input]:[min-height:44px] [&_.field_input]:[font-size:12px] [&_.field_input]:[border-color:#e9e1e4] [&_.field_input]:[border-radius:7px] [&_.field_input]:bg-white [&_.field_input]:[color:#5e4851] [&_.field_input]:[padding:11px_13px] [&_.field_input:focus]:[border-color:#af7b8a] [&_.field_input:focus]:[box-shadow:0_0_0_3px_#8c414e0b] [&_.field_input:focus]:outline-none max-[1100px]:[padding:22px] max-[480px]:[padding:21px_17px]"
                >
                  <SectionHeading section={sections[3]} index={3} />
                  <p className="vo-section-description [margin:15px_0_23px] [font-size:11px] [color:#a08f95] [&_>_span]:block [&_>_span]:[margin-top:5px] [&_>_span]:[font-size:9px] [&_>_span]:[color:#af9da4]">
                    Upload at least one document to verify your business or
                    identity.
                  </p>
                  {profile.editable && (
                    <>
                      <div className="vo-field-grid grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:0_18px] max-[480px]:[grid-template-columns:minmax(0,_1fr)]">
                        <label className="vo-native-field flex flex-col [gap:7px] [font-size:11px] [color:#7d646e] [margin-bottom:19px] [&_small]:[color:#b09ba5] [&_small]:[font-size:10px] [&_:is(select,input)]:w-full [&_:is(select,input)]:min-w-0 [&_:is(select,input)]:bg-white [&_:is(select,input)]:[border:1px_solid_#e9e1e4] [&_:is(select,input)]:[padding:11px_12px] [&_:is(select,input)]:[min-height:44px] [&_:is(select,input)]:[border-radius:7px] [&_:is(select,input)]:[color:#79626c] [&_:is(select,input)]:[font-size:11px] [&_input::placeholder]:[color:#baaab0]">
                          <span>Document type</span>
                          <select
                            disabled={busy}
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                          >
                            {documentTypes.map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                        </label>
                        <label className="vo-native-field flex flex-col [gap:7px] [font-size:11px] [color:#7d646e] [margin-bottom:19px] [&_small]:[color:#b09ba5] [&_small]:[font-size:10px] [&_:is(select,input)]:w-full [&_:is(select,input)]:min-w-0 [&_:is(select,input)]:bg-white [&_:is(select,input)]:[border:1px_solid_#e9e1e4] [&_:is(select,input)]:[padding:11px_12px] [&_:is(select,input)]:[min-height:44px] [&_:is(select,input)]:[border-radius:7px] [&_:is(select,input)]:[color:#79626c] [&_:is(select,input)]:[font-size:11px] [&_input::placeholder]:[color:#baaab0]">
                          <span>
                            Document number <small>(optional)</small>
                          </span>
                          <input
                            disabled={busy}
                            placeholder="Enter document number"
                            value={number}
                            maxLength={100}
                            onChange={(e) => setNumber(e.target.value)}
                          />
                        </label>
                      </div>
                      <label
                        className={`vo-upload relative flex flex-col items-center text-center [padding:26px_15px_22px] [background:#fdf9fa] [border:1px_dashed_#d6b9c3] [border-radius:10px] cursor-pointer overflow-hidden [&_>_strong]:[font-size:12px] [&_>_strong]:[color:#8b5d70] [&_>_strong]:font-medium [&_>_span:not(.vo-upload-icon):not(.vo-upload-button)]:[font-size:10px] [&_>_span:not(.vo-upload-icon):not(.vo-upload-button)]:[color:#b19aa5] [&_>_span:not(.vo-upload-icon):not(.vo-upload-button)]:[margin-top:4px] [&_>_input]:absolute [&_>_input]:[inset:0] [&_>_input]:[opacity:0] [&_>_input]:cursor-pointer [&_>_input]:w-full [&_>_input]:h-full [&:focus-within]:[outline:2px_solid_#9f6a7a] [&:focus-within]:[outline-offset:3px] [&.is-disabled]:[opacity:0.6] [&.is-disabled]:cursor-default ${busy || profile.documents.length >= 6 ? "is-disabled" : ""}`}
                      >
                        <span className="vo-upload-icon grid place-items-center [width:48px] [height:48px] [border-radius:50%] [background:#f6eaf0] [color:#a57384] [margin-bottom:11px]">
                          {busy ? (
                            <LoaderCircle
                              size={25}
                              className="vo-spin animate-spin"
                            />
                          ) : (
                            <UploadCloud size={26} strokeWidth={1.6} />
                          )}
                        </span>
                        <strong>
                          {busy
                            ? "Please wait..."
                            : profile.documents.length >= 6
                              ? "Six documents uploaded"
                              : "Choose a verification document"}
                        </strong>
                        <span>PDF, PNG or JPG / Up to 5 MB per file</span>
                        <span className="vo-upload-button flex items-center [gap:8px] [border:1px_solid_#e4ccd5] [border-radius:6px] bg-white [color:#9a657a] [font-size:10px] [padding:7px_13px] [margin-top:15px]">
                          Browse files <ArrowRight size={14} />
                        </span>
                        <input
                          aria-label="Upload verification document"
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          disabled={busy || profile.documents.length >= 6}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file)
                              action(async () => {
                                const base64 = await readFile(file);
                                const result = await save(
                                  "/onboarding/documents",
                                  "POST",
                                  { type, number, base64 },
                                );
                                notify(result.message);
                                await refreshProfile();
                              });
                          }}
                        />
                      </label>
                    </>
                  )}
                  <div className="vo-document-list-heading flex items-center justify-between [margin-top:23px] [margin-bottom:11px] [&_h3]:[font-size:11px] [&_h3]:[color:#846b77] [&_h3]:font-medium [&_h3]:m-0 [&_>_span]:[font-size:9px] [&_>_span]:[color:#b19aa5]">
                    <h3>Uploaded documents</h3>
                    <span>{profile.documents.length} / 6 files</span>
                  </div>
                  {!profile.documents.length && (
                    <div className="vo-documents-empty flex items-center [gap:9px] [padding:13px] [font-size:10px] [color:#b6a6ad] [background:#fcfafb] [border-radius:7px]">
                      <FileText size={19} />
                      <span>
                        No documents uploaded yet. Your files will appear here.
                      </span>
                    </div>
                  )}
                  <ul className="vo-document-list list-none p-0 m-0 grid [gap:9px] [&_li]:flex [&_li]:items-center [&_li]:[gap:10px] [&_li]:[padding:12px] [&_li]:[border:1px_solid_#eee5e9] [&_li]:[border-radius:8px] max-[480px]:[&_li]:[gap:7px] max-[480px]:[&_li]:[padding:10px_8px]">
                    {profile.documents.map((doc) => (
                      <li key={doc.id}>
                        <span className="vo-file-icon [color:#ad8a99] shrink-0">
                          <FileText size={20} strokeWidth={1.6} />
                        </span>
                        <div className="vo-file-info flex-1 min-w-0 [overflow-wrap:anywhere] [&_strong]:block [&_strong]:font-medium [&_strong]:[font-size:11px] [&_strong]:[color:#7e6270] [&_small]:block [&_small]:[color:#ab96a1] [&_small]:[font-size:9px] [&_.vo-file-reason]:[color:#b26677]">
                          <strong>{doc.type}</strong>
                          {doc.number && <small>{doc.number}</small>}
                          {doc.reason && (
                            <small className="vo-file-reason">
                              {doc.reason}
                            </small>
                          )}
                        </div>
                        <span
                          className={`vo-document-status [padding:3px_7px] [font-size:8px] [border-radius:4px] [background:#faf3e9] [color:#ae9368] [&.is-rejected]:[color:#b5687a] [&.is-rejected]:[background:#fcf0f3] [&.is-approved]:[color:#7f9468] [&.is-approved]:[background:#eff4e9] max-[480px]:[font-size:7px] max-[480px]:[padding:3px_5px] ${doc.status === "Rejected" ? "is-rejected" : doc.status === "Approved" ? "is-approved" : ""}`}
                        >
                          {doc.status}
                        </span>
                        <button
                          title="Download document"
                          aria-label={`Download ${doc.type}`}
                          className="vo-icon-button grid place-items-center border-0 [background:#faf7f8] [color:#9e8190] [padding:7px] [border-radius:5px] [&:hover]:[background:#f2e8ed] max-[480px]:[padding:6px]"
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            action(async () =>
                              download(
                                await vendorRequest(
                                  `/onboarding/documents/${doc.id}/file`,
                                  { download: true },
                                ),
                                doc.type,
                              ),
                            )
                          }
                        >
                          <Download size={16} />
                        </button>
                        {profile.editable && (
                          <button
                            title="Remove document"
                            aria-label={`Remove ${doc.type}`}
                            className="vo-icon-button grid place-items-center border-0 [background:#faf7f8] [color:#9e8190] [padding:7px] [border-radius:5px] [&:hover]:[background:#f2e8ed] max-[480px]:[padding:6px] vo-remove [color:#b17a8a]"
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              action(async () => {
                                const result = await save(
                                  `/onboarding/documents/${doc.id}`,
                                  "DELETE",
                                  {},
                                );
                                notify(result.message);
                                await refreshProfile();
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="vo-document-security flex items-start [gap:7px] [color:#af9ca6] [font-size:9px] [line-height:1.8] [margin:16px_0_0] [&_svg]:shrink-0 [&_svg]:[margin-top:2px]">
                    <LockKeyhole size={13} /> Securely stored and accessible
                    only for verification. Replace rejected documents before
                    resubmitting.
                  </p>
                </section>
                {profile.editable && (
                  <div className="vo-action-bar sticky [bottom:15px] [z-index:5] flex items-center justify-between [gap:18px] [padding:17px_20px] [border:1px_solid_#e6d8df] [border-radius:11px] bg-white [box-shadow:0_8px_32px_#53324312] max-[1100px]:flex-wrap max-[800px]:flex-nowrap max-[480px]:[padding:12px_10px] max-[480px]:[bottom:8px]">
                    <div className="vo-action-copy flex items-center [gap:10px] [color:#a38292] [&_strong]:block [&_strong]:[font-size:10px] [&_strong]:font-medium [&_strong]:[color:#876574] [&_small]:block [&_small]:[color:#b19aa5] [&_small]:[font-size:9px] [&_small]:[margin-top:2px] max-[800px]:hidden">
                      {ready ? <CheckCircle2 size={19} /> : <Save size={19} />}
                      <span>
                        <strong>
                          {ready
                            ? "Your profile is ready to submit"
                            : "Pick up right where you left off"}
                        </strong>
                        <small>
                          {ready
                            ? "Send your details to our team for verification."
                            : "Save now and finish the remaining details later."}
                        </small>
                      </span>
                    </div>
                    <div className="vo-action-buttons flex [gap:9px] shrink-0 max-[1100px]:ml-auto max-[800px]:w-full max-[800px]:[&_>_button]:flex-1 max-[480px]:[gap:7px]">
                      <button
                        type="button"
                        className="vo-button inline-flex items-center justify-center [gap:7px] [min-height:42px] [padding:10px_13px] [font-size:10px] font-medium [border:1px_solid_transparent] [border-radius:6px] cursor-pointer [transition:background_0.2s,_box-shadow_0.2s] whitespace-nowrap max-[480px]:[font-size:9px] max-[480px]:[padding:10px_8px] max-[480px]:[gap:5px] vo-secondary [border-color:#e2d4dc] [color:#997384] bg-white [&:hover:not(:disabled)]:[background:#fbf6f8]"
                        disabled={busy}
                        onClick={() => persist(false)}
                      >
                        <Save size={15} /> Save progress
                      </button>
                      <button
                        className="vo-button inline-flex items-center justify-center [gap:7px] [min-height:42px] [padding:10px_13px] [font-size:10px] font-medium [border:1px_solid_transparent] [border-radius:6px] cursor-pointer [transition:background_0.2s,_box-shadow_0.2s] whitespace-nowrap max-[480px]:[font-size:9px] max-[480px]:[padding:10px_8px] max-[480px]:[gap:5px] vo-primary [background:#8c414e] [color:white] [border-color:#8c414e] [box-shadow:0_3px_6px_#8c414e14] [&:hover:not(:disabled)]:[background:#763542] max-[480px]:[&_>_svg:last-child]:hidden"
                        type="submit"
                        disabled={busy || !ready}
                      >
                        {busy ? (
                          <LoaderCircle
                            className="vo-spin animate-spin"
                            size={16}
                          />
                        ) : (
                          <ShieldCheck size={16} />
                        )}{" "}
                        Submit for verification <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
                {profile.editable && !ready && (
                  <p className="vo-submit-hint [color:#ad96a2] [font-size:10px] text-right [margin:-10px_3px_0] max-[480px]:text-center">
                    Complete all required fields and add your documents to
                    enable submission.
                  </p>
                )}
              </form>
            </div>
            <footer className="vo-footer flex items-center justify-between [gap:14px] [padding-top:27px] [margin-top:28px] [border-top:1px_solid_#eae1e5] [font-size:9px] [color:#b19aa5] [&_>_span:first-child]:flex [&_>_span:first-child]:items-center [&_>_span:first-child]:[gap:7px] max-[480px]:flex-col max-[480px]:[gap:7px] max-[480px]:text-center">
              <span>
                <Sparkles size={14} /> Beautiful celebrations begin with trusted
                partners.
              </span>
              <span>MarryNest Partner Programme</span>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
