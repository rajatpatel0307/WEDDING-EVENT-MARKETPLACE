import { useEffect, useState } from "react";
export { adminRequest, date, number, saveBlob } from "./api";
import { adminRequest } from "./api";
export function useAdminData(path, revision = 0) {
  const [state, setState] = useState({});
  const key = `${path}:${revision}`;
  useEffect(() => {
    if (!path) return;
    const abort = new AbortController();
    adminRequest(path, { signal: abort.signal })
      .then((data) => setState({ key, data }))
      .catch((error) => {
        if (error.name !== "AbortError") setState({ key, error });
      });
    return () => abort.abort();
  }, [path, key]);
  return state.key === key ? state : { loading: !!path };
}
export function useDebounced(value, delay = 300) {
  const [result, setResult] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setResult(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return result;
}
export function serviceSummary(data) {
  return {
    id: data.ServiceId,
    name: data.ServiceName,
    vendor: data.BusinessName,
    category: data.CategoryName,
    price: data.BasePrice,
    location: data.document.location?.city,
    updatedAt: data.UpdatedAt,
  };
}
export const versionOf = (row) => ({
  expectedUpdatedAt: new Date(row.updatedAt || row.UpdatedAt).toISOString(),
});

export const money = (value, compact = false) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 1 : 2,
  }).format(Number(value || 0));
