import { useState } from "react";
import { Plus, MapPin, Pencil } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  useVendorData,
  Heading,
  Loading,
  ErrorView,
  Badge,
  Empty,
} from "../components/WorkspaceUI";
import { RecordEditor } from "../components/WorkspaceForms";
import { save } from "../services/workspace.api";
export default function BusinessLocations() {
  const [version, setVersion] = useState(0),
    [edit, setEdit] = useState(null),
    [q, setQ] = useState(""),
    [city, setCity] = useState(""),
    [state, setState] = useState(""),
    [busy, setBusy] = useState(false),
    data = useVendorData("/locations", version),
    { notify } = useAuth();
  const refresh = () => setVersion((v) => v + 1);
  async function act(row, action) {
    if (
      action === "archive" &&
      !window.confirm(
        "Archive this location? Existing booking locations will be preserved.",
      )
    )
      return;
    setBusy(true);
    try {
      await save(
        `/locations/${row.id}${action === "primary" ? "/primary" : action === "active" ? "/active" : ""}`,
        action === "archive" ? "DELETE" : "PATCH",
        action === "active"
          ? { active: !row.active, expectedUpdatedAt: row.updatedAt }
          : {},
      );
      refresh();
      notify("Location updated.");
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  const rows = (data.data || []).filter(
    (r) =>
      (!q ||
        `${r.name} ${r.address} ${r.city} ${r.state}`
          .toLowerCase()
          .includes(q.toLowerCase())) &&
      (!city || r.city === city) &&
      (!state || r.state === state),
  );
  return (
    <>
      <Heading
        title="Business Locations"
        description="Manage your offices, studios and branches. Configure coverage separately for each service."
      >
        <button className="vw-button vw-primary" onClick={() => setEdit({})}>
          <Plus size={16} /> Add location
        </button>
      </Heading>
      <div className="flex flex-wrap gap-3 my-4">
        <input
          className="border rounded-lg p-2"
          placeholder="Search business locations"
          aria-label="Search locations"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {[
          [city, setCity, "City", "city"],
          [state, setState, "State", "state"],
        ].map(([value, set, label, key]) => (
          <select
            className="border rounded-lg p-2"
            aria-label={label}
            key={key}
            value={value}
            onChange={(e) => set(e.target.value)}
          >
            <option value="">All {label.toLowerCase()}s</option>
            {[...new Set((data.data || []).map((r) => r[key]))].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        ))}
      </div>
      {data.loading ? (
        <Loading />
      ) : data.error ? (
        <ErrorView error={data.error} retry={data.retry} />
      ) : !rows.length ? (
        <Empty title="No matching business locations" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {rows.map((row) => (
            <article key={row.id} className="p-5 border rounded-xl bg-white">
              <MapPin size={22} />
              <h2 className="font-semibold text-lg mt-3">
                {row.name || row.city}
              </h2>
              <p>{row.type}</p>
              <div className="flex gap-2 my-3">
                {row.primary && <Badge>Primary</Badge>}
                <Badge>{row.active ? "Active" : "Inactive"}</Badge>
              </div>
              <p>
                {[
                  row.address,
                  row.line2,
                  row.city,
                  row.state,
                  row.postalCode,
                  row.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <button className="vw-button" onClick={() => setEdit(row)}>
                  <Pencil size={14} /> Edit
                </button>
                {!row.primary && row.active && (
                  <button
                    className="vw-button"
                    disabled={busy}
                    onClick={() => act(row, "primary")}
                  >
                    Make primary
                  </button>
                )}
                <button
                  className="vw-button"
                  disabled={busy}
                  onClick={() => act(row, "active")}
                >
                  {row.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  className="vw-button"
                  disabled={busy}
                  onClick={() => act(row, "archive")}
                >
                  Archive
                </button>
                {row.latitude != null && row.longitude != null && (
                  <a
                    className="vw-button"
                    href={`https://www.openstreetmap.org/?mlat=${row.latitude}&mlon=${row.longitude}#map=16/${row.latitude}/${row.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View map
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {edit && (
        <RecordEditor
          kind="locations"
          row={edit.id ? edit : null}
          close={() => setEdit(null)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
