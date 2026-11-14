import { useRef, useState } from "react";
import {
  MapPin,
  Globe2,
  UsersRound,
  Eye,
  EyeOff,
  Plus,
  Check,
  Pencil,
  Power,
  Trash2,
  Search,
  X,
  LoaderCircle,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

import { adminRequest } from "../api";
import { useAdminData } from "../services-management.api";
import { useAuth } from "../../../context/AuthContext";
import { ErrorState, Skeleton } from "../components/AdminTable";
import RecordPicker from "../components/RecordPicker";
import { findExistingLocation } from "../location-matching";
const blank = { city: "", state: "", country: "India", active: true };
export default function LocationManagement() {
  const state = useAdminData("/locations"),
    { notify } = useAuth();
  const [editing, setEditing] = useState(null),
    [fields, setFields] = useState(blank);
  const [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  const [vendorId, setVendorId] = useState(""),
    [locationId, setLocationId] = useState("");
  const [query, setQuery] = useState(""),
    [statusFilter, setStatusFilter] = useState("all");
  const editorRef = useRef(null),
    cityRef = useRef(null);
  const locations = state.data?.data || [];
  const activeLocations = locations.filter((location) => location.active);
  const visibleLocations = activeLocations.filter(
    (location) => Number(location.approvedVendors) > 0,
  );
  const filteredLocations = locations.filter(
    (location) =>
      [location.city, location.state, location.country]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (statusFilter === "all" ||
        Boolean(location.active) === (statusFilter === "active")),
  );
  function editLocation(location) {
    setEditing(location.id);
    setFields({
      city: location.city,
      state: location.state,
      country: location.country,
      active: !!location.active,
    });
    editorRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest",
    });
    cityRef.current?.focus({ preventScroll: true });
  }
  async function perform(path, method, body, reset = false) {
    setBusy(true);
    setError(null);
    try {
      const result = await adminRequest(path, {
        method,
        body: JSON.stringify(body),
      });
      notify(result.message);
      if (reset && result.existingLocation) return;
      state.retry();
      if (reset) {
        setEditing(null);
        setFields(blank);
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  function saveLocation(event) {
    event.preventDefault();
    setError(null);
    if (!editing) {
      const existing = findExistingLocation(locations, fields);
      if (existing) {
        notify(`${existing.city} already exists.`);
        return;
      }
    }
    perform(
      `/locations${editing ? `/${editing}` : ""}`,
      editing ? "PUT" : "POST",
      fields,
      true,
    );
  }
  return (
    <section
      className="location-management grid min-w-0 gap-[22px] text-[#29483e] [&_fieldset]:m-0 [&_fieldset]:min-w-0 [&_fieldset]:border-0 [&_fieldset]:p-0 [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-3 [&_button:focus-visible]:outline-[#688e77] max-[760px]:gap-[18px] motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none! motion-reduce:[&_*]:scroll-auto! motion-reduce:[&_*::before]:animate-none! motion-reduce:[&_*::before]:transition-none! motion-reduce:[&_*::after]:animate-none! motion-reduce:[&_*::after]:transition-none!"
      aria-label="Location management"
      aria-busy={busy}
    >
      {error && (
        <div className="lm-feedback">
          <ErrorState error={error} retry={() => setError(null)} />
        </div>
      )}
      <div className="lm-overview grid grid-cols-4 gap-4 max-[760px]:grid-cols-2 max-[760px]:gap-3" aria-label="Location overview">
        {[
          {
            label: "Total locations",
            value: locations.length,
            detail: "Across your marketplace",
            icon: MapPin,
            tone: "sage",
          },
          {
            label: "Active locations",
            value: activeLocations.length,
            detail: "Open for vendor registration",
            icon: CheckCircle2,
            tone: "teal",
          },
          {
            label: "Visible to customers",
            value: visibleLocations.length,
            detail: "With approved vendors",
            icon: Eye,
            tone: "gold",
          },
          {
            label: "Approved vendors",
            value: locations.reduce(
              (total, location) =>
                total + Number(location.approvedVendors || 0),
              0,
            ),
            detail: "Assigned to your locations",
            icon: UsersRound,
            tone: "blue",
          },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <article className={`lm-stat rounded-xl border border-[#e3ebe5] bg-white px-[22px] pt-[19px] pb-[17px] shadow-[0_3px_12px_#243e2f03] [&>strong]:mt-1 [&>strong]:block [&>strong]:text-[30px] [&>strong]:font-semibold [&>strong]:leading-[1.35] [&>strong]:tracking-[-1px] [&>strong]:text-[#294b3e] [&>strong]:tabular-nums [&>p]:mt-[5px] [&>p]:mr-0 [&>p]:mb-0 [&>p]:ml-0 [&>p]:text-[11px]! [&>p]:leading-[1.6]! [&>p]:text-[#718378]! [&.lm-stat--teal_.lm-stat-icon]:bg-[#eaf5ef] [&.lm-stat--teal_.lm-stat-icon]:text-[#307c6d] [&.lm-stat--gold_.lm-stat-icon]:bg-[#faf5e9] [&.lm-stat--gold_.lm-stat-icon]:text-[#ae8f53] [&.lm-stat--blue_.lm-stat-icon]:bg-[#eef4f7] [&.lm-stat--blue_.lm-stat-icon]:text-[#66869b] max-[1180px]:p-4 max-[760px]:[&>strong]:text-[27px] max-[480px]:p-[14px] max-[480px]:[&>p]:text-[10px]! lm-stat--${tone}`} key={label}>
            <div className="lm-stat-top flex items-center justify-between gap-[10px] text-[12px] font-medium text-[#708578] max-[480px]:text-[11px]">
              <span>{label}</span>
              <span className="lm-stat-icon grid size-[34px] place-items-center rounded-[10px] bg-[#f0f5ee] text-[#6d8a73] max-[480px]:size-7 max-[480px]:shrink-0">
                <Icon size={18} strokeWidth={1.7} />
              </span>
            </div>
            <strong>{state.data ? value.toLocaleString("en-IN") : "-"}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </div>

      <div className="lm-workspace grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-stretch gap-[22px] max-[1180px]:grid-cols-[minmax(0,1fr)]">
        <form
          ref={editorRef}
          className={`lm-card min-w-0 rounded-[14px] border border-[#e3ebe5] bg-white shadow-[0_3px_14px_#233e2f03] lm-editor flex flex-col border-t-[3px] border-t-[#a5bdab] px-[26px] pt-[25px] pb-0 max-[760px]:px-5 max-[760px]:pt-[21px] ${editing ? "lm-editor--editing border-t-[#176b60]!" : ""}`}
          onSubmit={saveLocation}
        >
          <div className="lm-card-heading flex items-center gap-3 [&_h2]:mt-[3px]! [&_h2]:mr-0! [&_h2]:mb-0! [&_h2]:ml-0! [&_h2]:text-[17px]! [&_h2]:font-semibold! [&_h2]:leading-[1.4]! [&_h2]:tracking-[-.4px]! [&_h2]:text-[#29483e]! max-[480px]:[&_h2]:text-[15px]!">
            <span className="lm-heading-icon grid h-[43px] flex-[0_0_43px] place-items-center rounded-[11px] border border-[#e2eade] bg-[#f3f7f0] text-[#6d8b6f]">
              <MapPin size={21} strokeWidth={1.7} />
            </span>
            <div>
              <span className="lm-eyebrow block text-[9px] font-semibold leading-[1.6] tracking-[1.5px] text-[#738466]">LOCATION DETAILS</span>
              <h2>{editing ? "Edit location" : "Add a new location"}</h2>
            </div>
            {editing && (
              <span className="lm-editing-badge ml-auto inline-flex items-center gap-[5px] rounded-[20px] border border-[#d9e8de] bg-[#f1f8f2] px-2 py-1 text-[10px] whitespace-nowrap text-[#4e8371] max-[480px]:hidden">
                <Pencil size={11} /> Editing
              </span>
            )}
          </div>
          <p className="lm-intro mt-[18px] mb-[23px] text-[12px]! leading-[1.7]! text-[#687c70]!">
            {editing
              ? "Keep your location details accurate and up to date."
              : "Make a new city available to your vendor community."}
          </p>
          <fieldset disabled={busy} className="lm-editor-fields">
            <div className="lm-location-fields grid grid-cols-3 gap-[15px] max-[480px]:grid-cols-[minmax(0,1fr)]">
              {[
                ["city", "City", "e.g. Lucknow"],
                ["state", "State", "e.g. Uttar Pradesh"],
                ["country", "Country", "e.g. India"],
              ].map(([name, label, placeholder]) => (
                <label key={name} className="lm-field flex min-w-0 flex-col gap-[9px] text-[11px] font-medium leading-[1.5] text-[#607b69]">
                  <span>
                    {label}{" "}
                    <span className="lm-required ml-[2px] text-[#b99a70]" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <input
                    ref={name === "city" ? cityRef : undefined}
                    className="lm-control m-0! block! min-h-[43px]! w-full! min-w-0! max-w-full! rounded-[7px]! border! border-[#dfe8e1]! bg-white! px-3! py-[10px]! text-[12px]! font-normal! text-[#395b49]! shadow-[0_1px_2px_#203c2a02]! transition-[border-color,box-shadow]! duration-180! placeholder:text-[#a5b0a6]! focus:border-[#82a78e]! focus:shadow-[0_0_0_3px_#3c846a0c]! focus:outline-none! disabled:bg-[#f7f9f7]! [&:is(select)]:cursor-pointer! [&:is(select)]:pr-[30px]! [&:is(select)]:text-ellipsis!"
                    name={name}
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder={placeholder}
                    value={fields[name]}
                    onChange={(e) =>
                      setFields((old) => ({ ...old, [name]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <label className="lm-availability my-[23px] flex cursor-pointer items-center gap-[11px] rounded-[9px] border border-[#e7eee5] bg-[#f8faf6] p-[14px]">
              <span className="lm-availability-icon inline-flex text-[#8a9f7f]">
                <Globe2 size={18} strokeWidth={1.6} />
              </span>
              <span className="lm-availability-copy flex flex-col gap-[3px] [&_strong]:text-[12px] [&_strong]:font-medium [&_strong]:text-[#536d57] [&>span]:text-[10px] [&>span]:leading-[1.6] [&>span]:text-[#77876d]">
                <strong>Location availability</strong>
                <span>
                  {fields.active
                    ? "Available for vendor registration"
                    : "Hidden from registration and customer browsing"}
                </span>
              </span>
              <span className="lm-switch relative ml-auto h-[21px] flex-[0_0_35px] [&_input]:absolute [&_input]:inset-0 [&_input]:z-1 [&_input]:m-0 [&_input]:h-full [&_input]:w-full [&_input]:cursor-pointer [&_input]:opacity-0 [&_input:checked+.lm-switch-track]:bg-[#57896b] [&_input:checked+.lm-switch-track]:after:translate-x-[14px] [&_input:focus-visible+.lm-switch-track]:outline-2 [&_input:focus-visible+.lm-switch-track]:outline-offset-3 [&_input:focus-visible+.lm-switch-track]:outline-[#57896b]">
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Location active"
                  checked={fields.active}
                  onChange={(e) =>
                    setFields((old) => ({ ...old, active: e.target.checked }))
                  }
                />
                <span className="lm-switch-track block h-[21px] w-[35px] rounded-[20px] bg-[#ced8cf] transition-colors duration-180 after:absolute after:top-[3px] after:left-[3px] after:size-[15px] after:rounded-full after:bg-white after:shadow-[0_1px_3px_#24453326] after:transition-transform after:duration-180 after:content-['']" aria-hidden="true" />
              </span>
            </label>
          </fieldset>
          <div className="lm-form-footer mt-auto flex items-center justify-between gap-3 border-t border-[#edf1e9] pt-[18px] pb-5 max-[480px]:flex-wrap">
            <span className="lm-form-note inline-flex items-center gap-[6px] text-[10px] leading-[1.5] text-[#77886d]">
              <ShieldCheck size={14} /> No location approval required
            </span>
            <div className="lm-form-actions flex shrink-0 gap-2 max-[480px]:ml-auto">
              {editing && (
                <button
                  type="button"
                  className="lm-button inline-flex min-h-[37px] cursor-pointer items-center justify-center gap-[7px] rounded-[7px] border border-transparent px-[14px] py-[9px] text-[11px] font-medium leading-[1.6] transition-[background,box-shadow] duration-180 lm-button--secondary border-[#e1e8dc]! bg-white text-[#72816e] enabled:hover:bg-[#f5f8f1]"
                  disabled={busy}
                  onClick={() => {
                    setEditing(null);
                    setFields(blank);
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="lm-button inline-flex min-h-[37px] cursor-pointer items-center justify-center gap-[7px] rounded-[7px] border border-transparent px-[14px] py-[9px] text-[11px] font-medium leading-[1.6] transition-[background,box-shadow] duration-180 lm-button--primary border-[#176b60]! bg-[#176b60] text-white shadow-[0_2px_4px_#1d5c4210] enabled:hover:bg-[#11584e] enabled:hover:shadow-[0_3px_8px_#1d5c4220]"
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle size={15} className="lm-spinner animate-spin [animation-duration:800ms]" />
                ) : editing ? (
                  <Check size={15} />
                ) : (
                  <Plus size={15} />
                )}{" "}
                Save location
              </button>
            </div>
          </div>
        </form>

        <form
          className="lm-card min-w-0 rounded-[14px] border border-[#e3ebe5] bg-white shadow-[0_3px_14px_#233e2f03] lm-assignment flex flex-col border-t-[3px] border-t-[#d6c49e] px-[26px] pt-[25px] pb-0 max-[760px]:px-5 max-[760px]:pt-[21px]"
          onSubmit={(e) => {
            e.preventDefault();
            perform(`/vendors/${vendorId}/registered-location`, "PUT", {
              locationId,
            });
          }}
        >
          <div className="lm-card-heading flex items-center gap-3 [&_h2]:mt-[3px]! [&_h2]:mr-0! [&_h2]:mb-0! [&_h2]:ml-0! [&_h2]:text-[17px]! [&_h2]:font-semibold! [&_h2]:leading-[1.4]! [&_h2]:tracking-[-.4px]! [&_h2]:text-[#29483e]! max-[480px]:[&_h2]:text-[15px]!">
            <span className="lm-heading-icon grid h-[43px] flex-[0_0_43px] place-items-center rounded-[11px] border border-[#e2eade] bg-[#f3f7f0] text-[#6d8b6f] lm-heading-icon--gold border-[#eee6d5]! bg-[#fbf8ef]! text-[#a98a51]!">
              <UsersRound size={21} strokeWidth={1.7} />
            </span>
            <div>
              <span className="lm-eyebrow block text-[9px] font-semibold leading-[1.6] tracking-[1.5px] text-[#738466]">VENDOR CONNECTIONS</span>
              <h2>Assign a registered location</h2>
            </div>
          </div>
          <p className="lm-intro mt-[18px] mb-[23px] text-[12px]! leading-[1.7]! text-[#687c70]!">
            Connect an existing vendor to the city they serve.
          </p>
          <fieldset disabled={busy} className="lm-assignment-fields grid gap-4 max-[1180px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] max-[1180px]:items-end max-[760px]:grid-cols-[minmax(0,1fr)]">
            <div className="lm-vendor-picker grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[14px] [&>[role=alert]]:col-span-full [&>[role=alert]]:text-[11px] [&>[role=alert]]:text-[#ad5d54] max-[480px]:grid-cols-[minmax(0,1fr)]">
              <RecordPicker
                resource="vendors"
                name="vendorId"
                onChange={setVendorId}
                searchLabel="Find a vendor"
                selectLabel="Vendor"
                searchPlaceholder="Search by vendor name..."
                controlClassName="lm-control m-0! block! min-h-[43px]! w-full! min-w-0! max-w-full! rounded-[7px]! border! border-[#dfe8e1]! bg-white! px-3! py-[10px]! text-[12px]! font-normal! text-[#395b49]! shadow-[0_1px_2px_#203c2a02]! transition-[border-color,box-shadow]! duration-180! placeholder:text-[#a5b0a6]! focus:border-[#82a78e]! focus:shadow-[0_0_0_3px_#3c846a0c]! focus:outline-none! disabled:bg-[#f7f9f7]! [&:is(select)]:cursor-pointer! [&:is(select)]:pr-[30px]! [&:is(select)]:text-ellipsis!"
                labelClassName="lm-field flex min-w-0 flex-col gap-[9px] text-[11px] font-medium leading-[1.5] text-[#607b69]"
              />
            </div>
            <label className="lm-field flex min-w-0 flex-col gap-[9px] text-[11px] font-medium leading-[1.5] text-[#607b69]">
              <span>
                Registered location{" "}
                <span className="lm-required ml-[2px] text-[#b99a70]" aria-hidden="true">
                  *
                </span>
              </span>
              <select
                className="lm-control m-0! block! min-h-[43px]! w-full! min-w-0! max-w-full! rounded-[7px]! border! border-[#dfe8e1]! bg-white! px-3! py-[10px]! text-[12px]! font-normal! text-[#395b49]! shadow-[0_1px_2px_#203c2a02]! transition-[border-color,box-shadow]! duration-180! placeholder:text-[#a5b0a6]! focus:border-[#82a78e]! focus:shadow-[0_0_0_3px_#3c846a0c]! focus:outline-none! disabled:bg-[#f7f9f7]! [&:is(select)]:cursor-pointer! [&:is(select)]:pr-[30px]! [&:is(select)]:text-ellipsis!"
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">Select an active location</option>
                {activeLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.city}, {location.state}, {location.country}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <div className="lm-assignment-note mt-[17px] mb-[18px] flex items-start gap-2 text-[#a08f6c] [&_svg]:mt-px [&_svg]:shrink-0 [&_p]:m-0 [&_p]:text-[10px]! [&_p]:leading-[1.8]! [&_p]:text-[#82785e]! max-[1180px]:mb-5">
            <ShieldCheck size={16} strokeWidth={1.6} />
            <p>
              Active locations are immediately available for vendor
              registration. Customers see a location when an approved, active
              vendor is assigned.
            </p>
          </div>
          <div className="lm-form-footer mt-auto flex items-center justify-between gap-3 border-t border-[#edf1e9] pt-[18px] pb-5 max-[480px]:flex-wrap lm-assignment-footer justify-end!">
            <button
              type="submit"
              className="lm-button inline-flex min-h-[37px] cursor-pointer items-center justify-center gap-[7px] rounded-[7px] border border-transparent px-[14px] py-[9px] text-[11px] font-medium leading-[1.6] transition-[background,box-shadow] duration-180 lm-button--primary border-[#176b60]! bg-[#176b60] text-white shadow-[0_2px_4px_#1d5c4210] enabled:hover:bg-[#11584e] enabled:hover:shadow-[0_3px_8px_#1d5c4220]"
              disabled={busy || !vendorId || !locationId}
            >
              Assign location <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </div>

      <section
        className="lm-card min-w-0 rounded-[14px] border border-[#e3ebe5] bg-white shadow-[0_3px_14px_#233e2f03] lm-directory overflow-hidden"
        aria-labelledby="lm-directory-title"
      >
        <div className="lm-directory-heading flex items-center justify-between gap-6 px-[26px] pt-[25px] pb-[21px] [&_h2]:mt-[5px]! [&_h2]:mr-0! [&_h2]:mb-0! [&_h2]:ml-0! [&_h2]:flex [&_h2]:items-center [&_h2]:gap-[10px] [&_h2]:text-[18px]! [&_h2]:font-semibold! [&_h2]:tracking-[-.4px]! [&_h2]:text-[#29483e]! [&_p]:mt-[7px] [&_p]:mr-0 [&_p]:mb-0 [&_p]:ml-0 [&_p]:text-[11px]! [&_p]:leading-[1.8]! [&_p]:text-[#71836c]! max-[760px]:flex-col max-[760px]:items-stretch max-[760px]:gap-[17px] max-[760px]:px-5 max-[760px]:pt-[22px] max-[760px]:pb-[18px]">
          <div>
            <span className="lm-eyebrow block text-[9px] font-semibold leading-[1.6] tracking-[1.5px] text-[#738466]">YOUR MARKETPLACE, BY CITY</span>
            <h2 id="lm-directory-title">
              Location directory{" "}
              <span className="lm-count inline-flex h-[21px] min-w-[23px] items-center justify-center rounded-[5px] border border-[#e3ebdc] bg-[#f4f8ef] px-[6px] text-[11px] font-medium tracking-normal text-[#849a72]">
                {state.data ? locations.length : "-"}
              </span>
            </h2>
            <p>
              Manage availability and see where your vendors are represented.
            </p>
          </div>
          <label className="lm-search flex w-[290px] min-w-0 items-center gap-2 rounded-lg border border-[#e2e9df] bg-[#fcfdfb] px-3 text-[#92a087] [&>svg]:shrink-0 [&_.lm-control]:min-h-[39px]! [&_.lm-control]:border-0! [&_.lm-control]:bg-transparent! [&_.lm-control]:px-0! [&_.lm-control]:py-[10px]! [&_.lm-control]:text-[11px]! [&_.lm-control]:shadow-none! focus-within:border-[#82a78e] focus-within:shadow-[0_0_0_3px_#3c846a0c] [&_input::-webkit-search-cancel-button]:appearance-none [&_button]:inline-flex [&_button]:cursor-pointer [&_button]:border-0 [&_button]:bg-transparent [&_button]:p-[3px] [&_button]:text-[#87967e] max-[760px]:w-full [&_.lm-control:focus]:shadow-none!">
            <Search size={16} strokeWidth={1.8} />
            <input
              className="lm-control m-0! block! min-h-[43px]! w-full! min-w-0! max-w-full! rounded-[7px]! border! border-[#dfe8e1]! bg-white! px-3! py-[10px]! text-[12px]! font-normal! text-[#395b49]! shadow-[0_1px_2px_#203c2a02]! transition-[border-color,box-shadow]! duration-180! placeholder:text-[#a5b0a6]! focus:border-[#82a78e]! focus:shadow-[0_0_0_3px_#3c846a0c]! focus:outline-none! disabled:bg-[#f7f9f7]! [&:is(select)]:cursor-pointer! [&:is(select)]:pr-[30px]! [&:is(select)]:text-ellipsis!"
              type="search"
              aria-label="Search locations"
              placeholder="Search city, state or country..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear location search"
                onClick={() => setQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </label>
        </div>
        <div className="lm-directory-toolbar flex items-center justify-between gap-4 px-[26px] pt-0 pb-[17px] max-[760px]:px-5">
          <div
            className="lm-filter-tabs flex items-center gap-[3px] rounded-[7px] border border-[#e6ecdf] bg-[#f7f9f3] p-[3px] [&_button]:inline-flex [&_button]:cursor-pointer [&_button]:items-center [&_button]:gap-[7px] [&_button]:rounded-[5px] [&_button]:border [&_button]:border-transparent [&_button]:bg-transparent [&_button]:px-3 [&_button]:py-[6px] [&_button]:text-[11px] [&_button]:whitespace-nowrap [&_button]:text-[#86957b] [&_button[aria-pressed=true]]:border-[#e3e9db] [&_button[aria-pressed=true]]:bg-white [&_button[aria-pressed=true]]:text-[#3e6b51] [&_button[aria-pressed=true]]:shadow-[0_1px_3px_#344c2410] [&_button>span]:rounded [&_button>span]:bg-[#eff3e9] [&_button>span]:px-[5px] [&_button>span]:text-[9px] [&_button>span]:text-[#859575] max-[480px]:w-full max-[480px]:[&_button]:flex-1 max-[480px]:[&_button]:justify-center max-[480px]:[&_button]:px-2"
            role="group"
            aria-label="Filter locations by status"
          >
            {[
              ["all", "All locations"],
              ["active", "Active"],
              ["inactive", "Inactive"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={statusFilter === value}
                onClick={() => setStatusFilter(value)}
              >
                {label}
                {value === "all" && <span>{locations.length}</span>}
              </button>
            ))}
          </div>
          <span className="lm-directory-caption flex items-center gap-[6px] text-[10px] text-[#7e8f72] max-[760px]:hidden">
            <Globe2 size={13} /> Your service footprint
          </span>
        </div>
        {state.loading ? (
          <div className="lm-collection-state px-3 pt-0 pb-3">
            <Skeleton />
          </div>
        ) : state.error ? (
          <ErrorState error={state.error} retry={state.retry} />
        ) : filteredLocations.length ? (
          <div className="lm-table-wrap overflow-x-auto">
            <table className="lm-table w-full border-collapse text-left [&_th]:border-y! [&_th]:border-[#e8eee2]! [&_th]:bg-[#f7f9f5]! [&_th]:px-[18px]! [&_th]:py-[13px]! [&_th]:text-[10px]! [&_th]:font-medium! [&_th]:whitespace-nowrap [&_th]:text-[#697d59]! [&_td]:border-b! [&_td]:border-[#edf1e8]! [&_td]:px-[18px]! [&_td]:py-[19px]! [&_td]:align-middle [&_td]:text-[11px]! [&_th:first-child]:pl-[26px]! [&_td:first-child]:pl-[26px]! [&_th:last-child]:pr-[26px]! [&_td:last-child]:pr-[26px]! [&_tbody_tr:last-child_td]:border-b-0! [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-180 [&_tbody_tr:hover]:bg-[#fcfdf9] max-[1180px]:[&_th]:px-[14px]! max-[1180px]:[&_td]:px-[14px]! max-[760px]:block max-[760px]:[&_tbody]:block max-[760px]:[&_thead]:hidden max-[760px]:[&_tbody_tr]:grid max-[760px]:[&_tbody_tr]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] max-[760px]:[&_tbody_tr]:gap-x-3 max-[760px]:[&_tbody_tr]:gap-y-[15px] max-[760px]:[&_tbody_tr]:border-t max-[760px]:[&_tbody_tr]:border-[#e8eee2] max-[760px]:[&_tbody_tr]:px-5 max-[760px]:[&_tbody_tr]:py-[21px] max-[760px]:[&_td]:flex max-[760px]:[&_td]:w-auto max-[760px]:[&_td]:flex-col max-[760px]:[&_td]:items-start max-[760px]:[&_td]:gap-[7px] max-[760px]:[&_td]:border-0! max-[760px]:[&_td]:p-0! max-[760px]:[&_td:first-child]:p-0! max-[760px]:[&_td:last-child]:p-0! max-[760px]:[&_td[data-label]]:before:text-[10px] max-[760px]:[&_td[data-label]]:before:text-[#7f8f72] max-[760px]:[&_td[data-label]]:before:content-[attr(data-label)] max-[760px]:[&_.lm-location-cell]:mb-[2px] max-[760px]:[&_td.lm-actions-cell.lm-actions-cell]:border-t! max-[760px]:[&_td.lm-actions-cell.lm-actions-cell]:border-[#edf1e8]! max-[760px]:[&_td.lm-actions-cell.lm-actions-cell]:pt-[14px]! max-[760px]:[&_td[data-label='Customer_visibility']]:col-span-full max-[760px]:[&_td[data-label='Customer_visibility']]:flex-row max-[760px]:[&_td[data-label='Customer_visibility']]:items-center max-[760px]:[&_td[data-label='Customer_visibility']]:gap-[10px]">
              <thead>
                <tr>
                  {[
                    "Location",
                    "Status",
                    "Approved vendors",
                    "Customer visibility",
                    "Actions",
                  ].map((label) => (
                    <th scope="col" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((location) => {
                  const visible =
                    Boolean(location.active) &&
                    Number(location.approvedVendors) > 0;
                  return (
                    <tr
                      key={location.id}
                      className={
                        editing === location.id ? "lm-row--editing [&&]:bg-[#f5faf4]" : ""
                      }
                    >
                      <td className="lm-location-cell max-[760px]:col-span-full">
                        <div className="lm-location-identity flex items-center gap-[11px] [&>div]:flex [&>div]:min-w-[120px] [&>div]:flex-col [&>div]:gap-1 [&_strong]:text-[12px] [&_strong]:font-medium [&_strong]:wrap-anywhere [&_strong]:text-[#4c6a50] [&>div>span]:text-[10px] [&>div>span]:wrap-anywhere [&>div>span]:text-[#7b8b6f]">
                          <span className="lm-location-icon grid h-[38px] flex-[0_0_36px] place-items-center rounded-[9px] border border-[#e8eddf] bg-[#f7f9f2] text-[#8c9d76]">
                            <MapPin size={18} strokeWidth={1.7} />
                          </span>
                          <div>
                            <strong>{location.city}</strong>
                            <span>
                              {location.state}, {location.country}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Status">
                        <span
                          className={`lm-status inline-flex items-center gap-[5px] rounded-[5px] px-2 py-1 text-[10px] font-medium [&>span]:size-1 [&>span]:rounded-full [&>span]:bg-current ${location.active ? "lm-status--active border border-[#e2edda] bg-[#eef6e9] text-[#577e46]" : "lm-status--inactive border border-[#e9e9e0] bg-[#f4f4ef] text-[#787b6d]"}`}
                        >
                          <span />
                          {location.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td data-label="Approved vendors">
                        <span className="lm-vendor-count inline-flex items-center gap-[7px] whitespace-nowrap text-[#7d8f6e] [&_strong]:text-[12px] [&_strong]:font-medium [&_strong]:text-[#758c64] [&_strong]:tabular-nums [&>span]:text-[10px] [&>span]:text-[#7b8a70]">
                          <UsersRound size={15} strokeWidth={1.7} />
                          <strong>
                            {Number(
                              location.approvedVendors || 0,
                            ).toLocaleString("en-IN")}
                          </strong>
                          <span>
                            {Number(location.approvedVendors) === 1
                              ? "vendor"
                              : "vendors"}
                          </span>
                        </span>
                      </td>
                      <td data-label="Customer visibility">
                        <span
                          className={`lm-visibility inline-flex items-center gap-[6px] text-[10px] whitespace-nowrap text-[#8c8161] ${visible ? "lm-visibility--visible text-[#668053]!" : location.active ? "lm-visibility--empty text-[#7b8b7d]!" : ""}`}
                          title={
                            location.active && !visible
                              ? "This location is active and needs no approval. It becomes visible to customers when an approved, active vendor is assigned."
                              : undefined
                          }
                        >
                          {visible ? <Eye size={14} /> : <EyeOff size={14} />}
                          {visible
                            ? "Visible to customers"
                            : location.active
                              ? "No vendors available"
                              : "Hidden from customers"}
                        </span>
                      </td>
                      <td className="lm-actions-cell w-[1%] max-[760px]:col-span-full">
                        <div className="lm-row-actions flex gap-[6px] whitespace-nowrap max-[760px]:w-full">
                          <button
                            type="button"
                            className="lm-row-button inline-flex min-h-[30px] cursor-pointer items-center gap-[5px] rounded-md border border-[#e3eadd] bg-white px-2 py-[6px] text-[10px] font-normal! text-[#627b55] transition-[border-color,background] duration-180 enabled:hover:border-[#a9bea2] enabled:hover:bg-[#f4f8ed] enabled:hover:text-[#537a49] max-[760px]:min-h-[35px] max-[760px]:flex-1 max-[760px]:justify-center"
                            disabled={busy}
                            onClick={() => editLocation(location)}
                            aria-label={`Edit ${location.city}, ${location.state}`}
                          >
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className={`lm-row-button inline-flex min-h-[30px] cursor-pointer items-center gap-[5px] rounded-md border border-[#e3eadd] bg-white px-2 py-[6px] text-[10px] font-normal! text-[#627b55] transition-[border-color,background] duration-180 enabled:hover:border-[#a9bea2] enabled:hover:bg-[#f4f8ed] enabled:hover:text-[#537a49] max-[760px]:min-h-[35px] max-[760px]:flex-1 max-[760px]:justify-center ${location.active ? "" : "lm-row-button--activate text-[#568b66]!"}`}
                            disabled={busy}
                            onClick={() =>
                              perform(`/locations/${location.id}`, "PUT", {
                                city: location.city,
                                state: location.state,
                                country: location.country,
                                active: !location.active,
                              })
                            }
                            aria-label={`${location.active ? "Deactivate" : "Activate"} ${location.city}, ${location.state}`}
                          >
                            <Power size={13} />
                            <span>
                              {location.active ? "Deactivate" : "Activate"}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="lm-row-button inline-flex min-h-[30px] cursor-pointer items-center gap-[5px] rounded-md border border-[#e3eadd] bg-white px-2 py-[6px] text-[10px] font-normal! text-[#627b55] transition-[border-color,background] duration-180 enabled:hover:border-[#a9bea2] enabled:hover:bg-[#f4f8ed] enabled:hover:text-[#537a49] max-[760px]:min-h-[35px] max-[760px]:flex-1 max-[760px]:justify-center lm-row-button--delete border-[#efdfd9]! text-[#a2695e]! enabled:hover:border-[#d6a59a]! enabled:hover:bg-[#fcf3ef]! enabled:hover:text-[#ad5d51]!"
                            disabled={busy}
                            aria-label={`Delete ${location.city}, ${location.state}`}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete ${location.city}, ${location.state}? It will no longer be available for registration or customer browsing.`,
                                )
                              )
                                perform(
                                  `/locations/${location.id}`,
                                  "DELETE",
                                  {},
                                );
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="lm-empty flex flex-col items-center gap-[10px] border-t border-[#edf1e8] px-5 py-12 text-center [&>span]:grid [&>span]:size-[58px] [&>span]:place-items-center [&>span]:rounded-2xl [&>span]:bg-[#f4f8ee] [&>span]:text-[#95ac7f] [&_h3]:mt-[5px] [&_h3]:mr-0 [&_h3]:mb-0 [&_h3]:ml-0 [&_h3]:text-[14px] [&_h3]:font-medium [&_h3]:text-[#69825b] [&_p]:mt-0 [&_p]:mr-0 [&_p]:mb-2 [&_p]:ml-0 [&_p]:text-[12px]! [&_p]:text-[#9baa8e]!">
            <span>
              <MapPin size={27} strokeWidth={1.4} />
            </span>
            <h3>
              {locations.length ? "No matching locations" : "No locations yet"}
            </h3>
            <p>
              {locations.length
                ? "Try another search or change the status filter."
                : "Add your first location to start welcoming vendors."}
            </p>
            {locations.length > 0 && (
              <button
                type="button"
                className="lm-button inline-flex min-h-[37px] cursor-pointer items-center justify-center gap-[7px] rounded-[7px] border border-transparent px-[14px] py-[9px] text-[11px] font-medium leading-[1.6] transition-[background,box-shadow] duration-180 lm-button--secondary border-[#e1e8dc]! bg-white text-[#72816e] enabled:hover:bg-[#f5f8f1]"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
        <div className="lm-directory-footer flex items-center justify-between gap-[14px] border-t border-[#e8eee2] bg-[#fdfefa] px-[26px] py-4 text-[10px] text-[#7c8b6d] [&>span:last-child]:inline-flex [&>span:last-child]:items-center [&>span:last-child]:gap-[6px] [&>span:last-child]:text-right max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-[9px] max-[760px]:px-5 max-[760px]:[&>span:last-child]:text-left max-[760px]:[&>span:last-child]:leading-[1.7]">
          <span>
            {state.data
              ? `Showing ${filteredLocations.length} of ${locations.length} locations`
              : "Loading your locations..."}
          </span>
          <span>
            <ShieldCheck size={13} /> Visible locations have approved, active
            vendors.
          </span>
        </div>
      </section>
    </section>
  );
}
