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
import "./location-management.css";
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
      className="location-management"
      aria-label="Location management"
      aria-busy={busy}
    >
      {error && (
        <div className="lm-feedback">
          <ErrorState error={error} retry={() => setError(null)} />
        </div>
      )}
      <div className="lm-overview" aria-label="Location overview">
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
          <article className={`lm-stat lm-stat--${tone}`} key={label}>
            <div className="lm-stat-top">
              <span>{label}</span>
              <span className="lm-stat-icon">
                <Icon size={18} strokeWidth={1.7} />
              </span>
            </div>
            <strong>{state.data ? value.toLocaleString("en-IN") : "-"}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </div>

      <div className="lm-workspace">
        <form
          ref={editorRef}
          className={`lm-card lm-editor ${editing ? "lm-editor--editing" : ""}`}
          onSubmit={saveLocation}
        >
          <div className="lm-card-heading">
            <span className="lm-heading-icon">
              <MapPin size={21} strokeWidth={1.7} />
            </span>
            <div>
              <span className="lm-eyebrow">LOCATION DETAILS</span>
              <h2>{editing ? "Edit location" : "Add a new location"}</h2>
            </div>
            {editing && (
              <span className="lm-editing-badge">
                <Pencil size={11} /> Editing
              </span>
            )}
          </div>
          <p className="lm-intro">
            {editing
              ? "Keep your location details accurate and up to date."
              : "Make a new city available to your vendor community."}
          </p>
          <fieldset disabled={busy} className="lm-editor-fields">
            <div className="lm-location-fields">
              {[
                ["city", "City", "e.g. Lucknow"],
                ["state", "State", "e.g. Uttar Pradesh"],
                ["country", "Country", "e.g. India"],
              ].map(([name, label, placeholder]) => (
                <label key={name} className="lm-field">
                  <span>
                    {label}{" "}
                    <span className="lm-required" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <input
                    ref={name === "city" ? cityRef : undefined}
                    className="lm-control"
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
            <label className="lm-availability">
              <span className="lm-availability-icon">
                <Globe2 size={18} strokeWidth={1.6} />
              </span>
              <span className="lm-availability-copy">
                <strong>Location availability</strong>
                <span>
                  {fields.active
                    ? "Available for vendor registration"
                    : "Hidden from registration and customer browsing"}
                </span>
              </span>
              <span className="lm-switch">
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Location active"
                  checked={fields.active}
                  onChange={(e) =>
                    setFields((old) => ({ ...old, active: e.target.checked }))
                  }
                />
                <span className="lm-switch-track" aria-hidden="true" />
              </span>
            </label>
          </fieldset>
          <div className="lm-form-footer">
            <span className="lm-form-note">
              <ShieldCheck size={14} /> No location approval required
            </span>
            <div className="lm-form-actions">
              {editing && (
                <button
                  type="button"
                  className="lm-button lm-button--secondary"
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
                className="lm-button lm-button--primary"
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle size={15} className="lm-spinner" />
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
          className="lm-card lm-assignment"
          onSubmit={(e) => {
            e.preventDefault();
            perform(`/vendors/${vendorId}/registered-location`, "PUT", {
              locationId,
            });
          }}
        >
          <div className="lm-card-heading">
            <span className="lm-heading-icon lm-heading-icon--gold">
              <UsersRound size={21} strokeWidth={1.7} />
            </span>
            <div>
              <span className="lm-eyebrow">VENDOR CONNECTIONS</span>
              <h2>Assign a registered location</h2>
            </div>
          </div>
          <p className="lm-intro">
            Connect an existing vendor to the city they serve.
          </p>
          <fieldset disabled={busy} className="lm-assignment-fields">
            <div className="lm-vendor-picker">
              <RecordPicker
                resource="vendors"
                name="vendorId"
                onChange={setVendorId}
                searchLabel="Find a vendor"
                selectLabel="Vendor"
                searchPlaceholder="Search by vendor name..."
                controlClassName="lm-control"
                labelClassName="lm-field"
              />
            </div>
            <label className="lm-field">
              <span>
                Registered location{" "}
                <span className="lm-required" aria-hidden="true">
                  *
                </span>
              </span>
              <select
                className="lm-control"
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
          <div className="lm-assignment-note">
            <ShieldCheck size={16} strokeWidth={1.6} />
            <p>
              Active locations are immediately available for vendor
              registration. Customers see a location when an approved, active
              vendor is assigned.
            </p>
          </div>
          <div className="lm-form-footer lm-assignment-footer">
            <button
              type="submit"
              className="lm-button lm-button--primary"
              disabled={busy || !vendorId || !locationId}
            >
              Assign location <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </div>

      <section
        className="lm-card lm-directory"
        aria-labelledby="lm-directory-title"
      >
        <div className="lm-directory-heading">
          <div>
            <span className="lm-eyebrow">YOUR MARKETPLACE, BY CITY</span>
            <h2 id="lm-directory-title">
              Location directory{" "}
              <span className="lm-count">
                {state.data ? locations.length : "-"}
              </span>
            </h2>
            <p>
              Manage availability and see where your vendors are represented.
            </p>
          </div>
          <label className="lm-search">
            <Search size={16} strokeWidth={1.8} />
            <input
              className="lm-control"
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
        <div className="lm-directory-toolbar">
          <div
            className="lm-filter-tabs"
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
          <span className="lm-directory-caption">
            <Globe2 size={13} /> Your service footprint
          </span>
        </div>
        {state.loading ? (
          <div className="lm-collection-state">
            <Skeleton />
          </div>
        ) : state.error ? (
          <ErrorState error={state.error} retry={state.retry} />
        ) : filteredLocations.length ? (
          <div className="lm-table-wrap">
            <table className="lm-table">
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
                        editing === location.id ? "lm-row--editing" : ""
                      }
                    >
                      <td className="lm-location-cell">
                        <div className="lm-location-identity">
                          <span className="lm-location-icon">
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
                          className={`lm-status ${location.active ? "lm-status--active" : "lm-status--inactive"}`}
                        >
                          <span />
                          {location.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td data-label="Approved vendors">
                        <span className="lm-vendor-count">
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
                          className={`lm-visibility ${visible ? "lm-visibility--visible" : location.active ? "lm-visibility--empty" : ""}`}
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
                      <td className="lm-actions-cell">
                        <div className="lm-row-actions">
                          <button
                            type="button"
                            className="lm-row-button"
                            disabled={busy}
                            onClick={() => editLocation(location)}
                            aria-label={`Edit ${location.city}, ${location.state}`}
                          >
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className={`lm-row-button ${location.active ? "" : "lm-row-button--activate"}`}
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
                            className="lm-row-button lm-row-button--delete"
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
          <div className="lm-empty">
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
                className="lm-button lm-button--secondary"
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
        <div className="lm-directory-footer">
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
