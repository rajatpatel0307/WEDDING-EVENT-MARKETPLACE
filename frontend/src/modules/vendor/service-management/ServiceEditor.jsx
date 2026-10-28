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
  ShieldCheck,
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
import MediaManager from "./MediaManager";
import { ServicePreview } from "./ServiceDetails";

export default function ServiceEditor() {
  const params = useParams(),
    navigate = useNavigate(),
    [search] = useSearchParams(),
    metadata = useVendorData("/services/metadata");
  const [id, setId] = useState(params.id || null),
    [data, setData] = useState(blank),
    [step, setStep] = useState(
      Math.min(9, Math.max(0, Number(search.get("step")) || 0)),
    ),
    [current, setCurrent] = useState(null),
    [dirty, setDirty] = useState(false),
    [loading, setLoading] = useState(!!params.id),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const form = useRef(null);
  useUnsaved(dirty);

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
    setStep(Math.min(9, Math.max(0, Number(search.get("step")) || 0)));
  }, [search]);

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
    <Field key={key} label={label}>
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
    <Field key={key} label={label}>
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
    }
  };

  if (loading || metadata.loading) return <Loading />;
  if (metadata.error)
    return <ErrorView error={metadata.error} retry={metadata.retry} />;
  if (params.id && !current && error)
    return (
      <ErrorView
        error={new Error(error)}
        retry={() => window.location.reload()}
      />
    );
  if (current && !current.actions.edit)
    return (
      <div className="sm-page">
        <Heading
          title="Service editing is locked"
          description="Editing is unavailable while a service is under review or suspended."
        />
        <Link className="vw-button mt-4" to={`/vendor/services/${id}`}>
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
      (subtotal * (1 - Number(p.discount) / 100) + Number(p.additionalCharges)) * (1 + Number(p.taxRate || 0) / 100)
    );
  };

  return (
    <div className="sm-page animate-fade-in">
      <Link className="sm-back inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-2" to="/vendor/services">
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
        <div className="sm-warning flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 p-4 rounded-xl mb-4">
          <AlertTriangle size={18} className="shrink-0 text-amber-600" />
          <span>Changes require admin approval. Saving will withdraw this listing until it is reviewed again.</span>
        </div>
      )}

      {current?.status === "Rejected" && (
        <div className="sm-rejected bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl mb-4">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <AlertTriangle size={18} />
            <strong>Service Rejected</strong>
          </div>
          <p className="text-sm opacity-90">{current.rejectionReason}</p>
          {current.adminNote && <p className="text-sm opacity-90 mt-1">Note: {current.adminNote}</p>}
          <span className="text-xs font-medium block mt-2 opacity-75">Edit your service, then submit it for another review.</span>
        </div>
      )}

      {!metadata.data.canSubmit && (
        <div className="sm-warning flex items-center gap-2 bg-primary/5 border border-primary/20 p-4 rounded-xl mb-4">
          <Info size={18} className="shrink-0 text-primary" />
          <span>Save your work as a draft. Submission becomes available after your business is approved.</span>
        </div>
      )}

      <div className="sm-editor-layout">
        {/* Enhanced Interactive Stepper Sidebar */}
        <aside className="sm-stepper">
          <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-muted-foreground tracking-wider">
            <Sparkles size={14} className="text-primary" />
            <span>BUILD YOUR LISTING</span>
          </div>
          {steps.map((name, i) => (
            <button
              type="button"
              key={name}
              className={`${step === i ? "current ring-1 ring-primary/30 bg-primary/5" : ""} ${step > i ? "done opacity-80" : ""} transition-all duration-200`}
              onClick={() => setStep(i)}
            >
              <b className={step === i ? "bg-primary text-primary-foreground shadow-sm" : ""}>
                {step > i ? (
                  <Check size={14} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </b>
              <div>
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
          <div className="sm-stepper-note mt-4 p-4 rounded-xl bg-muted/40 border border-border/50 flex flex-col gap-2">
            <ShieldCheck size={22} className="text-primary" />
            <p className="text-xs text-muted-foreground leading-relaxed">Your work stays private until approved and activated.</p>
          </div>
        </aside>

        <form
          ref={form}
          className="sm-editor-content"
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 9) setStep((v) => v + 1);
            else persist(true);
          }}
        >
          <Panel
            title={`${String(step + 1).padStart(2, "0")} / ${steps[step]}`}
            description={`Step ${step + 1} of 10 · ${step === 9 ? "Review everything before submitting." : "Every detail helps customers choose with confidence."}`}
          >
            <div className="sm-form-body">
              {step === 0 && (
                <div className="sm-form-grid">
                  <Field label="Service Name *">
                    <input
                      required
                      maxLength={200}
                      value={data.name}
                      placeholder="e.g. Royal Garden Wedding Venue"
                      onChange={(e) => change("name", e.target.value)}
                    />
                  </Field>
                  <Field label="Service Type">
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
                  <Field label="Category *">
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
                  {!metadata.data.categories.length && (
                    <p className="sm-warning text-sm text-destructive bg-destructive/10 p-3 rounded-lg" role="alert">
                      No service categories are assigned to your business yet.{" "}
                      <Link to="/vendor/business/profile" className="underline font-semibold">
                        Update your business profile
                      </Link>{" "}
                      before creating a service.
                    </p>
                  )}
                  {data.categoryId &&
                    !metadata.data.categories.some(
                      (c) => c.id === data.categoryId,
                    ) && (
                      <p className="sm-warning text-sm text-amber-700 bg-amber-500/10 p-3 rounded-lg" role="alert">
                        This category is not assigned to your business. Choose
                        an assigned category or update your{" "}
                        <Link to="/vendor/business/profile" className="underline font-semibold">
                          business profile
                        </Link>
                        .
                      </p>
                    )}
                  <Field label="Subcategory">
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
                    label="Short Description"
                    hint="A concise introduction, up to 500 characters."
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
                    label="Detailed Description"
                    hint="At least 20 characters are required before submission."
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
                    Choose a category in Basic information to see its custom fields.
                  </p>
                ) : (
                  <div>
                    <div className="sm-category-label font-bold text-primary mb-4 pb-2 border-b">{category.name} Specifications</div>
                    <div className="sm-form-grid">
                      {template.map((f) =>
                        f.type === "boolean" ? (
                          <label key={f.key} className="sm-checkbox flex items-center gap-2 cursor-pointer py-1">
                            <input
                              type="checkbox"
                              checked={!!data.attributes[f.key]}
                              onChange={(e) =>
                                nested("attributes", f.key, e.target.checked)
                              }
                              className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                            />
                            <span className="text-sm font-medium">{f.label}</span>
                          </label>
                        ) : (
                          <Field key={f.key} label={f.label}>
                            {f.type === "select" ? (
                              <select
                                value={data.attributes[f.key] || ""}
                                onChange={(e) =>
                                  nested("attributes", f.key, e.target.value)
                                }
                              >
                                <option value="">Select option</option>
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
                  <div className="sm-form-grid">
                    {[
                      ["basePrice", "Base Price"],
                      ["unitPrice", "Unit Price"],
                      ["minimumQuantity", "Minimum Quantity"],
                      ["maximumQuantity", "Maximum Quantity"],
                      ["discount", "Discount (%)"],
                      ["taxRate", "Tax (%)"],
                      ["specialPrice", "Special Price (optional)"],
                      ["weekendPrice", "Weekend Price (optional)"],
                      ["seasonalPrice", "Seasonal Price (optional)"],
                      ["additionalCharges", "Additional Charges"],
                    ].map(([key, label]) =>
                      field("pricing", key, label, "number", {
                        max: ["discount", "taxRate"].includes(key) ? 100 : 100000000,
                      }),
                    )}
                    <Field label="Pricing Unit">
                      <select
                        value={data.pricing.unit}
                        onChange={(e) =>
                          nested("pricing", "unit", e.target.value)
                        }
                      >
                        {units.map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </Field>
                    {field("pricing", "seasonalFrom", "Season starts", "date")}
                    {field("pricing", "seasonalTo", "Season ends", "date")}
                  </div>
                  <div className="sm-price-preview mt-6 p-5 rounded-xl bg-primary/5 border border-primary/20 flex flex-col gap-1.5">
                    <span className="text-xs font-bold tracking-wider text-primary">ESTIMATED STARTING PRICE</span>
                    <strong className="text-2xl font-extrabold">{money(pricePreview())}</strong>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Base or special price + unit price × minimum quantity −
                      discount + additional charges. Weekend and seasonal prices
                      apply on matching dates. The server validates and
                      recalculates the final price.
                    </p>
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tell customers exactly what’s included and what they can add as optional items.
                  </p>
                  <div className="flex flex-col gap-4">
                    {data.items.map((item, i) => (
                      <div className="sm-item-editor p-4 rounded-xl border bg-card shadow-sm" key={i}>
                        <div className="sm-item-title flex items-center justify-between pb-3 mb-3 border-b">
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
                        <div className="sm-form-grid">
                          {[
                            ["name", "Item Name", "text"],
                            ["description", "Description", "text"],
                            ["quantity", "Quantity", "number"],
                            ["unit", "Unit", "text"],
                            ["price", "Price", "number"],
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
                          <label className="sm-checkbox flex items-center gap-2 pt-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.included}
                              onChange={(e) =>
                                itemChange(i, "included", e.target.checked)
                              }
                              className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                            />
                            <span className="text-sm font-medium">Included in service (otherwise optional add-on)</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="vw-button mt-4 flex items-center gap-2"
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
                      Image changes are saved immediately. Save other form changes before uploading.
                    </p>
                    {dirty ? (
                      <div className="p-6 rounded-xl border bg-muted/30 text-center flex flex-col items-center gap-3">
                        <p className="text-sm font-medium">You have unsaved changes in your listing.</p>
                        <button
                          type="button"
                          className="vw-button vw-primary"
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
                  <div className="sm-save-first p-8 rounded-2xl border bg-card text-center flex flex-col items-center gap-3 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                      <Sparkles size={24} />
                    </div>
                    <h3 className="text-lg font-bold">Give your listing a home first</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Save a draft to securely upload and manage your professional service images.
                    </p>
                    <button
                      type="button"
                      className="vw-button vw-primary mt-2 flex items-center gap-2"
                      disabled={busy}
                      onClick={() => persist()}
                    >
                      <Save size={16} />
                      Save Draft & Add Images
                    </button>
                  </div>
                ))}
              {step === 5 && (
                <div className="sm-form-grid">
                  {[
                    ["address", "Address"],
                    ["city", "City"],
                    ["state", "State"],
                    ["country", "Country"],
                    ["zip", "ZIP Code"],
                  ].map(([k, l]) => field("location", k, l))}
                  {field("location", "latitude", "Latitude", "number", {
                    min: -90,
                    max: 90,
                  })}
                  {field("location", "longitude", "Longitude", "number", {
                    min: -180,
                    max: 180,
                  })}
                  <Field label="Service availability location">
                    <select
                      value={data.location.mode}
                      onChange={(e) =>
                        nested("location", "mode", e.target.value)
                      }
                    >
                      {["Vendor location", "Customer location", "Both"].map(
                        (o) => (
                          <option key={o}>{o}</option>
                        ),
                      )}
                    </select>
                  </Field>
                </div>
              )}
              {step === 6 && (
                <>
                  <p className="text-sm font-medium mb-3">Available working days</p>
                  <div className="sm-days flex flex-wrap gap-2 mb-6">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day, i) => (
                        <button
                          type="button"
                          key={day}
                          aria-pressed={data.availability.days.includes(i)}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${data.availability.days.includes(i)
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
                  <div className="sm-form-grid">
                    {field(
                      "availability",
                      "start",
                      "Working hours start",
                      "time",
                    )}
                    {field("availability", "end", "Working hours end", "time")}
                    {field(
                      "availability",
                      "advanceDays",
                      "Advance booking period (days)",
                      "number",
                    )}
                    {field(
                      "availability",
                      "noticeHours",
                      "Minimum notice (hours)",
                      "number",
                    )}
                  </div>
                  {id ? (
                    <Link
                      className="vw-button mt-6 inline-flex items-center gap-2"
                      to={`/vendor/services/${id}/availability`}
                    >
                      Manage blocked dates, holidays & custom timings
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-4 italic">
                      Save a draft to open your service calendar and block unavailable dates.
                    </p>
                  )}
                </>
              )}
              {step === 7 && (
                <div className="sm-form-grid">
                  {[
                    ["cancellation", "Cancellation Policy"],
                    ["refund", "Refund Policy"],
                    ["rescheduling", "Rescheduling Policy"],
                    ["additionalCharges", "Additional Charges"],
                    ["terms", "Terms & Conditions"],
                  ].map(([k, l]) => area("policies", k, l))}
                  <label className="sm-checkbox flex items-center gap-2 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.policies.advanceRequired}
                      onChange={(e) =>
                        nested("policies", "advanceRequired", e.target.checked)
                      }
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="text-sm font-medium">Advance Payment Required</span>
                  </label>
                  {[
                    ["advancePercentage", "Advance Percentage"],
                    ["travelCharges", "Travel Charges"],
                    ["setupTime", "Setup Time (minutes)"],
                    ["duration", "Service Duration (minutes)"],
                  ].map(([k, l]) =>
                    field("policies", k, l, "number", {
                      max: k === "advancePercentage" ? 100 : 1000000,
                    }),
                  )}
                </div>
              )}
              {step === 8 && (
                <div className="sm-form-grid">
                  {field("seo", "title", "SEO Title")}
                  {area("seo", "description", "SEO Description")}
                  {field("seo", "keywords", "SEO Keywords")}
                  {field("seo", "slug", "URL Slug")}
                  <p className="sm-muted text-xs text-muted-foreground italic">
                    Use lowercase letters, numbers and hyphens. Every service URL must be globally unique.
                  </p>
                </div>
              )}
              {step === 9 && (
                <ServicePreview
                  service={{
                    ...data,
                    ...(current ? { images: current.images } : {}),
                    price: pricePreview(),
                  }}
                  category={category?.name}
                  vendorName={metadata.data.vendorName}
                />
              )}
            </div>
          </Panel>

          {error && (
            <div className="sm-error mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2" role="alert">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Enhanced Sticky Actions Bar */}
          <div className="sm-sticky-actions mt-6 p-4 rounded-2xl bg-card border shadow-lg flex items-center justify-between sticky bottom-4 z-20 backdrop-blur-md bg-card/95">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${dirty ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
              {dirty
                ? "Unsaved changes"
                : id
                  ? "Draft saved successfully"
                  : "Your listing is private"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="vw-button flex items-center gap-1"
                disabled={busy || step === 0}
                onClick={() => setStep((v) => v - 1)}
              >
                <ArrowLeft size={15} />
                Back
              </button>
              <button
                type="button"
                className="vw-button flex items-center gap-1"
                disabled={busy}
                onClick={() => persist()}
              >
                <Save size={15} />
                {busy ? "Saving…" : "Save Draft"}
              </button>
              {step < 9 ? (
                <button
                  type="submit"
                  className="vw-button vw-primary flex items-center gap-1"
                  disabled={busy}
                >
                  Continue
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="vw-button vw-primary flex items-center gap-1.5"
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