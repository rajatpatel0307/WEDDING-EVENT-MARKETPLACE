import { useEffect, useState } from "react";
import { adminRequest } from "../api";
import SearchableFilterSelect from "./SearchableFilterSelect";
export default function RecordPicker({
  resource,
  name,
  initialValue = "",
  initialLabel = "",
  value,
  onChange,
  required = true,
  showSearch = true,
  searchLabel,
  selectLabel,
  searchPlaceholder = "Search to find a record…",
  controlClassName,
  labelClassName,
  searchableDropdown = false,
}) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState(initialValue),
    [rows, setRows] = useState([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const currentValue = value ?? selected;
  const retainedRecord = selectedRecord && String(selectedRecord.id) === String(currentValue)
    && !rows.some(row => String(row.id) === String(currentValue)) ? selectedRecord : null;
  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      adminRequest(
        `/${resource}?${new URLSearchParams({ q: query, pageSize: "100", sort: "name", direction: "asc" })}`,
        { signal: abort.signal },
      )
        .then((result) => {
          if (!abort.signal.aborted) setRows(result.rows);
        })
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
  const selectInput = searchableDropdown ? (
      <SearchableFilterSelect
        value={currentValue}
        options={[
          ...(initialValue && !rows.some(row => String(row.id) === String(initialValue))
            ? [{ value: initialValue, label: initialLabel || "Current selection" }] : []),
          ...rows.map(row => ({ value: row.id, label: row.name })),
        ]}
        placeholder={required ? "Select a record" : "All categories"}
        fallbackLabel={initialLabel}
        ariaLabel={`Select ${resource}`}
        searchLabel={`Search ${resource}`}
        searchPlaceholder={`Search ${resource}...`}
        className={controlClassName}
        loading={loading}
        onSearchChange={setQuery}
        onChange={next => { setSelected(next); onChange?.(next); }}
      />
  ) : (
      <select
        className={controlClassName}
        name={name}
        value={currentValue}
        required={required}
        onChange={(e) => {
          setSelected(e.target.value);
          setSelectedRecord(rows.find(row => String(row.id) === e.target.value) || null);
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
        {retainedRecord && <option value={retainedRecord.id}>{retainedRecord.name}</option>}
        {initialValue &&
          String(retainedRecord?.id) !== String(initialValue) &&
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
