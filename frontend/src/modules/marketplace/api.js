import { useEffect, useState } from "react";
const base =
  import.meta.env.VITE_MARKETPLACE_API_URL ||
  new URL(
    "/api/marketplace",
    new URL(
      import.meta.env.VITE_GRAPHQL_URL || "http://localhost:5000/graphql",
      window.location.origin,
    ),
  ).href;
export async function marketplaceRequest(path, signal) {
  const r = await fetch(`${base}${path}`, { signal });
  const b = await r.json();
  if (!r.ok) throw new Error(b.message || "Unable to load the marketplace.");
  return b.data;
}
export function useMarketplace(path) {
  const [state, setState] = useState({}),
    [attempt, setAttempt] = useState(0),
    key = `${path}:${attempt}`;
  useEffect(() => {
    if (!path) return;
    const abort = new AbortController();
    marketplaceRequest(path, abort.signal)
      .then((data) => setState({ key, data }))
      .catch((error) => {
        if (!abort.signal.aborted) setState({ key, error });
      });
    return () => abort.abort();
  }, [path, key]);
  return {
    ...(state.key === key ? state : { loading: !!path }),
    retry: () => setAttempt((a) => a + 1),
  };
}
export const money = (value) =>
  value === null || value === undefined
    ? "Custom quotation"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(Number(value));
