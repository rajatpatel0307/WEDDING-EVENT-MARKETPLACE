import QuotationBuilder from "../../quotations/QuotationBuilder";
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
    <div className="
      grid gap-[14px] min-w-[0] [&_>_label]:flex [&_>_label]:items-center [&_>_label]:justify-center
      [&_>_label]:flex-col [&_>_label]:gap-[6px] [&_>_label]:[border-top:1px_dashed_#d7e3c9]
      [&_>_label]:[border-right:1px_dashed_#d7e3c9] [&_>_label]:[border-bottom:1px_dashed_#d7e3c9]
      [&_>_label]:[border-left:1px_dashed_#d7e3c9] [&_>_label]:rounded-[7px]
      [&_>_label]:[padding:22px_13px] [&_>_label]:text-[#a2b58c] [&_>_label]:[background:#fafcf5]
      [&_>_label]:relative [&_>_label]:cursor-pointer [&_>_label]:overflow-hidden [&_strong]:text-[10px]
      [&_strong]:font-medium [&_>_label_>_span]:text-[8px] [&_>_label_>_span]:text-[#bcc8aa]
      [&_input]:absolute [&_input]:[inset:0] [&_input]:w-[100%] [&_input]:h-[100%] [&_input]:opacity-[0]
      [&_input]:cursor-pointer
    ">
      <Image
        key={preview}
        src={preview}
        alt="Service"
        className="w-[100%] max-h-[220px] h-[170px] object-cover rounded-[7px]"
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
        <p className="
          vw-form-error [background:#fff4ee] [border-top:1px_solid_#f0ddcf] [border-right:1px_solid_#f0ddcf]
          [border-bottom:1px_solid_#f0ddcf] [border-left:1px_solid_#f0ddcf] text-[#b6836e]! [padding:12px_15px]
          rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]
        " role="alert">
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
    <div className="grid gap-[15px] [&_>_button]:[justify-self:start]">
      {items.map((item, index) => (
        <div className="
          grid grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)_minmax(0,_1fr)_29px] gap-[12px] [align-items:end]
          vendor-phone:grid-cols-[1fr_1fr] vendor-phone:[&_>_label:first-child]:col-[1/-1]
          vendor-phone:[&_>_button]:[justify-self:end]
        " key={index}>
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
            className="
              vw-icon inline-flex items-center justify-center shrink-0 w-[29px] h-[29px] text-[#99a38e]
              [background:none] [border-top:1px_solid_transparent] [border-right:1px_solid_transparent]
              [border-bottom:1px_solid_transparent] [border-left:1px_solid_transparent] rounded-[5px] p-[0]
              [&:hover]:[background:#edf3e4] [&:hover]:text-[#608146]
            "
            aria-label={`Remove item ${index + 1}`}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
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
  if (error && !values) return <div className="
    flex items-start gap-[12px] m-[15px] p-[19px] [border-top:1px_solid_#efdcd0]
    [border-right:1px_solid_#efdcd0] [border-bottom:1px_solid_#efdcd0] [border-left:1px_solid_#efdcd0]
    rounded-[8px] [background:#fff9f5] text-[#b78270] text-[12px] [&_>_div]:grid [&_>_div]:gap-[12px]
    [&_>_div]:[justify-items:start] [&_strong]:font-medium [&_a]:flex [&_a]:items-center [&_a]:gap-[5px]
  ">{error}</div>;
  if (!values || !catalog.data) return <Loading />;
  const update = (key, value) => setValues((old) => ({ ...old, [key]: value }));
  return (
    <>
      <Heading
        title={id ? "Edit service package" : "Create a service package"}
        description="Bundle the details into an experience customers can picture."
      />
      <form
        className="
          min-w-[0] [&_fieldset]:[border-top:0] [&_fieldset]:[border-right:0] [&_fieldset]:[border-bottom:0]
          [&_fieldset]:[border-left:0] [&_fieldset]:p-[0] [&_fieldset]:m-[0] [&_fieldset]:min-w-[0]
          [&_>_.vw-panel_+_.vw-panel]:mt-[22px]
        "
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
          <div className="[padding:0_24px_24px] grid gap-[19px] vendor-mobile:[padding:0_18px_20px]">
            {error && (
              <p className="
                vw-form-error [background:#fff4ee] [border-top:1px_solid_#f0ddcf] [border-right:1px_solid_#f0ddcf]
                [border-bottom:1px_solid_#f0ddcf] [border-left:1px_solid_#f0ddcf] text-[#b6836e]! [padding:12px_15px]
                rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]
              " role="alert">
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
            <div className="
              flex flex-col items-center gap-[7px] [border-top:1px_solid_#dfebd4] [border-right:1px_solid_#dfebd4]
              [border-bottom:1px_solid_#dfebd4] [border-left:1px_solid_#dfebd4] [background:#f0f6e7] p-[22px]
              rounded-[7px] text-[#89a070] [&_>_span]:text-[10px] [&_strong]:text-[29px] [&_strong]:text-[#6c8a53]
              [&_strong]:font-medium [&_small]:text-[8px] [&_small]:text-[#a9bd92]
            ">
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
                <label className="
                  inline-flex! items-center gap-[8px] text-[10px] text-[#8fa27c] font-normal [&_input]:w-[13px]!
                  [&_input]:h-[13px] [&_input]:p-[0] [&_input]:[accent-color:#79935d]
                " key={key}>
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
          <div className="[padding:0_24px_24px] grid gap-[19px] vendor-mobile:[padding:0_18px_20px]">
            <PackageItems
              items={values.items}
              onChange={(items) => update("items", items)}
            />
          </div>
        </Panel>
        <div className="
          flex items-center justify-between gap-[20px] mt-[23px] [padding:18px_0] [&_>_p]:flex
          [&_>_p]:items-center [&_>_p]:gap-[7px] [&_>_p]:text-[9px] [&_>_p]:text-[#a0b28e] [&_>_div]:flex
          [&_>_div]:items-center [&_>_div]:gap-[9px] vendor-mobile:items-start vendor-mobile:flex-col
          vendor-mobile:[&_>_div]:[align-self:flex-end] vendor-phone:[&_>_p]:text-[8px]
        ">
          <Link className="
            vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
            [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
            rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
            font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
            [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
            [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
            [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
            [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
          " to="/vendor/packages">
            Cancel
          </Link>
          <button className="
            vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
            [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
            rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
            font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
            [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
            [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
            [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
            [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
            vw-primary
          " disabled={busy}>
            <Save size={15} />
            {busy ? "Saving…" : "Save package"}
          </button>
        </div>
      </form>
    </>
  );
}

export function QuotationForm() {
  return <QuotationBuilder />;
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
        className="
          min-w-[0] [&_fieldset]:[border-top:0] [&_fieldset]:[border-right:0] [&_fieldset]:[border-bottom:0]
          [&_fieldset]:[border-left:0] [&_fieldset]:p-[0] [&_fieldset]:m-[0] [&_fieldset]:min-w-[0]
          [&_>_.vw-panel_+_.vw-panel]:mt-[22px] grid gap-[19px] [padding:22px_24px]
        "
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
          <p className="
            vw-form-error [background:#fff4ee] [border-top:1px_solid_#f0ddcf] [border-right:1px_solid_#f0ddcf]
            [border-bottom:1px_solid_#f0ddcf] [border-left:1px_solid_#f0ddcf] text-[#b6836e]! [padding:12px_15px]
            rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]
          " role="alert">
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
                <label className="
                  inline-flex! items-center gap-[8px] text-[10px] text-[#8fa27c] font-normal [&_input]:w-[13px]!
                  [&_input]:h-[13px] [&_input]:p-[0] [&_input]:[accent-color:#79935d]
                ">
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
                    <label className="
                      inline-flex! items-center gap-[8px] text-[10px] text-[#8fa27c] font-normal [&_input]:w-[13px]!
                      [&_input]:h-[13px] [&_input]:p-[0] [&_input]:[accent-color:#79935d]
                    ">
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
              <label className="
                inline-flex! items-center gap-[8px] text-[10px] text-[#8fa27c] font-normal [&_input]:w-[13px]!
                [&_input]:h-[13px] [&_input]:p-[0] [&_input]:[accent-color:#79935d]
              ">
                <input
                  type="checkbox"
                  checked={values.active}
                  onChange={(e) => change("active", e.target.checked)}
                />
                Active
              </label>
            )}
            <div className="flex justify-end gap-[9px] pt-[7px]">
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
                onClick={close}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="
                vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
                [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
                rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
                font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
                [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
                [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
                [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
                [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
                vw-primary
              " disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
