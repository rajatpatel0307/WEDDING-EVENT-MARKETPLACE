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
  const validate = () => {
    if (!data.name.trim() || !data.categoryId)
      throw new Error("Enter a service name and choose a category.");
    if (!data.seo.slug) throw new Error("Enter a URL slug in the SEO step.");
    if (data.pricing.maximumQuantity < data.pricing.minimumQuantity)
      throw new Error("Maximum quantity must be at least the minimum.");
    if (data.pricing.discount < 0 || data.pricing.discount > 100)
      throw new Error("Discount must be between 0 and 100.");
    if (data.availability.end <= data.availability.start)
      throw new Error("Working hours must end after they start.");
  };
  const persist = async (submit = false) => {
    setBusy(true);
    setError("");
    try {
      validate();
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
        <Link className="vw-button" to={`/vendor/services/${id}`}>
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
      subtotal * (1 - Number(p.discount) / 100) + Number(p.additionalCharges)
    );
  };
  return (
    <div className="sm-page">
      <Link className="sm-back" to="/vendor/services">
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
        <div className="sm-warning">
          Changes require admin approval. Saving will withdraw this listing
          until it is reviewed again.
        </div>
      )}
      {current?.status === "Rejected" && (
        <div className="sm-rejected">
          <strong>Service Rejected</strong>
          <p>{current.rejectionReason}</p>
          <p>{current.adminNote}</p>
          <span>Edit your service, then submit it for another review.</span>
        </div>
      )}
      {!metadata.data.canSubmit && (
        <div className="sm-warning">
          Save your work as a draft. Submission becomes available after your
          business is approved.
        </div>
      )}
      <div className="sm-editor-layout">
        <aside className="sm-stepper">
          <span>BUILD YOUR LISTING</span>
          {steps.map((name, i) => (
            <button
              type="button"
              key={name}
              className={`${step === i ? "current" : ""} ${step > i ? "done" : ""}`}
              onClick={() => setStep(i)}
            >
              <b>
                {step > i ? (
                  <Check size={14} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </b>
              <div>
                {name}
                <small>
                  {i === step
                    ? "You are here"
                    : i < step
                      ? "Previous step"
                      : "Coming up"}
                </small>
              </div>
            </button>
          ))}
          <div className="sm-stepper-note">
            <ShieldCheck size={24} />
            <p>Your work stays private until approved and activated.</p>
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
                  <p>
                    Choose a category in Basic information to see its fields.
                  </p>
                ) : (
                  <div>
                    <div className="sm-category-label">{category.name}</div>
                    <div className="sm-form-grid">
                      {template.map((f) =>
                        f.type === "boolean" ? (
                          <label key={f.key} className="sm-checkbox">
                            <input
                              type="checkbox"
                              checked={!!data.attributes[f.key]}
                              onChange={(e) =>
                                nested("attributes", f.key, e.target.checked)
                              }
                            />
                            {f.label}
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
                                <option value="">Select</option>
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
                      ["specialPrice", "Special Price (optional)"],
                      ["weekendPrice", "Weekend Price (optional)"],
                      ["seasonalPrice", "Seasonal Price (optional)"],
                      ["additionalCharges", "Additional Charges"],
                    ].map(([key, label]) =>
                      field("pricing", key, label, "number", {
                        max: key === "discount" ? 100 : 100000000,
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
                  <div className="sm-price-preview">
                    <span>ESTIMATED STARTING PRICE</span>
                    <strong>{money(pricePreview())}</strong>
                    <p>
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
                  <p>
                    Tell customers exactly what’s included and what they can
                    add.
                  </p>
                  {data.items.map((item, i) => (
                    <div className="sm-item-editor" key={i}>
                      <div className="sm-item-title">
                        <strong>Item {i + 1}</strong>
                        <div>
                          <button
                            type="button"
                            title="Move up"
                            disabled={i === 0}
                            onClick={() => moveItem(i, -1)}
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            title="Move down"
                            disabled={i === data.items.length - 1}
                            onClick={() => moveItem(i, 1)}
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            type="button"
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
                        <label className="sm-checkbox">
                          <input
                            type="checkbox"
                            checked={item.included}
                            onChange={(e) =>
                              itemChange(i, "included", e.target.checked)
                            }
                          />
                          Included in service (otherwise optional)
                        </label>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="vw-button"
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
                    <p>
                      Image changes are saved immediately. Save other form
                      changes before uploading.
                    </p>
                    {dirty ? (
                      <button
                        type="button"
                        className="vw-button vw-primary"
                        disabled={busy}
                        onClick={() => persist()}
                      >
                        Save changes to manage images
                      </button>
                    ) : (
                      <MediaManager id={id} onChanged={reloadMedia} />
                    )}
                  </>
                ) : (
                  <div className="sm-save-first">
                    <h3>Give your listing a home first</h3>
                    <p>
                      Save a draft to securely upload and manage your service
                      images.
                    </p>
                    <button
                      type="button"
                      className="vw-button vw-primary"
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
                  <p>Available days</p>
                  <div className="sm-days">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day, i) => (
                        <button
                          type="button"
                          key={day}
                          aria-pressed={data.availability.days.includes(i)}
                          className={
                            data.availability.days.includes(i) ? "selected" : ""
                          }
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
                      className="vw-button mt-5"
                      to={`/vendor/services/${id}/availability`}
                    >
                      Manage blocked dates, holidays & custom timings
                    </Link>
                  ) : (
                    <p>
                      Save a draft to open your service calendar and block
                      dates.
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
                  <label className="sm-checkbox">
                    <input
                      type="checkbox"
                      checked={data.policies.advanceRequired}
                      onChange={(e) =>
                        nested("policies", "advanceRequired", e.target.checked)
                      }
                    />
                    Advance Payment Required
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
                  <p className="sm-muted">
                    Use lowercase letters, numbers and hyphens. Every service
                    URL must be unique.
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
            <div className="sm-error" role="alert">
              {error}
            </div>
          )}
          <div className="sm-sticky-actions">
            <span>
              {dirty
                ? "Unsaved changes"
                : id
                  ? "Draft saved"
                  : "Your listing is private"}
            </span>
            <div>
              <button
                type="button"
                className="vw-button"
                disabled={busy || step === 0}
                onClick={() => setStep((v) => v - 1)}
              >
                <ArrowLeft size={15} />
                Back
              </button>
              <button
                type="button"
                className="vw-button"
                disabled={busy}
                onClick={() => persist()}
              >
                <Save size={15} />
                {busy ? "Saving…" : "Save Draft"}
              </button>
              {step < 9 ? (
                <button
                  type="submit"
                  className="vw-button vw-primary"
                  disabled={busy}
                >
                  Continue
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="vw-button vw-primary"
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
