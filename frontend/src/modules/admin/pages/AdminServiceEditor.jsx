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
import "../services-management.css";

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
    <form onSubmit={save} className="asm-editor">
      <fieldset disabled={busy}>
        <section className="asm-panel">
          <h2>Service Information</h2>
          <div className="asm-form-grid">
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
          <div className="asm-form-grid">
            {(meta.data?.templates?.[category?.name] || []).map((f) =>
              f.type === "boolean" ? (
                <label className="asm-checkbox" key={f.key}>
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
        <section className="asm-panel">
          <h2>Pricing</h2>
          <div className="asm-form-grid">
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
          <p className="asm-muted">
            The backend validates pricing and calculates the final price,
            discount and tax when you save. Items and packages are managed on
            the service details page.
          </p>
        </section>
        <section className="asm-panel">
          <h2>Location</h2>
          <div className="asm-form-grid">
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
        <section className="asm-panel">
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
              <label key={day} className="asm-checkbox">
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
          <div className="asm-form-grid">
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
        <section className="asm-panel">
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
          <label className="asm-checkbox">
            <input
              type="checkbox"
              checked={values.policies.advanceRequired}
              onChange={(e) =>
                change("advanceRequired", e.target.checked, "policies")
              }
            />
            Advance payment required
          </label>
          <div className="asm-form-grid">
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
        <section className="asm-panel">
          <h2>Search & discovery</h2>
          <div className="asm-form-grid">
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
          <p role="alert" className="asm-alert">
            {meta.error.message}
          </p>
        )}
        {error && (
          <p role="alert" className="asm-alert">
            {error}
          </p>
        )}
        <footer className="asm-editor-footer">
          <p>
            Services are saved as inactive drafts. Approved edits require a new
            review.
          </p>
          <div className="flex gap-2">
            <Link
              className="ad-button"
              to={
                data ? `/admin/services/${data.ServiceId}` : "/admin/services"
              }
            >
              Cancel
            </Link>
            <button
              className="ad-button ad-primary"
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
    <div className="asm-page">
      <Link
        className="asm-back"
        to={serviceId ? `/admin/services/${serviceId}` : "/admin/services"}
      >
        <ArrowLeft size={16} />
        Back to services
      </Link>
      <header className="asm-heading">
        <div>
          <span className="ad-eyebrow">SERVICE STUDIO</span>
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
