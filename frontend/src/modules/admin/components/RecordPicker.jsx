import { useEffect, useState } from "react";
import { adminRequest } from "../api";
export default function RecordPicker({
  resource,
  name,
  initialValue = "",
  initialLabel = "",
  onChange,
  required = true,
}) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState(initialValue),
    [rows, setRows] = useState([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      adminRequest(
        `/${resource}?${new URLSearchParams({ q: query, pageSize: "100", sort: "name", direction: "asc" })}`,
        { signal: abort.signal },
      )
        .then((result) => setRows(result.rows))
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [resource, query]);
  return (
    <>
      <input
        type="search"
        aria-label={`Search ${resource}`}
        placeholder="Search to find a record…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select
        name={name}
        value={selected}
        required={required}
        onChange={(e) => {
          setSelected(e.target.value);
          onChange?.(e.target.value);
        }}
        aria-label={`Select ${resource}`}
      >
        <option value="">
          {loading
            ? "Loading…"
            : required
              ? "Select a record"
              : "All categories"}
        </option>
        {initialValue &&
          !rows.some((r) => String(r.id) === String(initialValue)) && (
            <option value={initialValue}>
              {initialLabel || "Current selection"}
            </option>
          )}
        {rows.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
