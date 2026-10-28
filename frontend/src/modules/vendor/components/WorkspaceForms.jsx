import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, Check, ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  Empty,
  ErrorView,
  Field,
  Heading,
  Image,
  Loading,
  Modal,
  Panel,
  useVendorData,
} from "./WorkspaceUI";
import {
  money,
  readFile,
  save,
  today,
  vendorRequest,
} from "../services/workspace.api";

export function ImageUpload({ kind, src, onUploaded, onBusy }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(src);
  useEffect(() => setPreview(src), [src]);
  return (
    <div className="vw-image-upload">
      <Image
        key={preview}
        src={preview}
        alt="Service"
        className="vw-upload-preview"
      />
      <label>
        <ImagePlus size={18} />
        <strong>{busy ? "Uploading image…" : "Choose an image"}</strong>
        <span>PNG or JPEG · Up to 5 MB</span>
        <input
          type="file"
          accept="image/png,image/jpeg"
          disabled={busy}
          onChange={async (e) => {
            const input = e.target,
              file = input.files?.[0];
            if (!file) return;
            setBusy(true);
            onBusy?.(true);
            setError("");
            try {
              if (!["image/png", "image/jpeg"].includes(file.type))
                throw new Error("Choose a PNG or JPEG image.");
              const result = await save("/images", "POST", {
                kind,
                base64: await readFile(file),
              });
              setPreview(result.url);
              onUploaded(result);
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
              onBusy?.(false);
              input.value = "";
            }
          }}
        />
      </label>
      {error && (
        <p className="vw-form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
const inputNumber = (value) =>
  value === "" || value === null || value === undefined ? null : Number(value);
export { default as ServiceForm } from "../service-management/ServiceEditor";

function PackageItems({ items, onChange }) {
  return (
    <div className="vw-line-items">
      {items.map((item, index) => (
        <div className="vw-item-row" key={index}>
          <Field label={`Item ${index + 1}`}>
            <input
              value={item.name}
              required
              maxLength={200}
              onChange={(e) =>
                onChange(
                  items.map((x, i) =>
                    i === index ? { ...x, name: e.target.value } : x,
                  ),
                )
              }
              placeholder="Included service or deliverable"
            />
          </Field>
          <Field label="Quantity">
            <input
              type="number"
              min={0}
              step=".001"
              value={item.quantity ?? ""}
              onChange={(e) =>
                onChange(
                  items.map((x, i) =>
                    i === index
                      ? { ...x, quantity: inputNumber(e.target.value) }
                      : x,
                  ),
                )
              }
            />
          </Field>
          <Field label="Unit">
            <input
              value={item.unit || ""}
              maxLength={50}
              onChange={(e) =>
                onChange(
                  items.map((x, i) =>
                    i === index ? { ...x, unit: e.target.value } : x,
                  ),
                )
              }
              placeholder="hours, pieces…"
            />
          </Field>
          <button
            type="button"
            className="vw-icon"
            aria-label={`Remove item ${index + 1}`}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="vw-button"
        disabled={items.length >= 100}
        onClick={() =>
          onChange([
            ...items,
            { name: "", description: "", quantity: 1, unit: "" },
          ])
        }
      >
        <Plus size={14} /> Add package item
      </button>
    </div>
  );
}
export function PackageForm() {
  const { id } = useParams(),
    navigate = useNavigate(),
    { notify } = useAuth(),
    catalog = useVendorData("/catalog");
  const [values, setValues] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setValues(null);
    setError("");
    if (!id) {
      setValues({
        serviceId: "",
        name: "",
        description: "",
        price: "",
        discount: 0,
        minimumGuests: "",
        maximumGuests: "",
        duration: "",
        featured: false,
        active: true,
        items: [],
      });
      return;
    }
    vendorRequest(`/packages/${id}`)
      .then((v) => {
        if (live) setValues(v);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id]);
  if (catalog.error)
    return <ErrorView error={catalog.error} retry={catalog.retry} />;
  if (error && !values) return <div className="vw-error">{error}</div>;
  if (!values || !catalog.data) return <Loading />;
  const update = (key, value) => setValues((old) => ({ ...old, [key]: value }));
  return (
    <>
      <Heading
        title={id ? "Edit service package" : "Create a service package"}
        description="Bundle the details into an experience customers can picture."
      />
      <form
        className="vw-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const { id: _id, updatedAt, ...rest } = values;
            const result = await save(
              `/packages${id ? `/${id}` : ""}`,
              id ? "PUT" : "POST",
              {
                ...rest,
                price: Number(values.price),
                discount: Number(values.discount),
                minimumGuests: inputNumber(values.minimumGuests),
                maximumGuests: inputNumber(values.maximumGuests),
                duration: inputNumber(values.duration),
                ...(updatedAt ? { expectedUpdatedAt: updatedAt } : {}),
              },
            );
            notify(result.message);
            navigate("/vendor/packages");
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Panel title="Package details">
          <div className="vw-form-body">
            {error && (
              <p className="vw-form-error" role="alert">
                {error}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Package name">
                <input
                  value={values.name}
                  required
                  minLength={2}
                  maxLength={200}
                  onChange={(e) => update("name", e.target.value)}
                />
              </Field>
              <Field label="Service">
                <select
                  value={values.serviceId}
                  required
                  onChange={(e) => update("serviceId", e.target.value)}
                >
                  <option value="">Choose your service</option>
                  {catalog.data.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Description">
              <textarea
                value={values.description}
                rows={3}
                maxLength={5000}
                onChange={(e) => update("description", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              {[
                ["price", "Original price (INR)"],
                ["discount", "Discount (%)"],
                ["minimumGuests", "Minimum guests"],
                ["maximumGuests", "Maximum guests"],
                ["duration", "Duration (minutes)"],
              ].map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    type="number"
                    min={0}
                    step={key === "price" || key === "discount" ? ".01" : 1}
                    max={key === "discount" ? 100 : undefined}
                    required={["price", "discount"].includes(key)}
                    value={values[key] ?? ""}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
            <div className="vw-package-price">
              <span>Final package price</span>
              <strong>
                {money(
                  Number(values.price || 0) *
                    (1 - Number(values.discount || 0) / 100),
                )}
              </strong>
              <small>Original price less the package discount.</small>
            </div>
            <div className="flex flex-wrap gap-6">
              {[
                ["featured", "Mark as featured"],
                ["active", "Package is active"],
              ].map(([key, label]) => (
                <label className="vw-check-field" key={key}>
                  <input
                    type="checkbox"
                    checked={values[key]}
                    onChange={(e) => update(key, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </Panel>
        <Panel
          title="What's included"
          description="List the items and quantities that make this package special."
        >
          <div className="vw-form-body">
            <PackageItems
              items={values.items}
              onChange={(items) => update("items", items)}
            />
          </div>
        </Panel>
        <div className="vw-form-footer">
          <Link className="vw-button" to="/vendor/packages">
            Cancel
          </Link>
          <button className="vw-button vw-primary" disabled={busy}>
            <Save size={15} />
            {busy ? "Saving…" : "Save package"}
          </button>
        </div>
      </form>
    </>
  );
}

export function QuotationForm() {
  const { id } = useParams(),
    [params] = useSearchParams(),
    navigate = useNavigate(),
    { notify } = useAuth();
  const catalog = useVendorData("/catalog"),
    options = useVendorData("/quotation-options");
  const [values, setValues] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setValues(null);
    setError("");
    if (!id) {
      setValues({
        eventId: params.get("event") || "",
        validUntil: new Date(Date.now() + 7 * 86400000)
          .toISOString()
          .slice(0, 10),
        message: "",
        status: "Draft",
        items: [
          {
            serviceId: "",
            packageId: null,
            name: "",
            quantity: 1,
            price: 0,
            discount: 0,
            tax: 0,
          },
        ],
      });
      return;
    }
    vendorRequest(`/quotations/${id}`)
      .then((v) => {
        if (live)
          setValues({
            ...v,
            validUntil: v.validUntil?.slice(0, 10) || today(),
          });
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id, params]);
  if (catalog.error || options.error)
    return (
      <ErrorView
        error={catalog.error || options.error}
        retry={() => {
          catalog.retry();
          options.retry();
        }}
      />
    );
  if (error && !values) return <div className="vw-error">{error}</div>;
  if (!values || !catalog.data || !options.data) return <Loading />;
  const update = (key, value) => setValues((old) => ({ ...old, [key]: value }));
  const itemChange = (index, patch) =>
    update(
      "items",
      values.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    );
  const total = values.items.reduce(
    (sum, row) =>
      sum +
      Number(row.quantity) * Number(row.price) -
      Number(row.discount) +
      Number(row.tax),
    0,
  );
  return (
    <>
      <Heading
        title={id ? "Edit draft quotation" : "Create a quotation"}
        description="Turn an enquiry into a clear, considered proposal."
      />
      <form
        className="vw-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const { id: _id, updatedAt, ...body } = values;
            const result = await save(
              `/quotations${id ? `/${id}` : ""}`,
              id ? "PUT" : "POST",
              {
                ...body,
                items: values.items.map((line) => ({
                  ...line,
                  quantity: Number(line.quantity),
                  price: Number(line.price),
                  discount: Number(line.discount),
                  tax: Number(line.tax),
                })),
                ...(updatedAt ? { expectedUpdatedAt: updatedAt } : {}),
              },
            );
            notify(result.message);
            navigate(
              values.status === "Draft"
                ? "/vendor/quotations/drafts"
                : "/vendor/quotations/sent",
            );
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Panel title="Customer & event">
          <div className="vw-form-body">
            {error && (
              <p className="vw-form-error" role="alert">
                {error}
              </p>
            )}
            {!options.data.events.length && (
              <p className="vw-form-note">
                No customer events are available yet. Open a booking enquiry or
                customer conversation first.
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Customer event">
                <select
                  value={values.eventId}
                  required
                  onChange={(e) => update("eventId", e.target.value)}
                >
                  <option value="">Select an event</option>
                  {options.data.events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.customer} · {event.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Valid until">
                <input
                  type="date"
                  min={today()}
                  value={values.validUntil}
                  required
                  onChange={(e) => update("validUntil", e.target.value)}
                />
              </Field>
            </div>
            <Field label="A message for your customer">
              <textarea
                rows={3}
                maxLength={5000}
                value={values.message}
                onChange={(e) => update("message", e.target.value)}
              />
            </Field>
          </div>
        </Panel>
        <Panel
          title="Quotation items"
          description="Select your own services and packages. All amounts are in INR."
        >
          <div className="vw-form-body vw-quote-items">
            {values.items.map((line, index) => (
              <article key={index}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Service">
                    <select
                      value={line.serviceId}
                      required
                      onChange={(e) => {
                        const service = catalog.data.services.find(
                          (s) => s.id === e.target.value,
                        );
                        itemChange(index, {
                          serviceId: e.target.value,
                          packageId: null,
                          name: service?.name || "",
                          price: Number(service?.price || 0),
                        });
                      }}
                    >
                      <option value="">Select service</option>
                      {catalog.data.services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Package (optional)">
                    <select
                      value={line.packageId || ""}
                      onChange={(e) => {
                        const p = options.data.packages.find(
                          (p) => p.id === e.target.value,
                        );
                        itemChange(index, {
                          packageId: p?.id || null,
                          ...(p
                            ? { price: Number(p.price), name: p.name }
                            : {}),
                        });
                      }}
                    >
                      <option value="">Custom line item</option>
                      {options.data.packages
                        .filter((p) => p.serviceId === line.serviceId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                </div>
                <Field label="Item name">
                  <input
                    value={line.name}
                    required
                    maxLength={200}
                    onChange={(e) =>
                      itemChange(index, { name: e.target.value })
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    ["quantity", "Quantity"],
                    ["price", "Unit price"],
                    ["discount", "Discount amount"],
                    ["tax", "Tax amount"],
                  ].map(([key, label]) => (
                    <Field key={key} label={label}>
                      <input
                        type="number"
                        value={line[key]}
                        min={key === "quantity" ? 0.001 : 0}
                        max={100000000}
                        step={key === "quantity" ? ".001" : ".01"}
                        required
                        onChange={(e) =>
                          itemChange(index, { [key]: e.target.value })
                        }
                      />
                    </Field>
                  ))}
                </div>
                <button
                  className="vw-text-link"
                  type="button"
                  disabled={values.items.length === 1}
                  onClick={() =>
                    update(
                      "items",
                      values.items.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 size={13} /> Remove item
                </button>
              </article>
            ))}
            <button
              className="vw-button"
              type="button"
              disabled={values.items.length >= 100}
              onClick={() =>
                update("items", [
                  ...values.items,
                  {
                    serviceId: "",
                    packageId: null,
                    name: "",
                    quantity: 1,
                    price: 0,
                    discount: 0,
                    tax: 0,
                  },
                ])
              }
            >
              <Plus size={14} /> Add line item
            </button>
            <div className="vw-quotation-total">
              <span>Total quotation</span>
              <strong>{money(total)}</strong>
            </div>
          </div>
        </Panel>
        <div className="vw-form-footer">
          <Field label="Save as">
            <select
              value={values.status === "Draft" ? "Draft" : "Sent"}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="Draft">Draft</option>
              <option value="Sent">Send to customer</option>
            </select>
          </Field>
          <div>
            <Link className="vw-button" to="/vendor/quotations/sent">
              Cancel
            </Link>
            <button
              className="vw-button vw-primary"
              disabled={busy || !options.data.events.length}
            >
              {busy
                ? "Saving…"
                : values.status === "Draft"
                  ? "Save draft"
                  : "Send quotation"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

const defaults = {
  locations: {
    address: "",
    line2: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
    primary: false,
    active: true,
  },
  items: {
    serviceId: "",
    name: "",
    description: "",
    quantity: 1,
    unit: "",
    price: "",
    included: true,
  },
  offers: {
    name: "",
    description: "",
    serviceId: null,
    discountType: "Percentage",
    discountValue: 10,
    minimumAmount: "",
    maximumDiscount: "",
    startDate: today(),
    endDate: "",
    active: true,
  },
  coupons: {
    name: "",
    description: "",
    serviceId: null,
    discountType: "Percentage",
    discountValue: 10,
    minimumAmount: "",
    maximumDiscount: "",
    usageLimit: "",
    startDate: today(),
    endDate: "",
    active: true,
  },
};
export function RecordEditor({ kind, row, close, onSaved }) {
  const { notify } = useAuth(),
    catalog = useVendorData("/catalog");
  const [values, setValues] = useState(row ? null : defaults[kind]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!row) return;
    let live = true;
    vendorRequest(`/${kind}/${row.id}`)
      .then((data) => {
        if (live) setValues(data);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [kind, row]);
  const change = (key, value) => setValues((old) => ({ ...old, [key]: value }));
  const field = (key, label, type = "text", props = {}) => (
    <Field key={key} label={label}>
      <input
        type={type}
        value={values[key] ?? ""}
        onChange={(e) => change(key, e.target.value)}
        {...props}
      />
    </Field>
  );
  return (
    <Modal
      title={`${row ? "Edit" : "Add"} ${kind === "items" ? "service item" : kind.slice(0, -1)}`}
      close={close}
      busy={busy}
    >
      <form
        className="vw-form vw-modal-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const body = { ...values };
            delete body.id;
            delete body.updatedAt;
            for (const key of [
              "quantity",
              "price",
              "discountValue",
              "minimumAmount",
              "maximumDiscount",
              "usageLimit",
            ])
              if (key in body) body[key] = inputNumber(body[key]);
            if (body.serviceId === "")
              body.serviceId = kind === "items" ? "" : null;
            if (values.updatedAt && kind === "locations")
              body.expectedUpdatedAt = values.updatedAt;
            const result = await save(
              `/${kind}${row ? `/${row.id}` : ""}`,
              row ? "PUT" : "POST",
              body,
            );
            notify(result.message);
            onSaved();
            close();
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && (
          <p className="vw-form-error" role="alert">
            {error}
          </p>
        )}
        {catalog.error && (
          <ErrorView error={catalog.error} retry={catalog.retry} />
        )}
        {!values || !catalog.data ? (
          <Loading />
        ) : (
          <>
            {kind === "locations" ? (
              <>
                {field("address", "Address", "text", {
                  required: true,
                  maxLength: 300,
                })}
                {field("line2", "Address line 2", "text", { maxLength: 300 })}
                <div className="grid grid-cols-2 gap-3">
                  {field("city", "City", "text", {
                    required: true,
                    maxLength: 100,
                  })}
                  {field("state", "State", "text", {
                    required: true,
                    maxLength: 100,
                  })}
                  {field("country", "Country", "text", {
                    required: true,
                    maxLength: 100,
                  })}
                  {field("postalCode", "Postal code", "text", {
                    maxLength: 20,
                  })}
                </div>
                <label className="vw-check-field">
                  <input
                    type="checkbox"
                    checked={values.primary}
                    onChange={(e) => change("primary", e.target.checked)}
                  />
                  Primary business location
                </label>
              </>
            ) : (
              <>
                {field(
                  "name",
                  kind === "coupons" ? "Coupon code" : "Name",
                  "text",
                  { required: true, maxLength: kind === "coupons" ? 50 : 200 },
                )}
                <Field label="Description">
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={values.description}
                    onChange={(e) => change("description", e.target.value)}
                  />
                </Field>
                {kind !== "coupons" && (
                  <Field
                    label={kind === "items" ? "Service" : "Service (optional)"}
                  >
                    <select
                      required={kind === "items"}
                      value={values.serviceId || ""}
                      onChange={(e) => change("serviceId", e.target.value)}
                    >
                      <option value="">
                        {kind === "items"
                          ? "Choose a service"
                          : "All vendor services"}
                      </option>
                      {catalog.data.services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {kind === "items" ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {field("quantity", "Quantity", "number", {
                        min: 0,
                        step: ".001",
                      })}
                      {field("unit", "Unit", "text", { maxLength: 50 })}
                      {field("price", "Unit price (INR)", "number", {
                        min: 0,
                        step: ".01",
                      })}
                    </div>
                    <label className="vw-check-field">
                      <input
                        type="checkbox"
                        checked={values.included}
                        onChange={(e) => change("included", e.target.checked)}
                      />
                      Included in service
                    </label>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Discount type">
                        <select
                          value={values.discountType}
                          onChange={(e) =>
                            change("discountType", e.target.value)
                          }
                        >
                          <option>Percentage</option>
                          <option>Fixed</option>
                        </select>
                      </Field>
                      {field("discountValue", "Discount value", "number", {
                        required: true,
                        min: 0,
                        max:
                          values.discountType === "Percentage"
                            ? 100
                            : 100000000,
                        step: ".01",
                      })}
                      {field("minimumAmount", "Minimum spend (INR)", "number", {
                        min: 0,
                        step: ".01",
                      })}
                      {field(
                        "maximumDiscount",
                        "Maximum discount (INR)",
                        "number",
                        { min: 0, step: ".01" },
                      )}
                      {field("startDate", "Start date", "date", {
                        required: true,
                      })}
                      {field("endDate", "End date", "date", {
                        required: true,
                        min: values.startDate,
                      })}
                      {kind === "coupons" &&
                        field(
                          "usageLimit",
                          "Usage limit (optional)",
                          "number",
                          { min: 1, step: 1 },
                        )}
                    </div>
                  </>
                )}
              </>
            )}
            {kind !== "items" && (
              <label className="vw-check-field">
                <input
                  type="checkbox"
                  checked={values.active}
                  onChange={(e) => change("active", e.target.checked)}
                />
                Active
              </label>
            )}
            <div className="vw-modal-actions">
              <button
                type="button"
                className="vw-button"
                onClick={close}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="vw-button vw-primary" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
