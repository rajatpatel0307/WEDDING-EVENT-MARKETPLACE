import { OfferSelection, OfferConfiguration } from "../../commerce/OfferEditor";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  Send,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  Field,
  Heading,
  Panel,
  ErrorView,
  Loading,
  useVendorData,
} from "../components/WorkspaceUI";
import { money, save, vendorRequest } from "../services/workspace.api";
import {
  blank,
  editableDocument,
  steps,
  units,
  slugify,
  useUnsaved,
  Notice,
} from "./shared";
import { validateService } from "./service-validation";
import { bookingAdvanceError } from "../../commerce/offer-validation.js";
import MediaManager from "./MediaManager";
import { ServicePreview } from "./ServiceDetails";
import RequiredMark from "../../../components/ui/RequiredMark";

const requiredFields = new Set([
  "location.city",
  "pricing.basePrice", "pricing.unitPrice", "pricing.minimumQuantity",
  "pricing.maximumQuantity", "pricing.discount", "pricing.taxRate",
  "pricing.additionalCharges",
  "availability.start", "availability.end", "availability.advanceDays",
  "availability.noticeHours",
  "policies.advancePercentage", "policies.travelCharges", "policies.setupTime",
  "policies.duration",
  "seo.slug",
]);

const fieldHints = {
  "pricing.basePrice": "Starting amount before per-unit costs, discounts and tax.",
  "pricing.unitPrice": "Amount charged for each person, hour, item or other selected unit.",
  "pricing.minimumPrice": "Lowest amount you accept for a booking, if applicable.",
  "pricing.maximumPrice": "Highest booking price, if applicable.",
  "pricing.minimumQuantity": "Smallest number of pricing units a customer can book.",
  "pricing.maximumQuantity": "Largest number of pricing units a customer can book.",
  "pricing.discount": "Enter a percentage from 0 to 100, such as 10 for 10%.",
  "pricing.taxRate": "Enter the applicable tax percentage, or 0 if none applies.",
  "pricing.specialPrice": "Alternative starting price used instead of the base price.",
  "pricing.weekendPrice": "Price applicable to weekend bookings.",
  "pricing.seasonalPrice": "Price applicable between the seasonal start and end dates.",
  "pricing.additionalCharges": "Extra amount included in the estimated starting price; enter 0 if none.",
  "pricing.seasonalFrom": "First date on which the seasonal price applies.",
  "pricing.seasonalTo": "Last date on which the seasonal price applies.",
  "location.city": "Enter the city where this service is based, such as Jaipur.",
  "location.address": "Enter the building, street and local area of your service address.",
  "location.state": "Enter the state or province of your service address.",
  "location.country": "Enter the country of your service address.",
  "location.zip": "Enter the PIN code or postal code of your service address.",
  "location.latitude": "Optional map coordinate from -90 to 90.",
  "location.longitude": "Optional map coordinate from -180 to 180.",
  "location.radiusKm": "Maximum distance you travel from your service location, in kilometres.",
  "location.travelCharge": "Travel amount for this coverage area; enter 0 if none.",
  "location.minimumOrderValue": "Smallest booking amount accepted in this coverage area.",
  "availability.start": "Time you start accepting service bookings on your working days.",
  "availability.end": "Time your working day ends; it must be after the start time.",
  "availability.advanceDays": "How many days into the future customers can book.",
  "availability.noticeHours": "Minimum hours needed between booking and the service start.",
  "policies.cancellation": "Explain cancellation deadlines, fees and any exceptions.",
  "policies.refund": "Explain when customers qualify for a refund and how much they receive.",
  "policies.rescheduling": "Explain how customers can change their booking date and any fees.",
  "policies.additionalCharges": "Describe when extra fees apply and what they cover.",
  "policies.terms": "Enter other booking conditions customers need to agree to.",
  "policies.advancePercentage": "Percentage of the booking amount payable in advance, from 0 to 100.",
  "policies.travelCharges": "Travel fee stated in your booking policy; enter 0 if none.",
  "policies.setupTime": "Minutes needed to prepare before the service starts.",
  "policies.duration": "Total service length in minutes, such as 120 for two hours.",
  "seo.title": "Title to display for this listing in search engine results.",
  "seo.description": "Short summary of this listing for search engine results.",
  "seo.keywords": "Relevant search terms separated by commas, such as wedding venue, Jaipur.",
  "seo.slug": "Unique URL name using lowercase letters, numbers and hyphens, such as royal-garden-jaipur.",
};

