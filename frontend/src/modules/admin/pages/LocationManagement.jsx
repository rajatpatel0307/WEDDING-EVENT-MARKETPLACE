import { useEffect, useRef, useState } from "react";
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
  Search,
  X,
  LoaderCircle,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
} from "lucide-react";
import { adminRequest } from "../api";
import { useAdminData } from "../services-management.api";
import { useAuth } from "../../../context/AuthContext";
import { ErrorState, Skeleton } from "../components/AdminTable";
import RecordPicker from "../components/RecordPicker";
import AdminDialog from "../components/AdminDialog";
import { findExistingLocation } from "../location-matching";
import {
  filterLocations,
  isLocationAvailable,
  isCustomerVisible,
} from "../location-directory";

const blank = { city: "", state: "", country: "India", active: true };
const control =
  "m-0! block h-11! w-full! min-w-0 rounded-lg! border! border-[#cbd9d1]! bg-white! px-3! py-2! text-sm! font-normal! text-[#29483e]! shadow-none! transition-colors placeholder:text-[#73857b] hover:border-[#8eab9a]! focus:border-[#176b60]! focus:outline-2! focus:outline-offset-2! focus:outline-[#176b60]! disabled:cursor-not-allowed disabled:bg-[#f1f5f2]! disabled:text-[#73857b]!";
const labelStyle =
  "flex min-w-0 flex-col gap-2 text-sm font-medium text-[#405d4f]";
const primaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#176b60] bg-[#176b60] px-4 py-2.5 text-sm font-semibold! text-white transition-colors enabled:hover:bg-[#11574e] disabled:cursor-not-allowed disabled:border-[#d5dfd9] disabled:bg-[#e9efeb] disabled:text-[#64776d]";
const secondaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#cbd9d1] bg-white px-3 py-2 text-sm font-medium text-[#405d4f] transition-colors enabled:hover:border-[#8eab9a] enabled:hover:bg-[#f1f6f3] disabled:cursor-not-allowed disabled:opacity-50";
const rowButton =
  "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#d8e3dc] bg-white p-2 text-[#405d4f] transition-colors enabled:hover:border-[#94b2a1] enabled:hover:bg-[#f1f6f3] disabled:cursor-not-allowed disabled:opacity-50";
const card =
  "min-w-0 overflow-hidden rounded-2xl border border-[#dce6df] bg-white shadow-sm";

