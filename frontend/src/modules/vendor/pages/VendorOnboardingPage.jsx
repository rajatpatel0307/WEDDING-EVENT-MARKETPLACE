import VerificationDocuments from "../components/VerificationDocuments";
import {
  ArrowRight,
  Building2,
  Check,
  Clock3,
  FileCheck2,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Tags,
  UserRound,
} from "lucide-react";
import {
  readyToSubmit,
  verificationStepErrors,
} from "../services/onboarding.validation";
import { useEffect, useState } from "react";
import { Field, ErrorBox } from "../../auth/components/FormControls";
import { useAuth } from "../../../context/AuthContext";
import { vendorRequest, save } from "../services/workspace.api";

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
  const [retry, setRetry] = useState(0);
  const [lastSaved, setLastSaved] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [stepErrors, setStepErrors] = useState([]);
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
  }, [user.id, user.email, user.phone, user.vendor?.verificationStatus, retry]);
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
        name={name}
        required={!["gst", "pan"].includes(name)}
        minLength={name === "businessName" ? 2 : undefined}
        type={inputType}
        value={fields[name]}
        maxLength={maxLength}
        onChange={(e) => update(name, e.target.value)}
        disabled={busy || !profile.editable}
      />
    );
  }
  const sections = [
    {
      id: "business",
      title: "Business details",
      subtitle: "Introduce your business",
      icon: Building2,
      complete: !verificationStepErrors(0, fields).length,
    },
    {
      id: "services",
      title: "Service categories",
      subtitle: "What you bring to celebrations",
      icon: Tags,
      complete: !verificationStepErrors(1, fields).length,
    },
    {
      id: "location",
      title: "Business location",
      subtitle: "Where couples can find you",
      icon: MapPin,
      complete: !verificationStepErrors(2, fields).length,
    },
    {
      id: "documents",
      title: "Verification documents",
      subtitle: "Build trust with your documents",
      icon: FileCheck2,
      complete:
        !!profile &&
        !verificationStepErrors(3, fields, profile.documents).length,
    },
  ];
  function openStep(target) {
    if (busy) return;
    if (profile.editable && target > activeStep) {
      for (let step = 0; step < target; step++) {
        const errors = verificationStepErrors(step, fields, profile.documents);
        if (errors.length) {
          setActiveStep(step);
          setStepErrors(errors);
          return;
        }
      }
    }
    setStepErrors([]);
    setActiveStep(target);
  }
  function submitVerification() {
    for (let step = 0; step < 4; step++) {
      const errors = verificationStepErrors(step, fields, profile.documents);
      if (errors.length) {
        setActiveStep(step);
        setStepErrors(errors);
        return;
      }
    }
    setStepErrors([]);
    persist(true);
  }
  const completed = sections.filter((section) => section.complete).length;
  const ready = !!profile && readyToSubmit(fields, profile.documents);
  const reviewing =
    profile &&
    !profile.editable &&
    ["Pending", "UnderReview"].includes(profile.status);
  const rejected = ["Rejected", "Suspended"].includes(profile?.status);
  const approved = profile?.status === "Approved";
  const statusTone = rejected
    ? "border-red-200 bg-red-50 text-red-800"
    : approved
      ? "border-green-200 bg-green-50 text-green-800"
      : "border-yellow-200 bg-yellow-50 text-yellow-800";
  const flowStage = approved ? 2 : rejected || !profile?.incomplete ? 1 : 0;
  const statusFlow = ["Profile submission", "Admin review", "Approved"];
  return (
    <div className="vendor-onboarding [background:#faf8f6] [color:#46363a] [font-size:13px] [line-height:1.65] [&_*]:box-border [&_fieldset]:border-0 [&_fieldset]:p-0 [&_fieldset]:m-0 [&_fieldset]:min-w-0 [&_button:disabled]:[opacity:0.5] [&_button:disabled]:cursor-not-allowed [&_fieldset:disabled]:[opacity:0.75] [&_:is(button,a,input,select):focus-visible]:[outline:2px_solid_#ae7e8e] [&_:is(button,a,input,select):focus-visible]:[outline-offset:3px] motion-reduce:[&_*]:[animation:none]! motion-reduce:[&_*]:[transition:none]! motion-reduce:[&_*::before]:[animation:none]! motion-reduce:[&_*::before]:[transition:none]! motion-reduce:[&_*::after]:[animation:none]! motion-reduce:[&_*::after]:[transition:none]!">
      <div className="vo-container [max-width:1280px] m-auto [padding:46px_40px_24px] max-[1100px]:[padding:32px_26px_22px] max-[480px]:[padding:26px_15px_18px]">
        <header className="vo-header flex items-center justify-between [gap:24px] [margin-bottom:28px] [&_h1]:[font-family:Georgia,_serif] [&_h1]:font-normal [&_h1]:[font-size:clamp(30px,_3.3vw,_43px)] [&_h1]:[letter-spacing:-1.6px] [&_h1]:[line-height:1.2] [&_h1]:[margin:12px_0] [&_h1]:[color:#413036] [&_h1_>_span]:[color:#ad7d87] [&_p]:m-0 [&_p]:[color:#8c7c80] [&_p]:[font-size:12px] max-[800px]:items-start max-[480px]:[gap:10px] max-[480px]:[margin-bottom:22px] max-[480px]:[&_h1]:[font-size:30px] max-[480px]:[&_h1]:[letter-spacing:-1px] max-[480px]:[&_p]:[font-size:11px] max-[480px]:[&_p]:[line-height:1.8]">
          <div>
            <p>
              Welcome, {user.firstName}. Let's get your business ready for
              beautiful celebrations.
            </p>
          </div>
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
              className={`vo-status mb-7 flex flex-wrap items-start gap-5 rounded-xl border p-5 sm:p-7 ${statusTone}`}
              aria-label="Verification status"
            >
              <span className="vo-status-icon grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-current bg-white/60">
                {reviewing ? (
                  <Clock3 size={26} strokeWidth={1.5} />
                ) : (
                  <ShieldCheck size={27} strokeWidth={1.5} />
                )}
              </span>
              <div className="vo-status-copy min-w-0 flex-1 basis-[250px]">
                <h2 className="my-2 font-sans text-lg font-semibold leading-relaxed tracking-normal sm:text-xl">
                  {profile.editable
                    ? profile.status === "Rejected"
                      ? "A few updates, then you're ready to reapply."
                      : "Your next chapter starts with a complete profile."
                    : reviewing
                      ? "Your verification is in progress."
                      : profile.status === "Approved"
                        ? "Your business is approved."
                        : "Your account needs attention."}
                </h2>
                <p className="max-w-2xl font-sans text-[13px] font-normal leading-6 tracking-normal">
                  {profile.editable
                    ? "Tell us about your business, choose your services and upload your documents. You can save your progress and return whenever you're ready."
                    : reviewing
                      ? "Our team is reviewing your business details and documents. You can check your progress below."
                      : profile.status === "Approved"
                        ? "Your verification is complete. View your documents and review history below."
                        : "Review the account information below or reach out to our support team."}
                </p>
                {profile.reason && (
                  <p className="vo-rejection-reason mt-3 whitespace-pre-wrap text-xs">
                    <strong>Admin feedback:</strong> {profile.reason}
                  </p>
                )}
                <ol
                  aria-label="Verification status flow"
                  className="mt-6 flex flex-col rounded-xl bg-white/80 p-5 sm:flex-row sm:py-6"
                >
                  {statusFlow.map((label, index) => {
                    const complete = approved || index < flowStage;
                    const current = index === flowStage;
                    const failed = current && rejected;
                    const circleTone = complete
                      ? "border-green-600 bg-green-600 text-white"
                      : failed
                        ? "border-red-600 bg-red-600 text-white ring-4 ring-red-100"
                        : current
                          ? "border-yellow-500 bg-yellow-400 text-yellow-950 ring-4 ring-yellow-100"
                          : "border-gray-300 bg-white text-gray-400";
                    const textTone = complete
                      ? "text-green-700"
                      : failed
                        ? "text-red-700"
                        : current
                          ? "text-yellow-800"
                          : "text-gray-500";
                    return (
                      <li
                        key={label}
                        aria-current={current ? "step" : undefined}
                        className="relative flex min-w-0 gap-4 pb-7 last:pb-0 sm:flex-1 sm:flex-col sm:items-center sm:gap-3 sm:pb-0 sm:text-center"
                      >
                        {index < statusFlow.length - 1 && (
                          <span
                            aria-hidden="true"
                            className={`absolute bottom-0 left-4 top-8 w-0.5 sm:bottom-auto sm:left-1/2 sm:top-4 sm:h-0.5 sm:w-full ${complete ? "bg-green-600" : "bg-gray-200"}`}
                          />
                        )}
                        <span
                          className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-xs ${circleTone}`}
                          aria-hidden="true"
                        >
                          {complete ? (
                            <Check size={18} strokeWidth={3} />
                          ) : failed ? (
                            "!"
                          ) : current ? (
                            <Clock3 size={17} />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span
                          className={`min-w-0 pt-1 text-xs font-semibold sm:px-2 sm:pt-0 ${textTone}`}
                        >
                          {failed ? profile.status : label}
                          <small className="mt-1 block text-[10px] font-normal">
                            {complete
                              ? "Completed"
                              : failed
                                ? "Action required"
                                : current
                                  ? "In progress"
                                  : "Upcoming"}
                          </small>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <button
                className="vo-refresh inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-current bg-white/70 px-3 py-2 text-xs hover:bg-white"
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
            <div className="vo-workspace grid min-w-0 gap-6">
              <div className="rounded-xl border border-[#eee4e5] bg-white p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3 text-xs text-[#8e747c]">
                  <span>{completed} of 4 sections complete</span>
                  <span>
                    {lastSaved
                      ? `Progress saved at ${lastSaved}`
                      : "Save your progress at any time"}
                  </span>
                </div>
                <nav
                  aria-label="Verification steps"
                  className="flex gap-3 overflow-x-auto pb-2"
                >
                  {sections.map((section, index) => (
                    <button
                      key={section.id}
                      type="button"
                      disabled={busy}
                      aria-current={activeStep === index ? "step" : undefined}
                      aria-controls={`vo-${section.id}`}
                      onClick={() => openStep(index)}
                      className={`flex min-w-[175px] flex-1 items-center gap-3 rounded-lg border p-3 text-left transition-colors ${activeStep === index ? "border-[#8c414e] bg-[#fcf4f6] text-[#8c414e]" : "border-[#eee4e5] bg-white text-[#7d646e]"}`}
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#e9dce1] text-xs">
                        {section.complete ? (
                          <Check size={14} />
                        ) : (
                          `0${index + 1}`
                        )}
                      </span>
                      <span className="text-xs font-medium">
                        {section.title}
                        <small className="mt-1 block text-[10px] font-normal">
                          {section.complete ? "All set" : section.subtitle}
                        </small>
                      </span>
                    </button>
                  ))}
                </nav>
              </div>
              <form
                className="vo-form min-w-0 grid [gap:21px]"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!profile.editable) return;
                  if (activeStep < 3) openStep(activeStep + 1);
                  else submitVerification();
                }}
              >
                <section
                  id="vo-business"
                  hidden={activeStep !== 0}
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
                        name="businessDescription"
                        required
                        minLength={10}
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
                  hidden={activeStep !== 1}
                  className="vo-card min-w-0 [border:1px_solid_#eee4e5] bg-white [border-radius:12px] [padding:26px_28px] [scroll-margin-top:25px] [box-shadow:0_3px_15px_#49303902] [&_.field]:[font-size:11px] [&_.field]:[color:#7d646e] [&_.field]:font-medium [&_.field]:[margin-bottom:19px] [&_.field_input]:[min-height:44px] [&_.field_input]:[font-size:12px] [&_.field_input]:[border-color:#e9e1e4] [&_.field_input]:[border-radius:7px] [&_.field_input]:bg-white [&_.field_input]:[color:#5e4851] [&_.field_input]:[padding:11px_13px] [&_.field_input:focus]:[border-color:#af7b8a] [&_.field_input:focus]:[box-shadow:0_0_0_3px_#8c414e0b] [&_.field_input:focus]:outline-none max-[1100px]:[padding:22px] max-[480px]:[padding:21px_17px]"
                >
                  <SectionHeading section={sections[1]} index={1} />
                  <p className="vo-section-description [margin:15px_0_23px] [font-size:11px] [color:#a08f95] [&_>_span]:block [&_>_span]:[margin-top:5px] [&_>_span]:[font-size:9px] [&_>_span]:[color:#af9da4]">
                    Service categories * - Choose at least one category your
                    business offers.
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
                  hidden={activeStep !== 2}
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
                            name={name}
                            required
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
                  hidden={activeStep !== 3}
                  className="vo-card min-w-0 [border:1px_solid_#eee4e5] bg-white [border-radius:12px] [padding:26px_28px] [scroll-margin-top:25px] [box-shadow:0_3px_15px_#49303902] [&_.field]:[font-size:11px] [&_.field]:[color:#7d646e] [&_.field]:font-medium [&_.field]:[margin-bottom:19px] [&_.field_input]:[min-height:44px] [&_.field_input]:[font-size:12px] [&_.field_input]:[border-color:#e9e1e4] [&_.field_input]:[border-radius:7px] [&_.field_input]:bg-white [&_.field_input]:[color:#5e4851] [&_.field_input]:[padding:11px_13px] [&_.field_input:focus]:[border-color:#af7b8a] [&_.field_input:focus]:[box-shadow:0_0_0_3px_#8c414e0b] [&_.field_input:focus]:outline-none max-[1100px]:[padding:22px] max-[480px]:[padding:21px_17px]"
                >
                  <SectionHeading section={sections[3]} index={3} />
                  {activeStep === 3 && (
                    <div className="mt-5">
                      <VerificationDocuments
                        profile={profile}
                        busy={busy}
                        action={action}
                        refreshProfile={refreshProfile}
                        notify={notify}
                      />
                    </div>
                  )}
                  <p className="vo-document-security flex items-start [gap:7px] [color:#af9ca6] [font-size:9px] [line-height:1.8] [margin:16px_0_0] [&_svg]:shrink-0 [&_svg]:[margin-top:2px]">
                    <LockKeyhole size={13} /> Securely stored and accessible
                    only for verification. Replace rejected documents before
                    resubmitting.
                  </p>
                </section>
                {stepErrors.length > 0 && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[#e8bac2] bg-[#fff2f3] p-4 text-xs text-[#a1374a]"
                  >
                    <p className="mb-2 font-semibold">
                      Complete the required fields to continue:
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      {stepErrors.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e6d8df] bg-white p-4">
                  <div className="flex flex-wrap gap-3">
                    {activeStep > 0 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => openStep(activeStep - 1)}
                        className="rounded-md border border-[#e2d4dc] px-4 py-3 text-xs text-[#997384]"
                      >
                        Back
                      </button>
                    )}
                    {profile.editable && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => persist(false)}
                        className="inline-flex items-center gap-2 rounded-md border border-[#e2d4dc] px-4 py-3 text-xs text-[#997384]"
                      >
                        <Save size={15} /> Save progress
                      </button>
                    )}
                  </div>
                  {activeStep < 3 ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openStep(activeStep + 1)}
                      className="ml-auto inline-flex items-center gap-2 rounded-md bg-[#8c414e] px-5 py-3 text-xs text-white"
                    >
                      Next <ArrowRight size={15} />
                    </button>
                  ) : (
                    profile.editable && (
                      <button
                        type="submit"
                        disabled={busy}
                        className="ml-auto inline-flex items-center gap-2 rounded-md bg-[#8c414e] px-5 py-3 text-xs text-white"
                      >
                        {busy ? (
                          <LoaderCircle size={15} className="animate-spin" />
                        ) : (
                          <ShieldCheck size={15} />
                        )}{" "}
                        Submit for verification
                      </button>
                    )
                  )}
                </div>
                {profile.editable && activeStep === 3 && !ready && (
                  <p className="text-xs text-[#ad96a2]">
                    Complete all required fields and add your documents before
                    submitting.
                  </p>
                )}
              </form>
            </div>
            <section
              className="mt-6 rounded-xl border border-[#e4eade] bg-white p-6"
              aria-label="Verification history"
            >
              <h2 className="mb-4 text-lg">Verification history</h2>
              <p>
                Verification cycle: {profile.cycle}.{" "}
                {profile.verifiedAt
                  ? `Approved on ${new Date(profile.verifiedAt).toLocaleString("en-IN")}.`
                  : ""}
              </p>
              {profile.history?.length ? (
                <ul className="mt-3 space-y-3">
                  {profile.history.map((entry) => (
                    <li key={entry.id}>
                      <strong>{entry.status}</strong> | Cycle {entry.cycle} |{" "}
                      {new Date(entry.createdAt).toLocaleString("en-IN")}
                      {entry.reason && (
                        <p className="whitespace-pre-wrap">{entry.reason}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No review decisions yet.</p>
              )}
            </section>
            <footer className="vo-footer flex items-center justify-between [gap:14px] [padding-top:27px] [margin-top:28px] [border-top:1px_solid_#eae1e5] [font-size:9px] [color:#b19aa5] [&_>_span:first-child]:flex [&_>_span:first-child]:items-center [&_>_span:first-child]:[gap:7px] max-[480px]:flex-col max-[480px]:[gap:7px] max-[480px]:text-center">
              <span>
                <Sparkles size={14} /> Beautiful celebrations begin with trusted
                partners.
              </span>
              <span>MarryNest Partner Programme</span>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
