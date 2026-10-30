import { vendorClasses } from "../styles";
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
    <div className="
      [--sm-accent:#2d604b] [--sm-border:#e2e8df] max-w-[1700px] m-[auto]
      [&_button:disabled]:opacity-[0.45] [&_button:disabled]:cursor-not-allowed
      [&_:focus-visible]:[outline:2px_solid_#397455] [&_:focus-visible]:[outline-offset:3px]
    ">
      <Link to={`/vendor/services/${id}`} className="inline-flex items-center gap-[7px] text-[#5d7566] mb-[18px] text-[12px]">
        <ArrowLeft size={15} />
        Back to service
      </Link>
      <Heading
        title="Service Packages"
        description={`Thoughtful options for ${parent.data.name}.`}
      >
        <button
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
      <div className="
        rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fbf5e7]
        [border-top:1px_solid_#ede1c6] [border-right:1px_solid_#ede1c6] [border-bottom:1px_solid_#ede1c6]
        [border-left:1px_solid_#ede1c6] text-[#93773e]
      ">
        Package changes to an approved service require admin approval before the
        service can be activated again.
      </div>
      {error && (
        <p role="alert" className="rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fff0ed] text-[#ab4b3c]">
          {error}
        </p>
      )}
      <div className="grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[20px] service-tablet:grid-cols-[repeat(2,_minmax(0,_1fr))] service-mobile:grid-cols-[1fr]">
        {state.data.length ? (
          state.data.map((p) => (
            <article className="
              p-[25px] [background:#fff] [border-top:1px_solid_var(--sm-border)]
              [border-right:1px_solid_var(--sm-border)] [border-bottom:1px_solid_var(--sm-border)]
              [border-left:1px_solid_var(--sm-border)] rounded-[12px] [&_>_.vw-badge]:[float:right]
              [&_h2]:text-[19px] [&_h2]:mt-[20px] [&_p]:min-h-[40px] [&_>_.sm-row-actions]:mt-[20px]
              [&_>_.sm-row-actions]:pt-[20px] [&_>_.sm-row-actions]:[border-top:1px_solid_var(--sm-border)]
            " key={p.id}>
              <span className="
                w-[42px] h-[42px] rounded-[12px] inline-flex items-center justify-center text-[#42775b]
                [background:#edf4eb] [&.tone-1]:text-[#658078] [&.tone-1]:[background:#eff4f1]
                [&.tone-2]:text-[#a68b55] [&.tone-2]:[background:#faf5e9] [&.tone-3]:text-[#9082a3]
                [&.tone-3]:[background:#f3f0f7] service-wide:w-[34px] service-wide:h-[34px] service-mobile:w-[32px]
                service-mobile:h-[32px]
              ">
                <Package size={22} />
              </span>
              <span
                className={vendorClasses(`vw-badge vw-badge-${p.active ? "active" : "inactive"}`)}
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
              <strong className="block text-[27px] text-[#416c46]">
                {money(p.finalPrice)}
              </strong>
              {Number(p.discount) > 0 && (
                <small>
                  <s>{money(p.price)}</s> · {p.discount}% off
                </small>
              )}
              <div className="
                sm-row-actions flex items-center gap-[5px] flex-wrap [&_a]:[border-top:1px_solid_#e3e9df]
                [&_a]:[border-right:1px_solid_#e3e9df] [&_a]:[border-bottom:1px_solid_#e3e9df]
                [&_a]:[border-left:1px_solid_#e3e9df] [&_a]:inline-flex [&_a]:items-center [&_a]:justify-center
                [&_a]:gap-[6px] [&_a]:[background:#fff] [&_a]:min-w-[29px] [&_a]:min-h-[29px] [&_a]:p-[5px]
                [&_a]:text-[#72856f] [&_a]:rounded-[6px] [&_a]:text-[11px] [&_button]:[border-top:1px_solid_#e3e9df]
                [&_button]:[border-right:1px_solid_#e3e9df] [&_button]:[border-bottom:1px_solid_#e3e9df]
                [&_button]:[border-left:1px_solid_#e3e9df] [&_button]:inline-flex [&_button]:items-center
                [&_button]:justify-center [&_button]:gap-[6px] [&_button]:[background:#fff] [&_button]:min-w-[29px]
                [&_button]:min-h-[29px] [&_button]:p-[5px] [&_button]:text-[#72856f] [&_button]:rounded-[6px]
                [&_button]:text-[11px] [&_a:hover]:[background:#eef4e9] [&_a:hover]:text-[#2d604b]
                [&_button:hover]:[background:#eef4e9] [&_button:hover]:text-[#2d604b] [&_.sm-danger]:text-[#b36f68]
                [&_>_select]:p-[5px] [&_>_select]:rounded-[6px] [&_>_select]:max-w-[105px]
                [&_>_select]:[background:#fff] [&_>_select]:text-[#72856f] [&_>_select]:text-[10px]
                [&_>_select]:min-h-[29px]
              ">
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
              <div className="
                p-[25px] service-mobile:p-[18px] grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[20px]
                [&_input]:w-[100%] [&_input]:rounded-[7px] [&_input]:[padding:10px_12px] [&_input]:[background:#fff]
                [&_input]:min-h-[40px] [&_select]:w-[100%] [&_select]:rounded-[7px] [&_select]:[padding:10px_12px]
                [&_select]:[background:#fff] [&_select]:min-h-[40px] [&_textarea]:w-[100%] [&_textarea]:rounded-[7px]
                [&_textarea]:[padding:10px_12px] [&_textarea]:[background:#fff] [&_textarea]:min-h-[40px]
                [&_textarea]:resize-y [&_.vw-field]:m-[0] service-mobile:grid-cols-[1fr] service-mobile:gap-[18px]
              ">
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
                  <output className="block text-[27px] text-[#416c46]">
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
                <label className="
                  flex gap-[9px] items-center text-[#61765f] text-[12px] [&_input[type=checkbox]]:w-[16px]
                  [&_input[type=checkbox]]:h-[16px] [&_input[type=checkbox]]:min-h-[0]
                  [&_input[type=checkbox]]:[accent-color:#396d4d]
                ">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => change("active", e.target.checked)}
                  />
                  Active package
                </label>
                <label className="
                  flex gap-[9px] items-center text-[#61765f] text-[12px] [&_input[type=checkbox]]:w-[16px]
                  [&_input[type=checkbox]]:h-[16px] [&_input[type=checkbox]]:min-h-[0]
                  [&_input[type=checkbox]]:[accent-color:#396d4d]
                ">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => change("featured", e.target.checked)}
                  />
                  Featured package
                </label>
              </div>
              <div className="p-[25px] service-mobile:p-[18px]">
                <h3>Included items</h3>
                {form.items.map((item, i) => (
                  <div className="
                    grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-[10px] [margin:12px_0] [&_input]:w-[100%] [&_input]:p-[8px]
                    [&_input]:rounded-[6px] [&_button]:[background:none] [&_button]:[border-top:0]
                    [&_button]:[border-right:0] [&_button]:[border-bottom:0] [&_button]:[border-left:0]
                    [&_button]:text-[#b17e70] service-mobile:grid-cols-[1fr_1fr]
                  " key={i}>
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
                <div className="
                  flex gap-[12px] flex-wrap mt-[15px] [&_label]:relative [&_img]:w-[90px] [&_img]:h-[70px]
                  [&_img]:object-cover [&_img]:rounded-[6px] [&_input]:absolute [&_input]:bottom-[5px]
                  [&_input]:right-[5px]
                ">
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
                  <p className="rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fff0ed] text-[#ab4b3c]" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </fieldset>
            <div className="[padding:18px_24px] flex justify-end gap-[10px] [border-top:1px_solid_#e6ebdf]">
              <button
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
