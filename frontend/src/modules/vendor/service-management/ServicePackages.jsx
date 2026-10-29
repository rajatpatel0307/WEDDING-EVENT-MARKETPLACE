import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Plus,
  Package,
  Copy,
  Pencil,
  Power,
  Trash2,
  ArrowLeft,
  Eye,
} from "lucide-react";
import {
  Heading,
  Field,
  Modal,
  Empty,
  Loading,
  ErrorView,
  useVendorData,
} from "../components/WorkspaceUI";
import { money, save, vendorRequest } from "../services/workspace.api";
import { Notice, useUnsaved } from "./shared";
const blank = () => ({
  name: "",
  description: "",
  price: 0,
  discount: 0,
  minimumGuests: null,
  maximumGuests: null,
  duration: null,
  featured: false,
  active: false,
  items: [],
  terms: "",
  optionalItems: "",
  images: [],
});
export default function ServicePackages({
  serviceId,
  initialPackage,
  create = false,
}) {
  const params = useParams(),
    id = serviceId || params.id,
    [version, setVersion] = useState(0),
    state = useVendorData(`/services/${id}/packages`, version),
    parent = useVendorData(`/services/${id}`, version),
    [form, setForm] = useState(() =>
      initialPackage
        ? {
            ...blank(),
            ...initialPackage,
            expectedUpdatedAt: initialPackage.updatedAt,
          }
        : create
          ? blank()
          : null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  useUnsaved(dirty);
  const change = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      const r = await fn();
      setNotice(r.message);
      setVersion((v) => v + 1);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const edit = (p, viewing = false) =>
    run(async () => {
      const details = await vendorRequest(`/packages/${p.id}`);
      setForm({
        ...blank(),
        ...details,
        ...(p.details ? JSON.parse(p.details) : {}),
        expectedUpdatedAt: details.updatedAt,
      });
      setViewOnly(viewing);
      return { message: "" };
    });
  const saveForm = async (e) => {
    e.preventDefault();
    if (
      await run(async () => {
        const { id: packageId, updatedAt, serviceId, ...body } = form;
        return save(
          packageId ? `/packages/${packageId}` : `/services/${id}/packages`,
          packageId ? "PUT" : "POST",
          { ...body, serviceId: id },
        );
      })
    ) {
      setDirty(false);
      setForm(null);
    }
  };
  if (state.loading || parent.loading) return <Loading />;
  if (state.error || parent.error)
    return (
      <ErrorView
        error={state.error || parent.error}
        retry={() => {
          state.retry();
          parent.retry();
        }}
      />
    );
  const canEdit = parent.data.actions.edit;
  return (
    <div className="sm-page">
      <Link to={`/vendor/services/${id}`} className="sm-back">
        <ArrowLeft size={15} />
        Back to service
      </Link>
      <Heading
        title="Service Packages"
        description={`Thoughtful options for ${parent.data.name}.`}
      >
        <button
          className="vw-button vw-primary"
          disabled={!canEdit}
          onClick={() => {
            setForm(blank());
            setViewOnly(false);
            setError("");
          }}
        >
          <Plus size={16} />
          Create Package
        </button>
      </Heading>
      <Notice message={notice} />
      <div className="sm-warning">
        Package changes to an approved service require admin approval before the
        service can be activated again.
      </div>
      {error && (
        <p role="alert" className="sm-error">
          {error}
        </p>
      )}
      <div className="sm-package-grid">
        {state.data.length ? (
          state.data.map((p) => (
            <article className="sm-package" key={p.id}>
              <span className="sm-stat-icon">
                <Package size={22} />
              </span>
              <span
                className={`vw-badge vw-badge-${p.active ? "active" : "inactive"}`}
              >
                {p.active ? "Active" : "Inactive"}
              </span>
              <h2>{p.name}</h2>
              <p>{p.description}</p>
              <p>
                {p.minimumGuests ?? "Any"}–{p.maximumGuests ?? "Any"} guests
                {p.duration != null && ` · ${p.duration} minutes`}
                {p.featured ? " · Featured" : ""}
              </p>
              <strong className="sm-package-price">
                {money(p.finalPrice)}
              </strong>
              {Number(p.discount) > 0 && (
                <small>
                  <s>{money(p.price)}</s> · {p.discount}% off
                </small>
              )}
              <div className="sm-row-actions">
                <button disabled={busy} onClick={() => edit(p, true)}>
                  <Eye size={15} />
                  View Package
                </button>
                {canEdit && (
                  <>
                    <button disabled={busy} onClick={() => edit(p)}>
                      <Pencil size={15} />
                      Edit
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(() =>
                          save(`/packages/${p.id}/duplicate`, "POST", {
                            expectedUpdatedAt: p.updatedAt,
                          }),
                        )
                      }
                    >
                      <Copy size={15} />
                      Duplicate
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const d = await vendorRequest(`/packages/${p.id}`);
                          const { id: pid, updatedAt, ...body } = d;
                          return save(`/packages/${p.id}`, "PUT", {
                            ...body,
                            ...(p.details ? JSON.parse(p.details) : {}),
                            active: !p.active,
                            expectedUpdatedAt: updatedAt,
                          });
                        })
                      }
                    >
                      <Power size={15} />
                      {p.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      disabled={busy}
                      className="sm-danger"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Delete this package? Packages with booking or quotation history cannot be deleted.",
                          )
                        )
                          run(() =>
                            save(`/packages/${p.id}`, "DELETE", {
                              expectedUpdatedAt: p.updatedAt,
                            }),
                          );
                      }}
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="Make every celebration their own"
            text="Create your first package with a price, included items and optional extras."
          />
        )}
      </div>
      {form && (
        <Modal
          title={
            viewOnly
              ? "Package Details"
              : form.id
                ? "Edit Package"
                : "Create Package"
          }
          wide
          busy={busy}
          close={() => {
            if (
              !dirty ||
              window.confirm("Unsaved changes will be lost. Continue?")
            ) {
              setForm(null);
              setDirty(false);
            }
          }}
        >
          <form onSubmit={saveForm}>
            <fieldset disabled={viewOnly || !canEdit}>
              <div className="sm-form-body sm-form-grid">
                {[
                  ["name", "Package Name", "text"],
                  ["description", "Description", "text"],
                  ["price", "Original Price", "number"],
                  ["discount", "Discount (%)", "number"],
                  ["minimumGuests", "Minimum Guests", "number"],
                  ["maximumGuests", "Maximum Guests", "number"],
                  ["duration", "Duration (minutes)", "number"],
                ].map(([k, l, t]) => (
                  <Field key={k} label={l}>
                    <input
                      required={k === "name"}
                      type={t}
                      min={0}
                      max={k === "discount" ? 100 : 100000000}
                      step={k === "price" || k === "discount" ? "0.01" : "1"}
                      value={form[k] ?? ""}
                      onChange={(e) =>
                        change(
                          k,
                          t === "number"
                            ? e.target.value === ""
                              ? null
                              : Number(e.target.value)
                            : e.target.value,
                        )
                      }
                    />
                  </Field>
                ))}
                <Field label="Package Price">
                  <output className="sm-package-price">
                    {money(
                      Number(form.price) * (1 - Number(form.discount) / 100),
                    )}
                  </output>
                </Field>
                <Field label="Terms">
                  <textarea
                    rows={3}
                    value={form.terms}
                    onChange={(e) => change("terms", e.target.value)}
                  />
                </Field>
                <Field label="Optional Items">
                  <textarea
                    rows={3}
                    value={form.optionalItems}
                    onChange={(e) => change("optionalItems", e.target.value)}
                  />
                </Field>
                <label className="sm-checkbox">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => change("active", e.target.checked)}
                  />
                  Active package
                </label>
                <label className="sm-checkbox">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => change("featured", e.target.checked)}
                  />
                  Featured package
                </label>
              </div>
              <div className="sm-form-body">
                <h3>Included items</h3>
                {form.items.map((item, i) => (
                  <div className="sm-package-item" key={i}>
                    <input
                      aria-label="Item name"
                      required
                      value={item.name}
                      placeholder="Item name"
                      onChange={(e) =>
                        change(
                          "items",
                          form.items.map((x, n) =>
                            n === i ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <input
                      aria-label="Item description"
                      value={item.description || ""}
                      placeholder="Description"
                      onChange={(e) =>
                        change(
                          "items",
                          form.items.map((x, n) =>
                            n === i ? { ...x, description: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <input
                      aria-label="Quantity"
                      type="number"
                      min="0"
                      value={item.quantity ?? 1}
                      onChange={(e) =>
                        change(
                          "items",
                          form.items.map((x, n) =>
                            n === i
                              ? { ...x, quantity: Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                    />
                    <input
                      aria-label="Unit"
                      placeholder="Unit"
                      value={item.unit || ""}
                      onChange={(e) =>
                        change(
                          "items",
                          form.items.map((x, n) =>
                            n === i ? { ...x, unit: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      title="Delete item"
                      onClick={() =>
                        change(
                          "items",
                          form.items.filter((_, n) => n !== i),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="vw-button"
                  onClick={() =>
                    change("items", [
                      ...form.items,
                      { name: "", description: "", quantity: 1, unit: "item" },
                    ])
                  }
                >
                  <Plus size={15} />
                  Add Item
                </button>
                <h3 className="mt-5">Package images</h3>
                <div className="sm-package-images">
                  {parent.data.images.map((image) => (
                    <label key={image.id}>
                      <img
                        src={image.url}
                        alt="Select package image"
                        loading="lazy"
                      />
                      <input
                        type="checkbox"
                        checked={form.images.includes(image.id)}
                        onChange={(e) =>
                          change(
                            "images",
                            e.target.checked
                              ? [...form.images, image.id]
                              : form.images.filter((x) => x !== image.id),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                {error && (
                  <p className="sm-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </fieldset>
            <div className="sm-actions">
              <button
                className="vw-button vw-primary"
                disabled={busy || !canEdit || viewOnly}
              >
                {busy ? "Saving…" : "Save Package"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
