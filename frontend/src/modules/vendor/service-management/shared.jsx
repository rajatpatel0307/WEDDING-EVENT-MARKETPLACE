import { useEffect, useState } from "react";
import { Link, useBlocker, useNavigate, useLocation } from "react-router-dom";
import {
  Check,
  Copy,
  Eye,
  ImagePlus,
  Pencil,
  Plus,
  Send,
  Trash2,
  Power,
  Package,
  CalendarDays,
  ListChecks,
} from "lucide-react";
import { Badge, Modal } from "../components/WorkspaceUI";
import { save, vendorRequest } from "../services/workspace.api";
import { useAuth } from "../../../context/AuthContext";

export const steps = [
  "Basic information",
  "Category details",
  "Pricing",
  "Service items",
  "Images & media",
  "Location",
  "Availability",
  "Terms & policies",
  "Preview",
];
export const units = [
  "Per Event",
  "Per Day",
  "Per Hour",
  "Per Plate",
  "Per Person",
  "Per KM",
  "Per Vehicle",
  "Per Item",
  "Custom",
];
export const blank = () => ({
  name: "",
  categoryId: 0,
  subcategoryId: null,
  shortDescription: "",
  description: "",
  serviceType: "On site",
  attributes: {},
  pricing: {
    type: null,
    basePrice: 0,
    unitPrice: 0,
    minimumPrice: null,
    maximumPrice: null,
    customQuote: false,
    minimumQuantity: 1,
    maximumQuantity: 1,
    unit: "Per Event",
    discount: 0,
    specialPrice: null,
    weekendPrice: null,
    seasonalPrice: null,
    seasonalFrom: null,
    seasonalTo: null,
    additionalCharges: 0,
    taxRate: 0,
  },
  items: [],
  location: {
    address: "",
    city: "",
    state: "",
    country: "India",
    zip: "",
    latitude: null,
    longitude: null,
    mode: "Both",
  },
  availability: {
    days: [1, 2, 3, 4, 5],
    start: "09:00",
    end: "20:00",
    advanceDays: 180,
    noticeHours: 24,
  },
  policies: {
    cancellation: "",
    refund: "",
    advanceRequired: false,
    advancePercentage: 0,
    rescheduling: "",
    travelCharges: 0,
    additionalCharges: "",
    setupTime: 0,
    duration: 0,
    terms: "",
  },
  seo: { title: "", description: "", keywords: "", slug: "" },
});
export const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
export function editableDocument(data) {
  const defaults = blank();
  return Object.fromEntries(
    Object.keys(defaults).map((key) => [
      key,
      key === "items"
        ? (data.items || []).map(({ id, ...i }) => ({
            ...i,
            included: !!i.included,
            price: Number(i.price || 0),
            quantity: Number(i.quantity || 0),
            unit: i.unit || "",
            description: i.description || "",
          }))
        : key === "seo"
          ? {
              ...defaults.seo,
              ...data.seo,
              slug: data.slug || data.seo?.slug || slugify(data.name || ""),
            }
          : typeof defaults[key] === "object" && !Array.isArray(defaults[key])
            ? { ...defaults[key], ...data[key] }
            : (data[key] ?? defaults[key]),
    ]),
  );
}
export function Status({ status, active }) {
  return (
    <div className="flex gap-[5px] flex-wrap [&_.vw-badge]:text-[9px]">
      <Badge>
        {status === "Pending"
          ? "Pending Approval"
          : status === "UnderReview"
            ? "Admin Review"
            : status}
      </Badge>
      {status === "Approved" && <Badge>{active ? "Active" : "Inactive"}</Badge>}
    </div>
  );
}
export function Notice({ message }) {
  const { notify } = useAuth();
  useEffect(() => {
    if (message) notify(message);
  }, [message]);
  return message ? (
    <div className="rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#eaf4e9] text-[#346245] flex items-center gap-[10px]" role="status">
      <Check size={16} />
      {message}
    </div>
  ) : null;
}
export function Confirm({
  title = "Confirm action",
  text,
  onConfirm,
  onClose,
  busy,
  error,
}) {
  return (
    <Modal title={title} close={onClose} busy={busy}>
      <p className="p-5">{text}</p>
      {error && (
        <p className="rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fff0ed] text-[#ab4b3c]" role="alert">
          {error}
        </p>
      )}
      <div className="[padding:18px_24px] flex justify-end gap-[10px] [border-top:1px_solid_#e6ebdf]">
        <button className="
          vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
          [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
          rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
          font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
          [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
          [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
          [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
          [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
        " onClick={onClose} disabled={busy}>
          Cancel
        </button>
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
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Working…" : "Confirm"}
        </button>
      </div>
    </Modal>
  );
}
export function useUnsaved(dirty) {
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("Unsaved changes will be lost. Continue?"))
        blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    if (!dirty) return;
    const before = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", before);
    return () => {
      window.removeEventListener("beforeunload", before);
    };
  }, [dirty]);
}
export function ServiceActions({ service, onChange, full = false }) {
  const navigate = useNavigate();
  const location = useLocation(),
    { notify } = useAuth();
  const [confirm, setConfirm] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const a = service.actions || {},
    base = `/vendor/services/${service.id}`;
  const act = async () => {
    setBusy(true);
    setError("");
    try {
      const current = await vendorRequest(`/services/${service.id}`);
      const result = await save(
        `/services/${service.id}${confirm === "delete" ? "" : confirm === "active" ? "/active" : `/${confirm}`}`,
        confirm === "delete"
          ? "DELETE"
          : confirm === "active"
            ? "PATCH"
            : "POST",
        confirm === "duplicate"
          ? {}
          : {
              expectedUpdatedAt: current.updatedAt,
              ...(confirm === "active" ? { active: !service.active } : {}),
            },
      );
      setConfirm(null);
      onChange?.(result);
      if (confirm === "delete" && location.pathname === base) {
        notify(result.message);
        navigate("/vendor/services");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
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
        <Link to={base} title="View service" aria-label="View service">
          <Eye size={16} />
          {full && "View"}
        </Link>
        {a.edit && (
          <Link
            to={`${base}/edit`}
            title="Edit service"
            aria-label="Edit service"
          >
            <Pencil size={16} />
            {full && "Edit"}
          </Link>
        )}
        <button
          title="Duplicate service"
          aria-label="Duplicate service"
          onClick={() => setConfirm("duplicate")}
        >
          <Copy size={16} />
          {full && "Duplicate"}
        </button>
        {full && (
          <>
            {a.edit && (
              <>
                <Link to={`${base}/edit?step=4`}>
                  <ImagePlus size={16} />
                  Images
                </Link>
                <Link to={`${base}/edit?step=3`}>
                  <ListChecks size={16} />
                  Items
                </Link>
                <Link to={`${base}/packages`}>
                  <Package size={16} />
                  Packages
                </Link>
              </>
            )}
            <Link to={`${base}/availability`}>
              <CalendarDays size={16} />
              Availability
            </Link>
          </>
        )}
        {!full && (
          <select
            aria-label={`Manage ${service.name}`}
            value=""
            onChange={(e) => navigate(`${base}/${e.target.value}`)}
          >
            <option value="" disabled>
              Manage…
            </option>
            {a.edit && (
              <>
                <option value="edit?step=4">Manage Images</option>
                <option value="edit?step=3">Manage Items</option>
                <option value="packages">Manage Packages</option>
              </>
            )}
            <option value="availability">Availability</option>
          </select>
        )}
        {a.activate && (
          <button
            onClick={() => setConfirm("active")}
            title={service.active ? "Deactivate" : "Activate"}
          >
            <Power size={16} />
            {full && (service.active ? "Deactivate" : "Activate")}
          </button>
        )}
        {a.submit && (
          <button
            title="Submit for approval"
            onClick={() => setConfirm("submit")}
          >
            <Send size={16} />
            {full && "Submit for Approval"}
          </button>
        )}
        {a.delete && (
          <button
            className="sm-danger"
            title="Delete service"
            onClick={() => setConfirm("delete")}
          >
            <Trash2 size={16} />
            {full && "Delete"}
          </button>
        )}
      </div>
      {confirm && (
        <Confirm
          title={`${confirm === "active" ? (service.active ? "Deactivate" : "Activate") : confirm[0].toUpperCase() + confirm.slice(1)} service`}
          text={
            confirm === "delete"
              ? "Permanently delete this service and its items, packages and availability? Services with booking or quotation history cannot be deleted."
              : confirm === "submit"
                ? "Submit this service for admin review? Editing will be locked while it is pending."
                : "Continue with this action?"
          }
          onConfirm={act}
          onClose={() => {
            setConfirm(null);
            setError("");
          }}
          busy={busy}
          error={error}
        />
      )}
      {error && (
        <p className="rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fff0ed] text-[#ab4b3c]" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
export function AddButton() {
  return (
    <Link className="
      vw-button inline-flex items-center justify-center gap-[7px] [border-top:1px_solid_#dfe7d8]
      [border-right:1px_solid_#dfe7d8] [border-bottom:1px_solid_#dfe7d8] [border-left:1px_solid_#dfe7d8]
      rounded-[6px] text-[#738567] [background:#fff] [padding:9px_13px] text-[10px] leading-[1.5]
      font-medium whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42]
      [&.vw-primary]:[background:#386348] [&.vw-primary]:text-[#fff] [&.vw-primary]:[border-color:#386348]
      [&.vw-primary:hover]:[background:#2b523a] [&.vw-primary:hover]:text-[white]
      [&.vw-danger]:text-[#bd7b69] [&.vw-danger]:[background:#fff8f4] [&.vw-danger]:[border-color:#f0dfd4]
      [&.vw-accept]:text-[#5f8650] [&.vw-accept]:[background:#f0f6e9] [&.vw-accept]:[border-color:#dfebd3]
      vw-primary
    " to="/vendor/services/add">
      <Plus size={17} />
      Add New Service
    </Link>
  );
}
