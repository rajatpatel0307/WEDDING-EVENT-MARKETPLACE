import { OfferSelection, OfferConfiguration } from "../../commerce/OfferEditor";
import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Save, ArrowLeft } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  adminRequest,
  useAdminData,
  useDebounced,
} from "../services-management.api";
import { Loading, ErrorState, Field } from "../components/ServicesUI";
import { editorDocument } from "../service-editor.document";

function EditorForm({ data }) {
  const [values, setValues] = useState(() => editorDocument(data)),
    [vendorQuery, setVendorQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const query = useDebounced(vendorQuery),
    meta = useAdminData(
      `/services/metadata?q=${encodeURIComponent(query)}${values.vendorId ? `&vendorId=${values.vendorId}` : ""}`,
    );
  const navigate = useNavigate(),
    { notify } = useAuth();
  const change = (key, value, section) =>
    setValues((v) =>
      section
        ? { ...v, [section]: { ...v[section], [key]: value } }
        : { ...v, [key]: value },
    );
  const input = (key, label, section, type = "text", extra = {}) => (
    <Field
      key={`${section || "root"}.${key}`}
      label={label}
      type={type}
      value={(section ? values[section][key] : values[key]) ?? ""}
      onChange={(e) =>
        change(
          key,
          type === "number"
            ? e.target.value === "" &&
              [
                "specialPrice",
                "weekendPrice",
                "seasonalPrice",
                "latitude",
                "longitude",
              ].includes(key)
              ? null
              : Number(e.target.value)
            : e.target.value === "" && type === "date"
              ? null
              : e.target.value,
          section,
        )
      }
      {...extra}
    />
  );
  const area = (key, label, section, maxLength = 2000) => (
    <Field key={`${section || "root"}.${key}`} label={label}>
      <textarea
        rows={3}
        maxLength={maxLength}
        value={(section ? values[section][key] : values[key]) || ""}
        onChange={(e) => change(key, e.target.value, section)}
      />
    </Field>
  );
  const select = (key, label, options, section) => (
    <Field key={key} label={label}>
      <select
        value={(section ? values[section][key] : values[key]) ?? ""}
        onChange={(e) => change(key, e.target.value, section)}
      >
        {options.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </Field>
  );
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest(
        `/services${data ? `/${data.ServiceId}` : ""}`,
        { method: data ? "PUT" : "POST", body: JSON.stringify(values) },
      );
      notify(result.message);
      window.dispatchEvent(new Event("marrynest:service-decision"));
      navigate(`/admin/services/${result.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const category = meta.data?.categories.find(
    (c) => c.id === values.categoryId,
  );
  return (
    <form onSubmit={save} className="service-form asm-editor [&_fieldset]:grid [&_fieldset]:gap-[24px] [&_fieldset]:min-w-0 [&_fieldset]:[border-top-width:0] [&_fieldset]:[border-top-style:none] [&_fieldset]:[border-top-color:currentColor] [&_fieldset]:[border-right-width:0] [&_fieldset]:[border-right-style:none] [&_fieldset]:[border-right-color:currentColor] [&_fieldset]:[border-bottom-width:0] [&_fieldset]:[border-bottom-style:none] [&_fieldset]:[border-bottom-color:currentColor] [&_fieldset]:[border-left-width:0] [&_fieldset]:[border-left-style:none] [&_fieldset]:[border-left-color:currentColor] [&_input:disabled]:[background:#f4f7f3] [&_input:disabled]:text-[#8b998e] [&_select:disabled]:[background:#f4f7f3] [&_select:disabled]:text-[#8b998e]">
      <fieldset disabled={busy}>
        <section className="asm-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e8e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e8e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e8e2] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e8e2] rounded-[14px] p-[24px] [@media(width<=1200px)]:p-[18px] min-w-0 [&_h2]:text-[19px] [&_h2]:font-[650] [&_h2]:mb-[20px] [&_h3]:text-[15px] [&_h3]:font-[600] [&_h3]:[margin:18px_0_12px]">
          <h2>Service Information</h2>
          <div className="asm-form-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] gap-[16px]">
            {!data && (
              <Field
                label="Find vendor"
                value={vendorQuery}
                onChange={(e) => setVendorQuery(e.target.value)}
                placeholder="Search business name"
              />
            )}
            <Field label="Vendor">
              <select
                required
                disabled={!!data}
                value={values.vendorId}
                onChange={(e) => change("vendorId", e.target.value)}
              >
                <option value="">Select vendor</option>
                {meta.data?.vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.status}
                  </option>
                ))}
              </select>
            </Field>
            {input("name", "Service name", null, "text", {
              required: true,
              minLength: 2,
              maxLength: 200,
            })}
            <Field label="Category">
              <select
                required
                value={values.categoryId || ""}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    categoryId: Number(e.target.value),
                    subcategoryId: null,
                    attributes: {},
                  }))
                }
              >
                <option value="">Select category</option>
                {meta.data?.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subcategory">
              <select
                value={values.subcategoryId || ""}
                onChange={(e) =>
                  change(
                    "subcategoryId",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">No subcategory</option>
                {meta.data?.subcategories
                  .filter((c) => c.categoryId === values.categoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
            {select("serviceType", "Service type", [
              "On site",
              "Rental",
              "Sale",
              "Digital",
              "Hybrid",
            ])}
            {input("shortDescription", "Short description", null, "text", {
              maxLength: 500,
            })}
          </div>
          {area("description", "Description", null, 10000)}
          <div className="asm-form-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] gap-[16px]">
            {(meta.data?.templates?.[category?.name] || []).map((f) =>
              f.type === "boolean" ? (
                <label className="asm-checkbox flex gap-[9px] items-center text-[12px] [margin:10px_0] [&_input]:w-[15px] [&_input]:h-[15px] [&_input]:[accent-color:#226e56]" key={f.key}>
                  <input
                    type="checkbox"
                    checked={!!values.attributes[f.key]}
                    onChange={(e) =>
                      change(f.key, e.target.checked, "attributes")
                    }
                  />
                  {f.label}
                </label>
              ) : f.type === "select" ? (
                <Field key={f.key} label={f.label}>
                  <select
                    value={values.attributes[f.key] || ""}
                    onChange={(e) =>
                      change(f.key, e.target.value, "attributes")
                    }
                  >
                    <option value="">Not specified</option>
                    {f.options.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
              ) : (
                input(
                  f.key,
                  f.label,
                  "attributes",
                  f.type === "number" ? "number" : "text",
                  {
                    min: f.type === "number" ? 0 : undefined,
                    step: "any",
                    maxLength: f.type === "textarea" ? 3000 : 300,
                  },
                )
              ),
            )}
          </div>
        </section>
        <section className="asm-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e8e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e8e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e8e2] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e8e2] rounded-[14px] p-[24px] [@media(width<=1200px)]:p-[18px] min-w-0 [&_h2]:text-[19px] [&_h2]:font-[650] [&_h2]:mb-[20px] [&_h3]:text-[15px] [&_h3]:font-[600] [&_h3]:[margin:18px_0_12px]">
          <h2>Product Service Options</h2>
          <OfferSelection value={values.offer} category={category} onChange={offer=>change("offer",offer)}/>
          <OfferConfiguration value={values.offer} onChange={offer=>change("offer",offer)} taxRate={values.pricing.taxRate} onTaxChange={taxRate=>setValues(v=>({...v,pricing:{...v.pricing,taxRate}}))}/>
          <h2>{values.offer ? "Existing pricing configuration" : "Pricing"}</h2>
          <div className="asm-form-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] gap-[16px]">
            {[
              ["basePrice", "Base price"],
              ["unitPrice", "Unit price"],
              ["minimumQuantity", "Minimum quantity"],
              ["maximumQuantity", "Maximum quantity"],
              ["discount", "Discount %"],
              ["additionalCharges", "Additional charges"],
              ["taxRate", "Tax %"],
              ["specialPrice", "Special price (optional)"],
              ["weekendPrice", "Weekend price (optional)"],
              ["seasonalPrice", "Seasonal price (optional)"],
            ].map(([key, label]) =>
              input(key, label, "pricing", "number", {
                min: 0,
                max: ["discount", "taxRate"].includes(key) ? 100 : 100000000,
                step: ".01",
                required: ![
                  "specialPrice",
                  "weekendPrice",
                  "seasonalPrice",
                ].includes(key),
              }),
            )}
            {select(
              "unit",
              "Pricing unit",
              [
                "Per Event",
                "Per Day",
                "Per Hour",
                "Per Plate",
                "Per Person",
                "Per KM",
                "Per Vehicle",
                "Per Item",
                "Custom",
              ],
              "pricing",
            )}
            {input("seasonalFrom", "Season starts", "pricing", "date")}
            {input("seasonalTo", "Season ends", "pricing", "date")}
          </div>
          <p className="asm-muted text-[12px] text-[#87958d] [margin:12px_0] leading-[1.7]">
            The backend validates pricing and calculates the final price,
            discount and tax when you save. Items and packages are managed on
            the service details page.
          </p>
        </section>
        <section className="asm-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e8e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e8e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e8e2] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e8e2] rounded-[14px] p-[24px] [@media(width<=1200px)]:p-[18px] min-w-0 [&_h2]:text-[19px] [&_h2]:font-[650] [&_h2]:mb-[20px] [&_h3]:text-[15px] [&_h3]:font-[600] [&_h3]:[margin:18px_0_12px]">
          <h2>Location</h2>
          <div className="asm-form-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] gap-[16px]">
            {[
              ["address", "Address"],
              ["city", "City"],
              ["state", "State"],
              ["country", "Country"],
              ["zip", "Postal code"],
            ].map(([key, label]) =>
              input(key, label, "location", "text", {
                maxLength: key === "address" ? 300 : key === "zip" ? 20 : 100,
              }),
            )}
            {select(
              "mode",
              "Location mode",
              ["Vendor location", "Customer location", "Both"],
              "location",
            )}
            {input("latitude", "Latitude (optional)", "location", "number", {
              min: -90,
              max: 90,
              step: "any",
            })}
            {input("longitude", "Longitude (optional)", "location", "number", {
              min: -180,
              max: 180,
              step: "any",
            })}
          </div>
        </section>
        <section className="asm-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e8e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e8e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e8e2] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e8e2] rounded-[14px] p-[24px] [@media(width<=1200px)]:p-[18px] min-w-0 [&_h2]:text-[19px] [&_h2]:font-[650] [&_h2]:mb-[20px] [&_h3]:text-[15px] [&_h3]:font-[600] [&_h3]:[margin:18px_0_12px]">
          <h2>Availability</h2>
          <div className="flex flex-wrap gap-4 mb-4">
            {[
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ].map((day, i) => (
              <label key={day} className="asm-checkbox flex gap-[9px] items-center text-[12px] [margin:10px_0] [&_input]:w-[15px] [&_input]:h-[15px] [&_input]:[accent-color:#226e56]">
                <input
                  type="checkbox"
                  checked={values.availability.days.includes(i)}
                  onChange={(e) =>
                    change(
                      "days",
                      e.target.checked
                        ? [...values.availability.days, i].sort()
                        : values.availability.days.filter((d) => d !== i),
                      "availability",
                    )
                  }
                />
                {day}
              </label>
            ))}
          </div>
          <div className="asm-form-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] gap-[16px]">
            {input("start", "Opening time", "availability", "time", {
              required: true,
            })}
            {input("end", "Closing time", "availability", "time", {
              required: true,
            })}
            {input(
              "advanceDays",
              "Advance booking (days)",
              "availability",
              "number",
              { min: 0, max: 730, required: true },
            )}
            {input(
              "noticeHours",
              "Minimum notice (hours)",
              "availability",
              "number",
              { min: 0, max: 8760, required: true },
            )}
          </div>
        </section>
        <section className="asm-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e8e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e8e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e8e2] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e8e2] rounded-[14px] p-[24px] [@media(width<=1200px)]:p-[18px] min-w-0 [&_h2]:text-[19px] [&_h2]:font-[650] [&_h2]:mb-[20px] [&_h3]:text-[15px] [&_h3]:font-[600] [&_h3]:[margin:18px_0_12px]">
          <h2>Policies</h2>
          {[
            ["cancellation", "Cancellation policy"],
            ["refund", "Refund policy"],
            ["rescheduling", "Rescheduling policy"],
            ["additionalCharges", "Additional charge terms"],
            ["terms", "Terms & conditions"],
          ].map(([key, label]) =>
            area(key, label, "policies", key === "terms" ? 10000 : 2000),
          )}
          <label className="asm-checkbox flex gap-[9px] items-center text-[12px] [margin:10px_0] [&_input]:w-[15px] [&_input]:h-[15px] [&_input]:[accent-color:#226e56]">
            <input
              type="checkbox"
              checked={values.policies.advanceRequired}
              onChange={(e) =>
                change("advanceRequired", e.target.checked, "policies")
              }
            />
            Advance payment required
          </label>
          <div className="asm-form-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] gap-[16px]">
            {[
              ["advancePercentage", "Advance payment %"],
              ["travelCharges", "Travel charges"],
              ["setupTime", "Setup time (minutes)"],
              ["duration", "Service duration (minutes)"],
            ].map(([key, label]) =>
              input(key, label, "policies", "number", {
                min: 0,
                max: key === "advancePercentage" ? 100 : 100000000,
                step: ".01",
              }),
            )}
          </div>
        </section>
        <section className="asm-panel [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e8e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e8e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e8e2] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e8e2] rounded-[14px] p-[24px] [@media(width<=1200px)]:p-[18px] min-w-0 [&_h2]:text-[19px] [&_h2]:font-[650] [&_h2]:mb-[20px] [&_h3]:text-[15px] [&_h3]:font-[600] [&_h3]:[margin:18px_0_12px]">
          <h2>Search & discovery</h2>
          <div className="asm-form-grid grid grid-cols-[repeat(2,_minmax(0,_1fr))] [@media(width<=767px)]:grid-cols-[1fr] gap-[16px]">
            {input("slug", "Service URL slug", "seo", "text", {
              required: true,
              pattern: "[a-z0-9]+(-[a-z0-9]+)*",
              minLength: 2,
              maxLength: 200,
              placeholder: "royal-wedding-garden",
            })}
            {input("title", "SEO title", "seo", "text", { maxLength: 200 })}
            {input("description", "SEO description", "seo", "text", {
              maxLength: 500,
            })}
            {input("keywords", "Keywords", "seo", "text", { maxLength: 500 })}
          </div>
        </section>
        {meta.error && (
          <p role="alert" className="asm-alert [padding:15px_18px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edd3d5] [border-right-width:1px] [border-right-style:solid] [border-right-color:#edd3d5] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#edd3d5] [border-left-width:1px] [border-left-style:solid] [border-left-color:#edd3d5] [background:#fff5f4] rounded-[9px] text-[#a8555b] text-[13px]">
            {meta.error.message}
          </p>
        )}
        {error && (
          <p role="alert" className="asm-alert [padding:15px_18px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#edd3d5] [border-right-width:1px] [border-right-style:solid] [border-right-color:#edd3d5] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#edd3d5] [border-left-width:1px] [border-left-style:solid] [border-left-color:#edd3d5] [background:#fff5f4] rounded-[9px] text-[#a8555b] text-[13px]">
            {error}
          </p>
        )}
        <footer className="asm-editor-footer flex gap-[18px] justify-between items-center [@media(width<=767px)]:items-start p-[20px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e0e8e2] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e0e8e2] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e0e8e2] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e0e8e2] rounded-[12px] [&_p]:text-[12px] [&_p]:text-[#85998a] [&_p]:max-w-[420px] [@media(width<=767px)]:flex-col">
          <p>
            Services are saved as inactive drafts. Approved edits require a new
            review.
          </p>
          <div className="flex gap-2">
            <Link
              className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
              to={
                data ? `/admin/services/${data.ServiceId}` : "/admin/services"
              }
            >
              Cancel
            </Link>
            <button
              className="ad-button ad-primary inline-flex justify-center items-center gap-[7px] [background:#176b60] [border-top-width:1px] [border-top-style:solid] [border-top-color:#176b60] [border-right-width:1px] [border-right-style:solid] [border-right-color:#176b60] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#176b60] [border-left-width:1px] [border-left-style:solid] [border-left-color:#176b60] rounded-[7px] [padding:8px_12px] text-[#fff] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#11594f] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]"
              disabled={busy || meta.loading}
            >
              <Save size={16} />
              {busy ? "Saving…" : "Save Service"}
            </button>
          </div>
        </footer>
      </fieldset>
    </form>
  );
}
export default function AdminServiceEditor() {
  const { serviceId } = useParams(),
    [revision, setRevision] = useState(0),
    state = useAdminData(serviceId ? `/services/${serviceId}` : null, revision);
  return (
    <div className="asm-page grid gap-[24px] text-[#253f3a] [&_select]:[padding:9px_12px] [&_select]:text-[12px] [&_select]:[border-top-width:1px] [&_select]:[border-top-style:solid] [&_select]:[border-top-color:#dce5df] [&_select]:[border-right-width:1px] [&_select]:[border-right-style:solid] [&_select]:[border-right-color:#dce5df] [&_select]:[border-bottom-width:1px] [&_select]:[border-bottom-style:solid] [&_select]:[border-bottom-color:#dce5df] [&_select]:[border-left-width:1px] [&_select]:[border-left-style:solid] [&_select]:[border-left-color:#dce5df] [&_select]:rounded-[7px] [&_select]:[background:#fff]">
      <Link
        className="asm-back flex items-center gap-[8px] text-[13px] text-[#698c7d]"
        to={serviceId ? `/admin/services/${serviceId}` : "/admin/services"}
      >
        <ArrowLeft size={16} />
        Back to services
      </Link>
      <header className="asm-heading flex items-center [@media(width<=1200px)]:items-start justify-between gap-[24px] [@media(width<=767px)]:gap-[18px] [&_h1]:text-[30px] [@media(width<=767px)]:[&_h1]:text-[26px] [&_h1]:leading-[1.2] [&_h1]:[margin:8px_0_10px] [&_h1]:font-[650] [&_h1]:tracking-[-0.7px] [&_p]:text-[14px] [&_p]:text-[#7b8a83] [@media(width<=767px)]:flex-col">
        <div>
          <span className="ad-eyebrow text-[8px] [@media(width<=767px)]:text-[7px] tracking-[1.7px] text-[#7d9183] flex items-center gap-[6px] [&_>_span]:w-[5px] [&_>_span]:h-[5px] [&_>_span]:[background:#bfa471] [&_>_span]:rounded-[50%]">SERVICE STUDIO</span>
          <h1>{serviceId ? "Edit Service" : "Add Service"}</h1>
          <p>
            Manage the listing information, pricing, availability and policies.
          </p>
        </div>
      </header>
      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorState
          error={state.error}
          retry={() => setRevision((v) => v + 1)}
        />
      ) : state.data && !state.data.actions.includes("edit") ? (
        <p role="alert">
          This service cannot be edited during review or suspension.
        </p>
      ) : (
        <EditorForm key={serviceId || "new"} data={state.data} />
      )}
    </div>
  );
}