export default function ServiceEditor() {
  const params = useParams(),
    navigate = useNavigate(),
    [search] = useSearchParams(),
    metadata = useVendorData("/services/metadata");
  const [id, setId] = useState(params.id || null),
    [data, setData] = useState(blank),
    [step, setStep] = useState(
      Math.min(8, Math.max(0, Number(search.get("step")) || 0)),
    ),
    [current, setCurrent] = useState(null),
    [dirty, setDirty] = useState(false),
    [loading, setLoading] = useState(!!params.id),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [stepError, setStepError] = useState(""),
    [notice, setNotice] = useState("");
  const [serviceOptions,setServiceOptions] = useState(null);
  const form = useRef(null);
  useUnsaved(dirty);

  const validateCurrentStep = () => {
    if (!form.current) return false;
    const advanceError = step === 2 && bookingAdvanceError(data.offer?.book);
    if (advanceError) {
      setStepError(advanceError);
      form.current.querySelector('[aria-invalid="true"]')?.focus();
      return false;
    }
    for (const input of form.current.querySelectorAll("input[required], textarea[required]")) {
      const textInput = input.tagName === "TEXTAREA" || input.type === "text";
      if (textInput) {
        const value = input.value.trim();
        input.setCustomValidity(
          !value
            ? "Please fill out this field."
            : input.minLength > 0 && value.length < input.minLength
              ? `Please enter at least ${input.minLength} characters.`
              : "",
        );
      }
    }
    if (!form.current.reportValidity()) {
      setStepError("Complete the required fields and correct any invalid values before continuing.");
      return false;
    }
    setStepError("");
    return true;
  };

  const goToStep = (nextStep) => {
    if (nextStep === step) return;
    if (nextStep > step && !validateCurrentStep()) return;
    setStepError("");
    setError("");
    setStep(nextStep);
  };

  useEffect(() => {
    let live = true;
    setId(params.id || null);
    setCurrent(null);
    setDirty(false);
    setError("");
    setNotice("");
    if (!params.id) {
      setData(blank());
      setLoading(false);
    } else setLoading(true);
    if (params.id)
      vendorRequest(`/services/${params.id}`)
        .then((s) => {
          if (live) {
            setData(editableDocument(s));
            setCurrent(s);
          }
        })
        .catch((e) => {
          if (live) setError(e.message);
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    return () => {
      live = false;
    };
  }, [params.id]);

  useEffect(() => {
    setStep(Math.min(8, Math.max(0, Number(search.get("step")) || 0)));
  }, [search]);

  useEffect(() => {
    if(!data.categoryId) {setServiceOptions(null);return;}
    let live=true;
    setServiceOptions(null);
    vendorRequest(`/categories/${data.categoryId}/service-options`).then(options=>{if(live)setServiceOptions({id:options.CategoryId,sellEnabled:!!options.AllowBuyOnline,bookEnabled:!!options.AllowBooking});}).catch(e=>{if(live)setError(e.message);});
    return ()=>{live=false;};
  },[data.categoryId]);

  const change = (key, value) => {
    setData((d) => ({
      ...d,
      [key]: value,
      ...(key === "name" &&
      !id &&
      (!d.seo.slug || d.seo.slug === slugify(d.name))
        ? { seo: { ...d.seo, slug: slugify(value) } }
        : {}),
    }));
    setDirty(true);
  };

  const nested = (section, key, value) =>
    change(section, { ...data[section], [key]: value });

  const field = (section, key, label, type = "text", extra = {}) => (
    <Field
      key={key}
      label={label}
      hint={fieldHints[`${section}.${key}`]}
      requiredForSubmission={requiredFields.has(`${section}.${key}`)}
    >
      <input
        type={type}
        value={data[section][key] ?? ""}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        onChange={(e) =>
          nested(
            section,
            key,
            type === "number"
              ? e.target.value === ""
                ? null
                : Number(e.target.value)
              : e.target.value || (type === "date" ? null : ""),
          )
        }
        {...extra}
      />
    </Field>
  );

  const area = (section, key, label) => (
    <Field
      key={key}
      label={label}
      hint={fieldHints[`${section}.${key}`]}
      requiredForSubmission={section === "policies" && key === "cancellation" && !data.offer}
    >
      <textarea
        rows={3}
        maxLength={key === "terms" ? 10000 : 2000}
        value={data[section][key]}
        onChange={(e) => nested(section, key, e.target.value)}
      />
    </Field>
  );

  const persist = async (submit = false) => {
    setBusy(true);
    setError("");
    try {
      const issue = validateService(data, {
        submit,
        imageCount: current?.images?.length || 0,
      });
      if (issue) {
        setStep(issue.step);
        throw new Error(issue.message);
      }
      const result = await save(
        `/services${id ? `/${id}` : ""}`,
        id ? "PUT" : "POST",
        {
          ...data,
          ...(current?.updatedAt
            ? { expectedUpdatedAt: current.updatedAt }
            : {}),
        },
      );
      const savedId = result.id || id;
      setId(savedId);
      setDirty(false);
      const next = await vendorRequest(`/services/${savedId}`);
      setCurrent(next);
      setNotice(result.message);
      if (submit) {
        await save(`/services/${savedId}/submit`, "POST", {
          expectedUpdatedAt: next.updatedAt,
        });
        navigate(`/vendor/services/${savedId}`);
      }
      return savedId;
    } catch (e) {
      if (e.message.includes("Advance per unit cannot exceed the booking price.")) {
        setStep(2);
        setError("Advance booking amount per unit cannot exceed the booking price. Lower the advance amount or increase the booking price in Pricing.");
        return null;
      }
      if (submit) {
        const stepForError = {
          "Add this category to your business profile before using it.": 0,
          "Choose an active category.": 0,
          "Complete the description, short description, city and cancellation policy before submitting.": 0,
          "Add at least one service image before submitting.": 4,
        }[e.message];
        if (stepForError !== undefined) setStep(stepForError);
      }
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const reloadMedia = async () => {
    if (id) {
      const fresh = await vendorRequest(`/services/${id}`);
      setCurrent(fresh);
      if (fresh.images?.length && error === "Add at least one service image before submitting.") {
        setError("");
      }
    }
  };

  if (loading || metadata.loading) return <Loading />;
  if (metadata.error)
    return <ErrorView error={metadata.error} retry={metadata.retry} />;
  if (!params.id && !metadata.data?.canCreate)
    return <div className="rounded-xl border border-[#dfe7d8] bg-white p-5"><Heading title="Service access required" description={`Service access is ${metadata.data?.access?.serviceStatus || "Pending"}. Administrator approval is required to create services.`} /><Link to="/vendor/services" className="mt-4 inline-block text-sm underline">Return to services</Link></div>;
  if (params.id && !current && error)
    return (
      <ErrorView
        error={new Error(error)}
        retry={() => window.location.reload()}
      />
    );
  if (current && !current.actions.edit)
    return (
      <div
        className="
        [--sm-accent:#2d604b] [--sm-border:#e2e8df] w-full min-w-0
        [&_button:disabled]:opacity-[0.45] [&_button:disabled]:cursor-not-allowed
        [&_:focus-visible]:[outline:2px_solid_#397455] [&_:focus-visible]:[outline-offset:3px]
      "
      >
        <Heading
          title="Service editing is locked"
          description="Editing is unavailable while a service is under review or suspended."
        />
        <Link
          className="
          vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
          [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
          rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
          font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
          [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
          [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
          [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
          [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
          mt-4
        "
          to={`/vendor/services/${id}`}
        >
          View service
        </Link>
      </div>
    );

  const category = metadata.data.categories.find(
      (c) => c.id === data.categoryId,
    ),
    template = metadata.data.templates[category?.name] || [],
    subs = metadata.data.subcategories.filter(
      (s) => s.categoryId === data.categoryId,
    );

  const itemChange = (i, key, value) =>
    change(
      "items",
      data.items.map((x, n) => (n === i ? { ...x, [key]: value } : x)),
    );

  const moveItem = (i, by) => {
    const list = [...data.items];
    [list[i], list[i + by]] = [list[i + by], list[i]];
    change("items", list);
  };

  const pricePreview = () => {
    const p = data.pricing,
      subtotal =
        Number(p.specialPrice ?? p.basePrice) +
        Number(p.unitPrice) * Number(p.minimumQuantity);
    return (
      (subtotal * (1 - Number(p.discount) / 100) +
        Number(p.additionalCharges)) *
      (1 + Number(p.taxRate || 0) / 100)
    );
  };

  return (
    <div
      className="
      [--sm-accent:#2d604b] [--sm-border:#e2e8df] w-full min-w-0
      [&_button:disabled]:opacity-[0.45] [&_button:disabled]:cursor-not-allowed
      [&_:focus-visible]:[outline:2px_solid_#397455] [&_:focus-visible]:[outline-offset:3px]
      animate-fade-in
    "
    >
      <Link
        className="
        inline-flex items-center gap-[7px] text-[#5d7566] mb-[18px] text-[12px] inline-flex items-center
        gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-2
      "
        to="/vendor/services"
      >
        <ArrowLeft size={15} />
        All services
      </Link>
      <Heading
        title={id ? "Edit Service" : "Create a new service"}
        eyebrow="SERVICE STUDIO"
        description="Bring your expertise to life. We’ll take care of the details."
      />

      <Notice message={notice} />

      {current?.status === "Approved" && (
        <div
          className="
          rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fbf5e7]
          [border-top:1px_solid_#ede1c6] [border-right:1px_solid_#ede1c6] [border-bottom:1px_solid_#ede1c6]
          [border-left:1px_solid_#ede1c6] text-[#93773e] flex items-center gap-2 bg-amber-500/10 border
          border-amber-500/20 text-amber-800 dark:text-amber-200 p-4 rounded-xl mb-4
        "
        >
          <AlertTriangle size={18} className="shrink-0 text-amber-600" />
          <span>
            Changes require admin approval. Saving will withdraw this listing
            until it is reviewed again.
          </span>
        </div>
      )}

      {current?.status === "Rejected" && (
        <div
          className="
          rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fcf0ed]
          [border-top:1px_solid_#efd4cd] [border-right:1px_solid_#efd4cd] [border-bottom:1px_solid_#efd4cd]
          [border-left:1px_solid_#efd4cd] text-[#9d5348] [&_p]:text-[inherit]! [&_.vw-button]:inline-flex
          [&_.vw-button]:m-[10px] bg-destructive/10 border border-destructive/20 text-destructive p-4
          rounded-xl mb-4
        "
        >
          <div className="flex items-center gap-2 font-semibold mb-1">
            <AlertTriangle size={18} />
            <strong>Service Rejected</strong>
          </div>
          <p className="text-sm opacity-90">{current.rejectionReason}</p>
          {current.adminNote && (
            <p className="text-sm opacity-90 mt-1">Note: {current.adminNote}</p>
          )}
          <span className="text-xs font-medium block mt-2 opacity-75">
            Edit your service, then submit it for another review.
          </span>
        </div>
      )}

      {!metadata.data.canSubmit && (
        <div
          className="
          rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fbf5e7]
          [border-top:1px_solid_#ede1c6] [border-right:1px_solid_#ede1c6] [border-bottom:1px_solid_#ede1c6]
          [border-left:1px_solid_#ede1c6] text-[#93773e] flex items-center gap-2 bg-primary/5 border
          border-primary/20 p-4 rounded-xl mb-4
        "
        >
          <Info size={18} className="shrink-0 text-primary" />
          <span>
            Service access approval is required to submit services. You can continue managing existing drafts.
          </span>
        </div>
      )}

      <div
        className="
        grid grid-cols-1 gap-[24px] [align-items:start] mt-[24px]
        service-mobile:gap-[15px]
      "
      >
        {/* Horizontal listing steps */}
        <aside
          className="
          [background:#fff] [border-top:1px_solid_var(--sm-border)] [border-right:1px_solid_var(--sm-border)]
          [border-bottom:1px_solid_var(--sm-border)] [border-left:1px_solid_var(--sm-border)] rounded-[12px]
          min-w-0 [padding:16px_12px] [&_>_span]:block [&_>_span]:text-[9px]
          [&_>_span]:tracking-[1.5px] [&_>_span]:text-[#99a38d] [&_>_span]:[margin:0_10px_18px]
          [&_nav_>_button]:border-0 [&_nav_>_button]:[background:none] [&_nav_>_button]:flex [&_nav_>_button]:flex-col [&_nav_>_button]:gap-[8px]
          [&_nav_>_button]:items-center [&_nav_>_button]:px-1 [&_nav_>_button]:py-3 [&_nav_>_button]:min-w-0 [&_nav_>_button]:text-center
          [&_nav_>_button]:text-[#94a08e] [&_nav_>_button]:rounded-[8px] [&_nav_>_button]:text-[12px] [&_button_b]:w-[27px] [&_button_b]:shrink-0
          [&_button_b]:h-[27px] [&_button_b]:rounded-[50%] [&_button_b]:[border-top:1px_solid_#dde5d7]
          [&_button_b]:[border-right:1px_solid_#dde5d7] [&_button_b]:[border-bottom:1px_solid_#dde5d7]
          [&_button_b]:[border-left:1px_solid_#dde5d7] [&_button_b]:flex [&_button_b]:items-center
          [&_button_b]:justify-center [&_button_b]:text-[10px] [&_button_small]:block
          [&_button_small]:text-[9px] [&_button_small]:mt-[3px] [&_button_small]:text-[#aab1a1]
          [&_button.current]:[background:#edf4e9] [&_button.current]:text-[#2d604b]
          [&_button.current]:font-semibold [&_button.current_b]:[background:#3d6c50]
          [&_button.current_b]:text-[#fff] [&_button.current_b]:[border-color:#3d6c50]
          [&_button.done_b]:[background:#3d6c50] [&_button.done_b]:text-[#fff]
          [&_button.done_b]:[border-color:#3d6c50] service-mobile:w-[100%] service-mobile:p-[8px]
          service-mobile:[&_nav_>_button]:text-[8px] service-mobile:[&_button_small]:hidden
          service-mobile:[&_button_b]:w-[22px] service-mobile:[&_button_b]:h-[22px]
        "
        >
          <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-muted-foreground tracking-wider">
            <Sparkles size={14} className="text-primary" />
            <span>BUILD YOUR LISTING</span>
          </div>
          <nav aria-label="Listing steps" className="grid w-full min-w-0 grid-cols-9 items-stretch gap-1 p-1 service-mobile:gap-0">
          {steps.map((name, i) => (
            <button
              type="button"
              key={name}
              aria-current={step === i ? "step" : undefined}
              className={`${step === i ? "current ring-1 ring-primary/30 bg-primary/5" : ""} ${step > i ? "done opacity-80" : ""} transition-all duration-200`}
              onClick={() => goToStep(i)}
            >
              <b
                className={
                  step === i
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : ""
                }
              >
                {step > i ? (
                  <Check size={14} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </b>
              <div className="min-w-0 w-full [overflow-wrap:anywhere]">
                <span className="font-medium">{name}</span>
                <small className="text-xs text-muted-foreground">
                  {i === step
                    ? "You are here"
                    : i < step
                      ? "Completed"
                      : "Upcoming"}
                </small>
              </div>
            </button>
          ))}
          </nav>
        </aside>

        <form
          ref={form}
          noValidate
          className="service-form min-w-[0] service-mobile:w-[100%]"
          onInput={(e) => {
            e.target.setCustomValidity?.("");
            setStepError("");
          }}
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 8) goToStep(step + 1);
            else if (validateCurrentStep()) persist(true);
          }}
        >
          <p className="mb-4 text-xs text-[#617366]">
            <RequiredMark /> Required before submitting. You can save an incomplete draft.
          </p>
          {error && (
            <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-[#efd4cd] bg-[#fff0ed] p-4 text-sm text-[#ab4b3c]">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {stepError && (
            <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{stepError}</span>
            </div>
          )}
          <Panel
            title={`${String(step + 1).padStart(2, "0")} / ${steps[step]}`}
            description={`Step ${step + 1} of 9 · ${step === 8 ? "Review everything before submitting." : "Every detail helps customers choose with confidence."}`}
          >
            <div className="p-[25px] service-mobile:p-[18px]">
              {step === 0 && (
                <div
                  className="
                  grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_input]:w-[100%] [&_input]:rounded-[7px]
                  [&_input]:[padding:10px_12px] [&_input]:[background:#fff] [&_input]:min-h-[40px] [&_select]:w-[100%]
                  [&_select]:rounded-[7px] [&_select]:[padding:10px_12px] [&_select]:[background:#fff]
                  [&_select]:min-h-[40px] [&_textarea]:w-[100%] [&_textarea]:rounded-[7px]
                  [&_textarea]:[padding:10px_12px] [&_textarea]:[background:#fff] [&_textarea]:min-h-[40px]
                  [&_textarea]:resize-y [&_.vw-field]:m-[0] service-mobile:grid-cols-[1fr] service-mobile:gap-[18px]
                "
                >
                  <Field label="Service listing name" hint="Enter the name customers will see for this service.">
                    <input
                      required
                      minLength={2}
                      maxLength={200}
                      value={data.name}
                      placeholder="e.g. Royal Garden Wedding Venue"
                      onChange={(e) => change("name", e.target.value)}
                    />
                  </Field>
                  <Field label="How this service is delivered" hint="Choose whether you provide an on-site service, rental, sale, digital service or a combination.">
                    <select
                      value={data.serviceType}
                      onChange={(e) => change("serviceType", e.target.value)}
                    >
                      {["On site", "Rental", "Sale", "Digital", "Hybrid"].map(
                        (s) => (
                          <option key={s}>{s}</option>
                        ),
                      )}
                    </select>
                  </Field>
                  <Field label="Service category" hint="Choose the category that best describes this service.">
                    <select
                      required
                      value={data.categoryId || ""}
                      onChange={(e) => {
                        setData((d) => ({
                          ...d,
                          categoryId: Number(e.target.value),
                          subcategoryId: null,
                          attributes: {},
                        }));
                        setDirty(true);
                      }}
                    >
                      <option value="">Choose category</option>
                      {metadata.data.categories.map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="col-span-full"><OfferSelection category={serviceOptions || metadata.data.categories.find(c=>c.id===data.categoryId)} value={data.offer} onChange={offer=>change("offer",offer)}/></div>
                  {field(
                    "location",
                    "city",
                    "City where the service is based",
                    "text",
                    { maxLength: 100 },
                  )}
                  {field(
                    "policies",
                    "duration",
                    "Estimated service duration (minutes)",
                    "number",
                    { step: 1, max: 1000000 },
                  )}
                  {!metadata.data.categories.length && (
                    <p
                      className="
                      rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fbf5e7]
                      [border-top:1px_solid_#ede1c6] [border-right:1px_solid_#ede1c6] [border-bottom:1px_solid_#ede1c6]
                      [border-left:1px_solid_#ede1c6] text-[#93773e] text-sm text-destructive bg-destructive/10 p-3
                      rounded-lg
                    "
                      role="alert"
                    >
                      No service categories are assigned to your business yet.{" "}
                      <Link
                        to="/vendor/business/profile"
                        className="underline font-semibold"
                      >
                        Update your business profile
                      </Link>{" "}
                      before creating a service.
                    </p>
                  )}
                  {data.categoryId &&
                    !metadata.data.categories.some(
                      (c) => c.id === data.categoryId,
                    ) && (
                      <p
                        className="
                        rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fbf5e7]
                        [border-top:1px_solid_#ede1c6] [border-right:1px_solid_#ede1c6] [border-bottom:1px_solid_#ede1c6]
                        [border-left:1px_solid_#ede1c6] text-[#93773e] text-sm text-amber-700 bg-amber-500/10 p-3 rounded-lg
                      "
                        role="alert"
                      >
                        This category is not assigned to your business. Choose
                        an assigned category or update your{" "}
                        <Link
                          to="/vendor/business/profile"
                          className="underline font-semibold"
                        >
                          business profile
                        </Link>
                        .
                      </p>
                    )}
                  <Field label="Service subcategory" hint="Choose a more specific service type within your selected category, if available.">
                    <select
                      value={data.subcategoryId || ""}
                      onChange={(e) =>
                        change(
                          "subcategoryId",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    >
                      <option value="">
                        {subs.length
                          ? "Choose subcategory"
                          : "No subcategories available"}
                      </option>
                      {subs.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Short service summary"
                    requiredForSubmission
                    hint="Briefly explain what you offer, in up to 500 characters. Required before submission."
                  >
                    <textarea
                      maxLength={500}
                      rows={3}
                      value={data.shortDescription}
                      onChange={(e) =>
                        change("shortDescription", e.target.value)
                      }
                    />
                  </Field>
                  <Field
                    label="Full service description"
                    requiredForSubmission
                    hint="Describe what is included, your experience and what customers can expect. At least 20 characters are required before submission."
                  >
                    <textarea
                      maxLength={10000}
                      rows={6}
                      value={data.description}
                      onChange={(e) => change("description", e.target.value)}
                    />
                  </Field>
                </div>
              )}
              {step === 1 &&
                (!category ? (
                  <p className="text-muted-foreground italic">
                    Choose a category in Basic information to see its custom
                    fields.
                  </p>
                ) : (
                  <div>
                    <div className="inline-block [padding:5px_10px] [background:#edf4e9] text-[#4c7254] text-[10px] rounded-[5px] mb-[20px] font-bold text-primary mb-4 pb-2 border-b">
                      {category.name} Specifications
                    </div>
                    <div
                      className="
                      grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_input]:w-[100%] [&_input]:rounded-[7px]
                      [&_input]:[padding:10px_12px] [&_input]:[background:#fff] [&_input]:min-h-[40px] [&_select]:w-[100%]
                      [&_select]:rounded-[7px] [&_select]:[padding:10px_12px] [&_select]:[background:#fff]
                      [&_select]:min-h-[40px] [&_textarea]:w-[100%] [&_textarea]:rounded-[7px]
                      [&_textarea]:[padding:10px_12px] [&_textarea]:[background:#fff] [&_textarea]:min-h-[40px]
                      [&_textarea]:resize-y [&_.vw-field]:m-[0] service-mobile:grid-cols-[1fr] service-mobile:gap-[18px]
                    "
                    >
                      {template.map((f) =>
                        f.type === "boolean" ? (
                          <label
                            key={f.key}
                            className="
                            flex gap-[9px] items-center text-[#61765f] text-[12px] [&_input[type=checkbox]]:w-[16px]
                            [&_input[type=checkbox]]:h-[16px] [&_input[type=checkbox]]:min-h-[0]
                            [&_input[type=checkbox]]:[accent-color:#396d4d] flex items-center gap-2 cursor-pointer py-1
                          "
                          >
                            <input
                              type="checkbox"
                              checked={!!data.attributes[f.key]}
                              onChange={(e) =>
                                nested("attributes", f.key, e.target.checked)
                              }
                              className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                            />
                            <span className="text-sm font-medium">
                              {f.label}
                            </span>
                          </label>
                        ) : (
                          <Field key={f.key} label={f.label} hint={f.type === "select" ? `Choose the ${f.label.toLowerCase()} for this service.` : `Enter the ${f.label.toLowerCase()} for this service.`}>
                            {f.type === "select" ? (
                              <select
                                value={data.attributes[f.key] || ""}
                                onChange={(e) =>
                                  nested("attributes", f.key, e.target.value)
                                }
                              >
                                <option value="">Choose {f.label.toLowerCase()}</option>
                                {f.options.map((o) => (
                                  <option key={o}>{o}</option>
                                ))}
                              </select>
                            ) : f.type === "textarea" ? (
                              <textarea
                                rows={3}
                                maxLength={3000}
                                value={data.attributes[f.key] || ""}
                                onChange={(e) =>
                                  nested("attributes", f.key, e.target.value)
                                }
                              />
                            ) : (
                              <input
                                type={f.type}
                                min={f.type === "number" ? 0 : undefined}
                                maxLength={300}
                                value={data.attributes[f.key] ?? ""}
                                onChange={(e) => {
                                  if (
                                    f.type === "number" &&
                                    e.target.value === ""
                                  ) {
                                    const attrs = { ...data.attributes };
                                    delete attrs[f.key];
                                    change("attributes", attrs);
                                  } else
                                    nested(
                                      "attributes",
                                      f.key,
                                      f.type === "number"
                                        ? Number(e.target.value)
                                        : e.target.value,
                                    );
                                }}
                              />
                            )}
                          </Field>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              {step === 2 && (
                <>
                  {data.offer && <OfferConfiguration value={data.offer} onChange={offer=>change("offer",offer)} taxRate={data.pricing.taxRate} onTaxChange={v=>nested("pricing","taxRate",v)}/>}
                  {!data.offer && <>
                  <div
                    className="
                    grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_input]:w-[100%] [&_input]:rounded-[7px]
                    [&_input]:[padding:10px_12px] [&_input]:[background:#fff] [&_input]:min-h-[40px] [&_select]:w-[100%]
                    [&_select]:rounded-[7px] [&_select]:[padding:10px_12px] [&_select]:[background:#fff]
                    [&_select]:min-h-[40px] [&_textarea]:w-[100%] [&_textarea]:rounded-[7px]
                    [&_textarea]:[padding:10px_12px] [&_textarea]:[background:#fff] [&_textarea]:min-h-[40px]
                    [&_textarea]:resize-y [&_.vw-field]:m-[0] service-mobile:grid-cols-[1fr] service-mobile:gap-[18px]
                  "
                  >
                    {[
                      ["basePrice", "Base booking price (INR)"],
                      ["unitPrice", "Price per pricing unit (INR)"],
                      ["minimumPrice", "Minimum booking price (INR, optional)"],
                      ["maximumPrice", "Maximum booking price (INR, optional)"],
                      ["minimumQuantity", "Minimum bookable quantity (pricing units)"],
                      ["maximumQuantity", "Maximum bookable quantity (pricing units)"],
                      ["discount", "Discount (%)"],
                      ["taxRate", "Tax (%)"],
                      ["specialPrice", "Special booking price (INR, optional)"],
                      ["weekendPrice", "Weekend booking price (INR, optional)"],
                      ["seasonalPrice", "Seasonal booking price (INR, optional)"],
                      ["additionalCharges", "Additional booking charges (INR)"],
                    ].map(([key, label]) =>
                      field("pricing", key, label, "number", {
                        max: ["discount", "taxRate"].includes(key)
                          ? 100
                          : 100000000,
                      }),
                    )}
                    <Field label="Unit used to charge customers" hint="Choose what the unit price applies to, such as each person, hour or event.">
                      <select
                        value={data.pricing.unit}
                        onChange={(e) =>
                          nested("pricing", "unit", e.target.value)
                        }
                      >
                        {units.map((u) => (
                          <option key={u} value={u}>
                            {u === "Custom"
                              ? "Custom Quote"
                              : u === "Per KM"
                                ? "Per Kilometer"
                                : u}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Booking pricing method" hint="Choose fixed pricing, a per-unit rate or a custom quote. Leave the default to match your pricing unit.">
                      <select
                        value={data.pricing.type || ""}
                        onChange={(e) =>
                          nested("pricing", "type", e.target.value || null)
                        }
                      >
                        <option value="">Match pricing unit</option>
                        {[
                          ["Fixed", "Fixed price"],
                          ["PerPerson", "Per person"],
                          ["PerHour", "Hourly"],
                          ["PerDay", "Daily"],
                          ["PerItem", "Per item"],
                          ["CustomQuote", "Custom quote"],
                        ].map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {field("pricing", "seasonalFrom", "Season starts", "date")}
                    {field("pricing", "seasonalTo", "Season ends", "date")}
                    <label
                      className="
                      flex gap-[9px] items-center text-[#61765f] text-[12px] [&_input[type=checkbox]]:w-[16px]
                      [&_input[type=checkbox]]:h-[16px] [&_input[type=checkbox]]:min-h-[0]
                      [&_input[type=checkbox]]:[accent-color:#396d4d]
                    "
                    >
                      <input
                        type="checkbox"
                        checked={data.pricing.customQuote}
                        onChange={(e) =>
                          nested("pricing", "customQuote", e.target.checked)
                        }
                      />
                      Custom quotation available
                    </label>
                  </div>
                  <div
                    className="
                    p-[25px] [background:#f3f7ef] [border-top:1px_solid_#e1e8d9] [border-right:1px_solid_#e1e8d9]
                    [border-bottom:1px_solid_#e1e8d9] [border-left:1px_solid_#e1e8d9] rounded-[10px] [margin:24px_0]
                    [&_>_span]:block [&_>_span]:text-[10px] [&_>_span]:tracking-[1px] [&_>_span]:text-[#8d9b80]
                    [&_>_strong]:block [&_>_strong]:text-[32px] [&_>_strong]:font-semibold [&_>_strong]:text-[#3c6348]
                    [&_>_strong]:[margin:5px_0] [&_p]:max-w-[680px] [&_p]:leading-[1.8] [&_p]:[margin:8px_0_0]
                    service-mobile:p-[18px] mt-6 p-5 rounded-xl bg-primary/5 border border-primary/20 flex flex-col
                    gap-1.5
                  "
                  >
                    <span className="text-xs font-bold tracking-wider text-primary">
                      ESTIMATED STARTING PRICE
                    </span>
                    <strong className="text-2xl font-extrabold">
                      {money(pricePreview())}
                    </strong>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Base or special price + unit price × minimum quantity −
                      discount + additional charges. Weekend and seasonal prices
                      apply on matching dates. The server validates and
                      recalculates the final price.
                    </p>
                  </div>
                  </>}
                </>
              )}
              {step === 3 && (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tell customers exactly what’s included and what they can add
                    as optional items.
                  </p>
                  <div className="flex flex-col gap-4">
                    {data.items.map((item, i) => (
                      <div
                        className="
                        p-[18px] [border-top:1px_solid_var(--sm-border)] [border-right:1px_solid_var(--sm-border)]
                        [border-bottom:1px_solid_var(--sm-border)] [border-left:1px_solid_var(--sm-border)] rounded-[10px]
                        mb-[15px] p-4 rounded-xl border bg-card shadow-sm
                      "
                        key={i}
                      >
                        <div
                          className="
                          flex justify-between items-center mb-[15px] [&_>_div]:flex [&_>_div]:gap-[12px]
                          [&_button]:[background:none] [&_button]:[border-top:0] [&_button]:[border-right:0]
                          [&_button]:[border-bottom:0] [&_button]:[border-left:0] [&_button]:text-[#8c9c83] flex items-center
                          justify-between pb-3 mb-3 border-b
                        "
                        >
                          <strong className="text-sm font-bold flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center text-xs">
                              {i + 1}
                            </span>
                            Item Details
                          </strong>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                              title="Move up"
                              disabled={i === 0}
                              onClick={() => moveItem(i, -1)}
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                              title="Move down"
                              disabled={i === data.items.length - 1}
                              onClick={() => moveItem(i, 1)}
                            >
                              <ChevronDown size={16} />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors ml-1"
                              title="Delete item"
                              onClick={() =>
                                change(
                                  "items",
                                  data.items.filter((_, n) => n !== i),
                                )
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div
                          className="
                          grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_input]:w-[100%] [&_input]:rounded-[7px]
                          [&_input]:[padding:10px_12px] [&_input]:[background:#fff] [&_input]:min-h-[40px] [&_select]:w-[100%]
                          [&_select]:rounded-[7px] [&_select]:[padding:10px_12px] [&_select]:[background:#fff]
                          [&_select]:min-h-[40px] [&_textarea]:w-[100%] [&_textarea]:rounded-[7px]
                          [&_textarea]:[padding:10px_12px] [&_textarea]:[background:#fff] [&_textarea]:min-h-[40px]
                          [&_textarea]:resize-y [&_.vw-field]:m-[0] service-mobile:grid-cols-[1fr] service-mobile:gap-[18px]
                        "
                        >
                          {[
                            ["name", "Service item name *", "text"],
                            ["description", "What this item includes", "text"],
                            ["quantity", "Number of units for this item", "number"],
                            ["unit", "Item unit (e.g. person, hour, piece)", "text"],
                            ["price", "Item price (INR)", "number"],
                          ].map(([k, l, t]) => (
                            <Field key={k} label={l}>
                              <input
                                required={k === "name"}
                                type={t}
                                min={t === "number" ? 0 : undefined}
                                step={t === "number" ? "any" : undefined}
                                value={item[k]}
                                onChange={(e) =>
                                  itemChange(
                                    i,
                                    k,
                                    t === "number"
                                      ? Number(e.target.value)
                                      : e.target.value,
                                  )
                                }
                              />
                            </Field>
                          ))}
                          <label
                            className="
                            flex gap-[9px] items-center text-[#61765f] text-[12px] [&_input[type=checkbox]]:w-[16px]
                            [&_input[type=checkbox]]:h-[16px] [&_input[type=checkbox]]:min-h-[0]
                            [&_input[type=checkbox]]:[accent-color:#396d4d] flex items-center gap-2 pt-2 cursor-pointer
                          "
                          >
                            <input
                              type="checkbox"
                              checked={item.included}
                              onChange={(e) =>
                                itemChange(i, "included", e.target.checked)
                              }
                              className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                            />
                            <span className="text-sm font-medium">
                              Included in service (otherwise optional add-on)
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="
                      vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                      [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                      rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                      font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                      [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                      [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                      [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                      [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                      mt-4 flex items-center gap-2
                    "
                    disabled={data.items.length >= 100}
                    onClick={() =>
                      change("items", [
                        ...data.items,
                        {
                          name: "",
                          description: "",
                          quantity: 1,
                          unit: "item",
                          price: 0,
                          included: true,
                        },
                      ])
                    }
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </>
              )}
              {step === 4 &&
                (id ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Image changes are saved immediately. Save other form
                      changes before uploading.
                    </p>
                    {dirty ? (
                      <div className="p-6 rounded-xl border bg-muted/30 text-center flex flex-col items-center gap-3">
                        <p className="text-sm font-medium">
                          You have unsaved changes in your listing.
                        </p>
                        <button
                          type="button"
                          className="
                            vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                            [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                            rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                            font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                            [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                            [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                            [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                            [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                            vw-primary
                          "
                          disabled={busy}
                          onClick={() => persist()}
                        >
                          Save changes to manage images
                        </button>
                      </div>
                    ) : (
                      <MediaManager id={id} onChanged={reloadMedia} />
                    )}
                  </>
                ) : (
                  <div className="text-center [padding:60px_20px] [&_button]:mt-[15px] p-8 rounded-2xl border bg-card text-center flex flex-col items-center gap-3 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                      <Sparkles size={24} />
                    </div>
                    <h3 className="text-lg font-bold">
                      Give your listing a home first
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Save a draft to securely upload and manage your
                      professional service images.
                    </p>
                    <button
                      type="button"
                      className="
                        vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                        [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                        rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                        font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                        [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                        [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                        [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                        [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                        vw-primary mt-2 flex items-center gap-2
                      "
                      disabled={busy}
                      onClick={() => persist()}
                    >
                      <Save size={16} />
                      Save Draft & Add Images
                    </button>
                  </div>
                ))}
              {step === 5 && (
                <div
                  className="
                  grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_input]:w-[100%] [&_input]:rounded-[7px]
                  [&_input]:[padding:10px_12px] [&_input]:[background:#fff] [&_input]:min-h-[40px] [&_select]:w-[100%]
                  [&_select]:rounded-[7px] [&_select]:[padding:10px_12px] [&_select]:[background:#fff]
                  [&_select]:min-h-[40px] [&_textarea]:w-[100%] [&_textarea]:rounded-[7px]
                  [&_textarea]:[padding:10px_12px] [&_textarea]:[background:#fff] [&_textarea]:min-h-[40px]
                  [&_textarea]:resize-y [&_.vw-field]:m-[0] service-mobile:grid-cols-[1fr] service-mobile:gap-[18px]
                "
                >
                  {!!metadata.data.locations?.length && (
                    <Field label="Copy address from a saved business location" hint="Choose a saved location to fill in the address fields below.">
                      <select
                        value=""
                        onChange={(e) => {
                          const location = metadata.data.locations.find(
                            (row) => row.id === e.target.value,
                          );
                          if (location) {
                            const { id: locationId, ...address } = location;
                            change("location", {
                              ...data.location,
                              ...address,
                              latitude:
                                address.latitude == null
                                  ? null
                                  : Number(address.latitude),
                              longitude:
                                address.longitude == null
                                  ? null
                                  : Number(address.longitude),
                            });
                          }
                        }}
                      >
                        <option value="">Choose an address to copy</option>
                        {metadata.data.locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.address}, {location.city}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {[
                    ["address", "Service street address"],
                    ["city", "Service city"],
                    ["state", "State or province"],
                    ["country", "Country"],
                    ["zip", "PIN code / postal code"],
                  ].map(([k, l]) => field("location", k, l))}
                  {field("location", "latitude", "Map latitude (optional)", "number", {
                    min: -90,
                    max: 90,
                  })}
                  {field("location", "longitude", "Map longitude (optional)", "number", {
                    min: -180,
                    max: 180,
                  })}
                  <Field label="Business locations offering this service" hint="Select all applicable locations. Hold Ctrl (Windows) or Command (Mac) to select more than one.">
                    <select
                      multiple
                      value={data.location.vendorLocationIds || []}
                      onChange={(e) =>
                        nested(
                          "location",
                          "vendorLocationIds",
                          Array.from(e.target.selectedOptions, (o) => o.value),
                        )
                      }
                    >
                      {metadata.data.locations?.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.address}, {l.city}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cities where you provide this service" hint="Separate each city with a comma, such as Jaipur, Ajmer, Udaipur.">
                    <input
                      placeholder="e.g. Jaipur, Ajmer, Udaipur"
                      defaultValue={(data.location.cities || []).join(", ")}
                      onBlur={(e) =>
                        nested(
                          "location",
                          "cities",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                  </Field>
                  <Field label="PIN codes / postal codes you serve" hint="Separate each postal code with a comma, such as 302001, 302002.">
                    <input
                      placeholder="e.g. 302001, 302002"
                      defaultValue={(data.location.postalCodes || []).join(
                        ", ",
                      )}
                      onBlur={(e) =>
                        nested(
                          "location",
                          "postalCodes",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                  </Field>
                  {field(
                    "location",
                    "radiusKm",
                    "Service radius (km, optional)",
                    "number",
                    { min: 0, max: 20000 },
                  )}
                  {field(
                    "location",
                    "travelCharge",
                    "Travel charge for this service area (INR)",
                    "number",
                    { min: 0, max: 10000000 },
                  )}
                  {field(
                    "location",
                    "minimumOrderValue",
                    "Minimum booking amount for this area (INR)",
                    "number",
                    { min: 0, max: 100000000 },
                  )}
                  <Field label="Enable service in this coverage area" hint="Select this to mark your service coverage as active.">
                    <input
                      type="checkbox"
                      checked={data.location.active !== false}
                      onChange={(e) =>
                        nested("location", "active", e.target.checked)
                      }
                    />
                  </Field>
                  <Field label="Where the service takes place" hint="Choose your business location, the customer’s location, both, or a service area.">
                    <select
                      value={data.location.mode}
                      onChange={(e) =>
                        nested("location", "mode", e.target.value)
                      }
                    >
                      {[
                        "Vendor location",
                        "Customer location",
                        "Both",
                        "Service area",
                      ].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
              {step === 6 && (
                <>
                  <p className="text-sm font-medium mb-3">
                    Days of the week you accept bookings
                  </p>
                  <div
                    className="
                    flex gap-[9px] [margin:16px_0_25px] flex-wrap [&_button]:[background:#fff]
                    [&_button]:[border-top:1px_solid_var(--sm-border)]
                    [&_button]:[border-right:1px_solid_var(--sm-border)]
                    [&_button]:[border-bottom:1px_solid_var(--sm-border)]
                    [&_button]:[border-left:1px_solid_var(--sm-border)] [&_button]:rounded-[8px]
                    [&_button]:[padding:10px_14px] [&_button]:text-[#8b9980] [&_button.selected]:[background:#eaf3e5]
                    [&_button.selected]:[border-color:#6f9463] [&_button.selected]:text-[#346144] flex flex-wrap gap-2
                    mb-6
                  "
                  >
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day, i) => (
                        <button
                          type="button"
                          key={day}
                          aria-pressed={data.availability.days.includes(i)}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                            data.availability.days.includes(i)
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-card text-muted-foreground hover:border-primary/50"
                          }`}
                          onClick={() =>
                            nested(
                              "availability",
                              "days",
                              data.availability.days.includes(i)
                                ? data.availability.days.filter((d) => d !== i)
                                : [...data.availability.days, i],
                            )
                          }
                        >
                          {day}
                        </button>
                      ),
                    )}
                  </div>
                  <div
                    className="
                    grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_input]:w-[100%] [&_input]:rounded-[7px]
                    [&_input]:[padding:10px_12px] [&_input]:[background:#fff] [&_input]:min-h-[40px] [&_select]:w-[100%]
                    [&_select]:rounded-[7px] [&_select]:[padding:10px_12px] [&_select]:[background:#fff]
                    [&_select]:min-h-[40px] [&_textarea]:w-[100%] [&_textarea]:rounded-[7px]
                    [&_textarea]:[padding:10px_12px] [&_textarea]:[background:#fff] [&_textarea]:min-h-[40px]
                    [&_textarea]:resize-y [&_.vw-field]:m-[0] service-mobile:grid-cols-[1fr] service-mobile:gap-[18px]
                  "
                  >
                    {field(
                      "availability",
                      "start",
                      "Daily service start time",
                      "time",
                    )}
                    {field("availability", "end", "Daily service end time", "time")}
                    {field(
                      "availability",
                      "advanceDays",
                      "How far ahead customers can book (days)",
                      "number",
                    )}
                    {field(
                      "availability",
                      "noticeHours",
                      "Minimum notice before a booking (hours)",
                      "number",
                    )}
                  </div>
                  {id ? (
                    <Link
                      className="
                        vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                        [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                        rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                        font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                        [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                        [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                        [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                        [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                        mt-6 inline-flex items-center gap-2
                      "
                      to={`/vendor/services/${id}/availability`}
                    >
                      Manage blocked dates, holidays & custom timings
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-4 italic">
                      Save a draft to open your service calendar and block
                      unavailable dates.
                    </p>
                  )}
                </>
              )}
              {step === 7 && (
                <div
                  className="
                  grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_input]:w-[100%] [&_input]:rounded-[7px]
                  [&_input]:[padding:10px_12px] [&_input]:[background:#fff] [&_input]:min-h-[40px] [&_select]:w-[100%]
                  [&_select]:rounded-[7px] [&_select]:[padding:10px_12px] [&_select]:[background:#fff]
                  [&_select]:min-h-[40px] [&_textarea]:w-[100%] [&_textarea]:rounded-[7px]
                  [&_textarea]:[padding:10px_12px] [&_textarea]:[background:#fff] [&_textarea]:min-h-[40px]
                  [&_textarea]:resize-y [&_.vw-field]:m-[0] service-mobile:grid-cols-[1fr] service-mobile:gap-[18px]
                "
                >
                  {[
                    ["cancellation", "Booking cancellation policy"],
                    ["refund", "Customer refund policy"],
                    ["rescheduling", "Booking date change policy"],
                    ["additionalCharges", "Extra fee conditions"],
                    ["terms", "Service terms and conditions"],
                  ].map(([k, l]) => area("policies", k, l))}
                  <label
                    className="
                    flex gap-[9px] items-center text-[#61765f] text-[12px] [&_input[type=checkbox]]:w-[16px]
                    [&_input[type=checkbox]]:h-[16px] [&_input[type=checkbox]]:min-h-[0]
                    [&_input[type=checkbox]]:[accent-color:#396d4d] flex items-center gap-2 py-2 cursor-pointer
                  "
                  >
                    <input
                      type="checkbox"
                      checked={data.policies.advanceRequired}
                      onChange={(e) =>
                        nested("policies", "advanceRequired", e.target.checked)
                      }
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="text-sm font-medium">
                      Advance Payment Required
                    </span>
                  </label>
                  {[
                    ["advancePercentage", "Advance payment required (%)"],
                    ["travelCharges", "Travel fee in booking policy (INR)"],
                    ["setupTime", "Setup time before the service (minutes)"],
                    ["duration", "Total service duration (minutes)"],
                  ].map(([k, l]) =>
                    field("policies", k, l, "number", {
                      max: k === "advancePercentage" ? 100 : 1000000,
                    }),
                  )}
                </div>
              )}
              {step === 7 && (
                <div
                  className="
                  grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px] [&_input]:w-[100%] [&_input]:rounded-[7px]
                  [&_input]:[padding:10px_12px] [&_input]:[background:#fff] [&_input]:min-h-[40px] [&_select]:w-[100%]
                  [&_select]:rounded-[7px] [&_select]:[padding:10px_12px] [&_select]:[background:#fff]
                  [&_select]:min-h-[40px] [&_textarea]:w-[100%] [&_textarea]:rounded-[7px]
                  [&_textarea]:[padding:10px_12px] [&_textarea]:[background:#fff] [&_textarea]:min-h-[40px]
                  [&_textarea]:resize-y [&_.vw-field]:m-[0] service-mobile:grid-cols-[1fr] service-mobile:gap-[18px]
                "
                >
                  {field("seo", "title", "Search engine listing title")}
                  {area("seo", "description", "Search engine listing description")}
                  {field("seo", "keywords", "Search keywords (comma separated)")}
                  {field("seo", "slug", "Service page URL name (slug)")}
                  <p className="text-[#8f9c84] text-[11px] text-xs text-muted-foreground italic">
                    Use lowercase letters, numbers and hyphens. Every service
                    URL must be globally unique.
                  </p>
                </div>
              )}
              {step === 8 && (
                <ServicePreview
                  service={{
                    ...data,
                    id,
                    ...(current ? { images: current.images } : {}),
                    price: pricePreview(),
                  }}
                  category={category?.name}
                  categoryFields={template}
                  vendorName={metadata.data.vendorName}
                />
              )}
            </div>
          </Panel>

          {/* Enhanced Sticky Actions Bar */}
          <div
            className="
            sticky bottom-[12px] [background:#fff] [border-top:1px_solid_var(--sm-border)]
            [border-right:1px_solid_var(--sm-border)] [border-bottom:1px_solid_var(--sm-border)]
            [border-left:1px_solid_var(--sm-border)] [box-shadow:0_5px_30px_#2a462514] rounded-[9px] flex
            items-center justify-between p-[16px] gap-[10px] z-[3] mt-[20px] [&_>_span]:text-[10px]
            [&_>_span]:text-[#a09064] [&_>_div]:flex [&_>_div]:gap-[8px] service-tablet:[&_>_span]:hidden
            service-mobile:p-[10px] service-mobile:bottom-[6px] service-mobile:[&_>_div]:w-[100%]
            service-mobile:[&_>_div]:justify-between service-mobile:[&_>_div]:gap-[5px]
            service-mobile:[&_.vw-button]:text-[10px] service-mobile:[&_.vw-button]:p-[9px]
            service-mobile:[&_svg]:w-[12px] mt-6 p-4 rounded-2xl bg-card border shadow-lg flex items-center
            justify-between sticky bottom-4 z-20 backdrop-blur-md bg-card/95
          "
          >
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${dirty ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}
              />
              {dirty
                ? "Unsaved changes"
                : id
                  ? "Draft saved successfully"
                  : "Your listing is private"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="
                  vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                  [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                  rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                  font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                  [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                  [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                  [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                  [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                  flex items-center gap-1
                "
                disabled={busy || step === 0}
                onClick={() => goToStep(step - 1)}
              >
                <ArrowLeft size={15} />
                Back
              </button>
              <button
                type="button"
                className="
                  vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                  [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                  rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                  font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                  [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                  [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                  [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                  [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                  flex items-center gap-1
                "
                disabled={busy}
                onClick={() => persist()}
              >
                <Save size={15} />
                {busy ? "Saving…" : "Save Draft"}
              </button>
              {step !== 8 && (
                <button
                  type="button"
                  className="
                vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
              "
                  disabled={busy}
                  onClick={() => goToStep(8)}
                >
                  Preview
                </button>
              )}
              {step < 8 ? (
                <button
                  type="submit"
                  className="
                    vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                    [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                    rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                    font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                    [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                    [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                    [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                    [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                    vw-primary flex items-center gap-1
                  "
                  disabled={busy}
                >
                  Continue
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="
                    vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                    [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                    rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                    font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                    [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                    [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                    [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                    [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                    vw-primary flex items-center gap-1.5
                  "
                  disabled={busy || !metadata.data.canSubmit}
                >
                  <Send size={15} />
                  Submit for Approval
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
