import { useEffect, useState } from "react";
import { adminRequest } from "../api";
export default function RecordPicker({
  resource,
  name,
  initialValue = "",
  initialLabel = "",
  onChange,
  required = true,
  showSearch = true,
  searchLabel,
  selectLabel,
  searchPlaceholder = "Search to find a record…",
  controlClassName,
  labelClassName,
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
  const searchInput = (
      <input
        type="search"
        className={controlClassName}
        aria-label={`Search ${resource}`}
        placeholder={searchPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
  );
  const selectInput = (
      <select
        className={controlClassName}
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
  );
  return (
    <>
      {showSearch && (searchLabel ? <label className={labelClassName}><span>{searchLabel}</span>{searchInput}</label> : searchInput)}
      {selectLabel ? <label className={labelClassName}><span>{selectLabel}</span>{selectInput}</label> : selectInput}
      {error && <span role="alert">{error}</span>}
    </>
  );
}