function SelectControl({ children, ...props }) {
  return (
    <span className="relative block min-w-0">
      <select {...props} className={`${control} appearance-none pr-10!`}>
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute top-3.5 right-3 text-[#617a6c]"
        aria-hidden="true"
      />
    </span>
  );
}

function LocationFeedback({ feedback, error, onDismiss }) {
  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className={
          feedback
            ? "flex items-start gap-2 rounded-xl border border-[#bfdccc] bg-[#edf7f1] px-4 py-3 text-sm text-[#225d46]"
            : "sr-only"
        }
      >
        {feedback && (
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
        )}
        {feedback}
      </div>
      {error &&
        (error.status === 401 ? (
          <ErrorState error={error} retry={onDismiss} />
        ) : (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-[#ebcbc5] bg-[#fff6f3] px-4 py-3 text-sm text-[#963e34]"
          >
            <CircleHelp
              size={18}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">{error.message}</span>
            <button
              type="button"
              className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md hover:bg-[#f7e4de]"
              aria-label="Dismiss error"
              onClick={onDismiss}
            >
              <X size={16} />
            </button>
          </div>
        ))}
    </>
  );
}

export function LocationEditorPopup({
  editing = null,
  fields,
  setFields,
  ready,
  busy = false,
  onSubmit,
  close,
  feedback = "",
  error = null,
  onDismiss,
}) {
  const cityRef = useRef(null);
  const pending = busy ? "save" : null;
  return (
    <AdminDialog
      title={editing ? "Edit location" : "Add a location"}
      close={close}
      busy={busy}
    >
      <div className="grid gap-5">
        <LocationFeedback
          feedback={feedback}
          error={error}
          onDismiss={onDismiss}
        />
        <form
          className="grid min-w-0 gap-5"
          onSubmit={onSubmit}
          aria-label={editing ? "Edit location" : "Add a location"}
        >
          <p className="m-0 text-sm! text-[#61776a]!">
            {editing
              ? "Update this city's details and availability."
              : "Expand your marketplace to a new city."}
          </p>
          <fieldset
            disabled={busy || !ready}
            className="m-0 min-w-0 border-0 p-0"
          >
            <legend className="sr-only">Location details</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["city", "City", "e.g. Lucknow"],
                ["state", "State", "e.g. Uttar Pradesh"],
                ["country", "Country", "e.g. India"],
              ].map(([name, label, placeholder]) => (
                <label key={name} className={labelStyle}>
                  <span>
                    {label}{" "}
                    <span className="text-[#a15d3f]" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <input
                    ref={name === "city" ? cityRef : undefined}
                    autoFocus={name === "city"}
                    className={control}
                    name={name}
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete={
                      name === "city"
                        ? "address-level2"
                        : name === "state"
                          ? "address-level1"
                          : "country-name"
                    }
                    placeholder={placeholder}
                    value={fields[name]}
                    onChange={(e) =>
                      setFields((old) => ({ ...old, [name]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-[#dfe8e0] bg-[#f5f8f4] p-4">
              <Globe2
                size={21}
                className="hidden shrink-0 text-[#63846a] @min-[400px]:block"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold">
                  Location availability
                </strong>
                <span className="mt-1 block text-xs leading-5 text-[#5e7467]">
                  {fields.active
                    ? "Available for vendor registration"
                    : "Unavailable for registration and customer browsing"}
                </span>
              </span>
              <span className="relative inline-flex shrink-0">
                <input
                  type="checkbox"
                  role="switch"
                  className="peer sr-only"
                  aria-label="Location active"
                  checked={fields.active}
                  onChange={(e) =>
                    setFields((old) => ({ ...old, active: e.target.checked }))
                  }
                />
                <span
                  className="h-6 w-11 rounded-full bg-[#a5b5aa] transition-colors peer-checked:bg-[#176b60] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-[#176b60] peer-disabled:opacity-50"
                  aria-hidden="true"
                />
                <span
                  className="pointer-events-none absolute top-1 left-1 size-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
                  aria-hidden="true"
                />
              </span>
            </label>
          </fieldset>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5ece7] pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#61776a]">
              <ShieldCheck size={15} aria-hidden="true" />
              No location approval needed
            </span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                className={secondaryButton}
                disabled={busy}
                onClick={close}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={primaryButton}
                disabled={busy || !ready}
              >
                {pending === "save" ? (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : editing ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Plus size={16} aria-hidden="true" />
                )}
                {pending === "save"
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Save location"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </AdminDialog>
  );
}

export function VendorAssignmentPopup({
  vendorId,
  setVendorId,
  locationId,
  setLocationId,
  locations,
  ready,
  busy = false,
  onSubmit,
  close,
  feedback = "",
  error = null,
  onDismiss,
}) {
  const assignmentLocations = locations.filter(
    (location) => location.managed !== false && location.active,
  );
  const canAssign =
    ready && Boolean(vendorId) && isLocationAvailable(locations, locationId);
  const pending = busy ? "assign" : null;
  return (
    <AdminDialog title="Assign a vendor" close={close} busy={busy}>
      <div className="grid gap-5">
        <LocationFeedback
          feedback={feedback}
          error={error}
          onDismiss={onDismiss}
        />
        <form
          className="grid min-w-0 gap-5"
          aria-label="Assign a vendor"
          onSubmit={onSubmit}
        >
          <p className="m-0 text-sm! text-[#61776a]!">
            Connect a vendor to a registered location.
          </p>
          <fieldset
            disabled={busy || !ready || !assignmentLocations.length}
            className="m-0 min-w-0 border-0 p-0"
          >
            <legend className="sr-only">Vendor assignment</legend>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 [&>span[role=alert]]:col-span-full [&>span[role=alert]]:text-sm [&>span[role=alert]]:text-red-700">
              <RecordPicker
                resource="vendors"
                name="vendorId"
                value={vendorId}
                onChange={setVendorId}
                searchLabel="Find a vendor"
                selectLabel="Select vendor"
                searchPlaceholder="Search vendor name…"
                controlClassName={`${control} [&:is(select)]:truncate`}
                labelClassName={labelStyle}
              />
            </div>
            <label className={`${labelStyle} mt-4`}>
              <span>
                Registered location{" "}
                <span className="text-[#a15d3f]" aria-hidden="true">
                  *
                </span>
              </span>
              <SelectControl
                name="locationId"
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">
                  {!ready
                    ? "Loading locations…"
                    : !assignmentLocations.length
                      ? "No active locations available"
                      : "Select an active location"}
                </option>
                {assignmentLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.city}, {location.state}, {location.country}
                  </option>
                ))}
              </SelectControl>
            </label>
            <p
              id="assignment-hint"
              className="mt-4 mb-0 flex items-start gap-2 text-xs! leading-5 text-[#61776a]!"
            >
              <CircleHelp
                size={16}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              {ready && !assignmentLocations.length
                ? "Add or activate a location before assigning a vendor."
                : "Assign a registration location. Homepage cities follow the vendor's active business address when available."}
            </p>
          </fieldset>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5ece7] pt-4">
            <span className="text-xs text-[#61776a]">
              Vendor approval stays unchanged
            </span>
            <button
              type="button"
              className={secondaryButton}
              disabled={busy}
              onClick={close}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${primaryButton} ml-auto`}
              disabled={busy || !canAssign}
              aria-describedby="assignment-hint"
            >
              {pending === "assign" ? (
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <UsersRound size={16} aria-hidden="true" />
              )}
              {pending === "assign" ? "Assigning…" : "Assign location"}
            </button>
          </footer>
        </form>
      </div>
    </AdminDialog>
  );
}

export default function LocationManagement() {
  const state = useAdminData("/locations");
  const { notify } = useAuth();
  const [editing, setEditing] = useState(null);
  const [modal, setModal] = useState(null);
  const [fields, setFields] = useState(blank);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const requestInFlight = useRef(false);
  const busy = pending !== null;
  const locations = state.data?.data || [];
  const ready = Boolean(state.data) && !state.error;
  const activeLocations = locations.filter((location) => location.active);
  const visibleLocations = locations.filter(isCustomerVisible);
  const filteredLocations = filterLocations(locations, query, statusFilter);
  const canAssign =
    ready && Boolean(vendorId) && isLocationAvailable(locations, locationId);

  // A refreshed catalog can invalidate an assignment that was selected earlier.
  useEffect(() => {
    if (
      state.data &&
      locationId &&
      !isLocationAvailable(state.data.data || [], locationId)
    )
      setLocationId("");
  }, [state.data, locationId]);

  function resetEditor() {
    setEditing(null);
    setFields(blank);
  }

  function editLocation(location) {
    setEditing(location.id);
    setFields({
      city: location.city,
      state: location.state,
      country: location.country,
      active: !!location.active,
    });
    setError(null);
    setFeedback("");
    setModal("location");
  }

  function openLocation() {
    resetEditor();
    setError(null);
    setFeedback("");
    setModal("location");
  }
  function openAssignment() {
    setVendorId("");
    setLocationId("");
    setError(null);
    setFeedback("");
    setModal("assignment");
  }
  function closePopup() {
    if (busy || requestInFlight.current) return;
    setModal(null);
    resetEditor();
    setVendorId("");
    setLocationId("");
    setError(null);
    setFeedback("");
  }
  function assignVendor(event) {
    event.preventDefault();
    if (!canAssign || busy) return;
    perform(
      `/vendors/${vendorId}/registered-location`,
      "PUT",
      { locationId },
      "assign",
      () => {
        setVendorId("");
        setLocationId("");
        setModal(null);
      },
    );
  }

  async function perform(path, method, body, action, onSuccess) {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setPending(action);
    setError(null);
    setFeedback("");
    try {
      const result = await adminRequest(path, {
        method,
        body: JSON.stringify(body),
      });
      notify(result.message);
      setFeedback(result.message);
      if (result.existingLocation) return;
      onSuccess?.();
      state.retry();
    } catch (e) {
      setError(e);
    } finally {
      requestInFlight.current = false;
      setPending(null);
    }
  }

  function saveLocation(event) {
    event.preventDefault();
    if (busy || !ready) return;
    setError(null);
    const input = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ]),
    );
    if (
      [input.city, input.state, input.country].some((value) => value.length < 2)
    ) {
      setError(
        new Error(
          "Enter at least two characters for the city, state and country.",
        ),
      );
      return;
    }
    if (!editing) {
      const existing = findExistingLocation(
        locations.filter((location) => location.managed !== false),
        input,
      );
      if (existing) {
        const message = `${existing.city} already exists.`;
        notify(message);
        setFeedback(message);
        return;
      }
    }
    perform(
      `/locations${editing ? `/${editing}` : ""}`,
      editing ? "PUT" : "POST",
      input,
      "save",
      () => {
        resetEditor();
        setModal(null);
      },
    );
  }

  return (
    <section
      className="@container grid min-w-0 gap-6 text-[#29483e] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-3 [&_button:focus-visible]:outline-[#176b60] motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none!"
      aria-label="Location management"
      aria-busy={busy}
    >
      {!modal && (
        <LocationFeedback
          feedback={feedback}
          error={error}
          onDismiss={() => setError(null)}
        />
      )}

      <div
        className="grid grid-cols-2 gap-3 @min-[900px]:grid-cols-4 @min-[600px]:gap-4"
        aria-label="Location overview"
      >
        {[
          {
            label: "Total locations",
            value: locations.length,
            detail: "In your marketplace",
            icon: MapPin,
            tone: "bg-[#edf3ee] text-[#4f765a]",
          },
          {
            label: "Active locations",
            value: activeLocations.length,
            detail: "Across registered and vendor cities",
            icon: CheckCircle2,
            tone: "bg-[#e7f4ee] text-[#176b60]",
          },
          {
            label: "Visible to customers",
            value: visibleLocations.length,
            detail: "With approved vendors",
            icon: Eye,
            tone: "bg-[#faf2df] text-[#8a692b]",
          },
          {
            label: "Approved vendors",
            value: visibleLocations.reduce(
              (total, location) =>
                total + Number(location.approvedVendors || 0),
              0,
            ),
            detail: "Serving customer-visible cities",
            icon: UsersRound,
            tone: "bg-[#ebf1f8] text-[#456a8b]",
          },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <article className={`${card} p-4 @min-[600px]:p-5`} key={label}>
            <div className="flex items-start justify-between gap-2">
              <span className="min-h-10 min-w-0 pt-1 text-sm font-medium leading-5 text-[#526b5e] @min-[600px]:min-h-0">
                {label}
              </span>
              <span
                className={`hidden size-9 shrink-0 place-items-center rounded-xl @min-[400px]:grid ${tone}`}
              >
                <Icon size={18} aria-hidden="true" />
              </span>
            </div>
            <strong className="mt-2 block text-3xl font-semibold tracking-tight tabular-nums">
              {ready ? value.toLocaleString("en-IN") : "—"}
            </strong>
            <p className="mt-1 mb-0 text-xs! leading-5 text-[#61776a]!">
              {detail}
            </p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          className={secondaryButton}
          disabled={busy || !ready}
          aria-haspopup="dialog"
          aria-expanded={modal === "assignment"}
          onClick={openAssignment}
        >
          <UsersRound size={17} aria-hidden="true" />
          Assign a vendor
        </button>
        <button
          type="button"
          className={primaryButton}
          disabled={busy || !ready}
          aria-haspopup="dialog"
          aria-expanded={modal === "location"}
          onClick={openLocation}
        >
          <Plus size={17} aria-hidden="true" />
          Add a location
        </button>
      </div>
      {modal === "location" && (
        <LocationEditorPopup
          editing={editing}
          fields={fields}
          setFields={setFields}
          ready={ready}
          busy={busy}
          onSubmit={saveLocation}
          close={closePopup}
          feedback={feedback}
          error={error}
          onDismiss={() => setError(null)}
        />
      )}
      {modal === "assignment" && (
        <VendorAssignmentPopup
          vendorId={vendorId}
          setVendorId={setVendorId}
          locationId={locationId}
          setLocationId={setLocationId}
          locations={locations}
          ready={ready}
          busy={busy}
          onSubmit={assignVendor}
          close={closePopup}
          feedback={feedback}
          error={error}
          onDismiss={() => setError(null)}
        />
      )}

      <section className={card} aria-labelledby="location-directory-title">
        <div className="flex flex-col gap-5 px-5 pt-6 @min-[600px]:px-6 @min-[900px]:flex-row @min-[900px]:items-center @min-[900px]:justify-between">
          <div>
            <h2
              id="location-directory-title"
              className="m-0! flex items-center gap-2.5 text-lg! font-semibold!"
            >
              Location directory
              <span className="rounded-md bg-[#edf3ee] px-2 py-0.5 text-xs font-medium text-[#446b53]">
                {ready ? locations.length : "—"}
              </span>
            </h2>
            <p className="mt-1 mb-0 text-sm! text-[#61776a]!">
              Registered locations and the vendor cities shown on your homepage.
            </p>
          </div>
          <div className="flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-[#cbd9d1] bg-white px-3 focus-within:border-[#176b60] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#176b60] @min-[900px]:max-w-80">
            <Search
              size={18}
              className="shrink-0 text-[#61776a]"
              aria-hidden="true"
            />
            <input
              className="m-0! h-full! w-full! min-w-0 flex-1 border-0! bg-transparent! p-0! text-sm! shadow-none! outline-none! placeholder:text-[#73857b] focus:outline-none!"
              type="search"
              aria-label="Search locations"
              placeholder="Search city, state or country…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-[#61776a] hover:bg-[#edf3ee]"
                aria-label="Clear location search"
                onClick={() => setQuery("")}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        <p className="mx-5 mt-4 mb-0 rounded-lg bg-[#f3f7f4] px-3 py-2.5 text-xs! leading-5 text-[#526e5d]! @min-[600px]:mx-6">
          Cities from vendor addresses appear automatically. Use the same
          controls to edit, activate or deactivate any city. Inactive cities are
          hidden from customer browsing.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-5 pb-5 @min-[600px]:px-6">
          <div
            className="inline-flex w-full max-w-full gap-1 rounded-lg bg-[#f0f4f1] p-1 @min-[600px]:w-auto"
            role="group"
            aria-label="Filter locations by status"
          >
            {[
              ["all", "All locations", locations.length],
              ["active", "Active", activeLocations.length],
              [
                "inactive",
                "Inactive",
                locations.length - activeLocations.length,
              ],
            ].map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                aria-pressed={statusFilter === value}
                className={`inline-flex min-h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-2 py-2 text-sm transition-colors @min-[600px]:flex-none @min-[600px]:px-3 ${statusFilter === value ? "bg-white text-[#176b60] shadow-sm" : "text-[#5f7367] hover:bg-white/60"}`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
                <span className="hidden rounded bg-[#e8eee9] px-1.5 text-xs tabular-nums @min-[400px]:inline">
                  {count}
                </span>
              </button>
            ))}
          </div>
          <span className="hidden items-center gap-1.5 text-xs text-[#61776a] @min-[700px]:inline-flex">
            <Globe2 size={15} aria-hidden="true" />
            Your service footprint
          </span>
        </div>

        {state.loading ? (
          <Skeleton />
        ) : state.error ? (
          <ErrorState error={state.error} retry={state.retry} />
        ) : filteredLocations.length ? (
          <div className="min-w-0 overflow-x-auto">
            <table className="block w-full border-collapse text-left @min-[1000px]:table">
              <caption className="sr-only">
                Registered locations, availability, approved vendors and
                management actions
              </caption>
              <thead className="hidden border-y border-[#e1e9e3] bg-[#f5f8f5] @min-[1000px]:table-header-group">
                <tr>
                  {[
                    "Location",
                    "Status",
                    "Approved vendors",
                    "Customer visibility",
                    "Actions",
                  ].map((heading) => (
                    <th
                      scope="col"
                      key={heading}
                      className="px-5 py-3 text-xs font-semibold whitespace-nowrap text-[#536e5e] first:pl-6 last:pr-6"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="block @min-[1000px]:table-row-group">
                {filteredLocations.map((location) => {
                  const visible = isCustomerVisible(location);
                  return (
                    <tr
                      key={location.id}
                      className={`grid grid-cols-2 gap-4 border-t border-[#e5ece7] p-5 transition-colors @min-[1000px]:table-row @min-[1000px]:p-0 ${editing === location.id ? "bg-[#edf7f1]" : "hover:bg-[#fafcf9]"}`}
                    >
                      <td className="col-span-2 min-w-0 @min-[1000px]:px-5 @min-[1000px]:py-5 @min-[1000px]:pl-6">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#e0e9df] bg-[#f4f7f1] text-[#6d8864]">
                            <MapPin size={19} aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <strong className="block text-sm font-semibold wrap-anywhere">
                              {location.city}
                            </strong>
                            <span className="mt-1 block text-xs wrap-anywhere text-[#61776a]">
                              {location.state}, {location.country}
                            </span>
                            <span className="mt-1.5 inline-flex rounded bg-[#edf3ee] px-1.5 py-0.5 text-xs text-[#526e5d]">
                              {location.managed === false
                                ? "Vendor address"
                                : "Registered location"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="min-w-0 @min-[1000px]:px-5 @min-[1000px]:py-5">
                        <span className="mb-1.5 block text-xs text-[#61776a] @min-[1000px]:hidden">
                          Status
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${location.active ? "border-[#cbe3d3] bg-[#edf7ee] text-[#366443]" : "border-[#dce3de] bg-[#f1f4f2] text-[#5f6c63]"}`}
                        >
                          <span
                            className="size-1.5 rounded-full bg-current"
                            aria-hidden="true"
                          />
                          {location.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="min-w-0 @min-[1000px]:px-5 @min-[1000px]:py-5">
                        <span className="mb-1.5 block text-xs text-[#61776a] @min-[1000px]:hidden">
                          Approved vendors
                        </span>
                        <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap text-[#526e5b]">
                          <UsersRound size={16} aria-hidden="true" />
                          <strong className="font-semibold tabular-nums">
                            {Number(
                              location.approvedVendors || 0,
                            ).toLocaleString("en-IN")}
                          </strong>
                          <span className="text-xs">
                            {Number(location.approvedVendors) === 1
                              ? "vendor"
                              : "vendors"}
                          </span>
                        </span>
                      </td>
                      <td className="col-span-2 @min-[1000px]:px-5 @min-[1000px]:py-5">
                        <span className="mb-1.5 block text-xs text-[#61776a] @min-[1000px]:hidden">
                          Customer visibility
                        </span>
                        <span
                          className={`inline-flex items-center gap-2 text-xs ${visible ? "text-[#366443]" : "text-[#65766b]"}`}
                        >
                          {visible ? (
                            <Eye
                              size={16}
                              className="shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <EyeOff
                              size={16}
                              className="shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          {visible
                            ? "Visible to customers"
                            : location.active
                              ? "Waiting for approved vendors"
                              : "Hidden from customers"}
                        </span>
                      </td>
                      <td className="col-span-2 border-t border-[#e5ece7] pt-4 @min-[1000px]:w-px @min-[1000px]:border-0 @min-[1000px]:px-5 @min-[1000px]:py-5 @min-[1000px]:pr-6">
                        <div
                          className="inline-flex items-center gap-2"
                          role="group"
                          aria-label={`Actions for ${location.city}, ${location.state}`}
                        >
                          <button
                            type="button"
                            className={rowButton}
                            disabled={busy}
                            aria-label={`Edit ${location.city}, ${location.state}`}
                            title={`Edit ${location.city}`}
                            onClick={() => editLocation(location)}
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={rowButton}
                            disabled={busy}
                            aria-label={`${location.active ? "Deactivate" : "Activate"} ${location.city}, ${location.state}`}
                            title={`${location.active ? "Deactivate" : "Activate"} ${location.city}`}
                            onClick={() =>
                              perform(
                                `/locations/${location.id}`,
                                "PUT",
                                {
                                  city: location.city,
                                  state: location.state,
                                  country: location.country,
                                  active: !location.active,
                                },
                                `toggle:${location.id}`,
                                () => {
                                  if (editing === location.id)
                                    setFields((old) => ({
                                      ...old,
                                      active: !location.active,
                                    }));
                                },
                              )
                            }
                          >
                            {pending === `toggle:${location.id}` ? (
                              <LoaderCircle
                                size={14}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Power size={16} aria-hidden="true" />
                            )}
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
          <div className="flex flex-col items-center gap-3 border-t border-[#e5ece7] px-5 py-12 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-[#eef4ec] text-[#698461]">
              <MapPin size={26} aria-hidden="true" />
            </span>
            <h3 className="m-0 text-base font-semibold">
              {locations.length
                ? "No matching locations"
                : "Your next city starts here"}
            </h3>
            <p className="m-0 max-w-sm text-sm! text-[#61776a]!">
              {locations.length
                ? "Try another city, state or country, or change the status filter."
                : "Add your first location, then connect vendors to start building your marketplace."}
            </p>
            <button
              type="button"
              className={`${secondaryButton} mt-1`}
              disabled={busy}
              onClick={() => {
                if (locations.length) {
                  setQuery("");
                  setStatusFilter("all");
                } else {
                  openLocation();
                }
              }}
            >
              {locations.length ? "Clear filters" : "Add your first location"}
            </button>
          </div>
        )}
        <footer className="flex flex-col gap-2 border-t border-[#e1e9e3] bg-[#fafcf9] px-5 py-4 text-xs text-[#61776a] @min-[600px]:px-6 @min-[900px]:flex-row @min-[900px]:items-center @min-[900px]:justify-between">
          <span role="status" aria-live="polite">
            {state.error
              ? "Locations could not be loaded"
              : ready
                ? `Showing ${filteredLocations.length} of ${locations.length} locations`
                : "Loading your locations…"}
          </span>
          <span className="inline-flex items-start gap-1.5">
            <ShieldCheck size={14} className="shrink-0" aria-hidden="true" />
            Customer visibility matches the homepage's vendor location rules.
          </span>
        </footer>
      </section>
    </section>
  );
}
