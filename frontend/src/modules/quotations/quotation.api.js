import { useEffect, useState } from "react";
import { customerRequest } from "../customer/services/workspace.api";
import { vendorRequest } from "../vendor/services/workspace.api";
import { adminRequest } from "../admin/api";
export const quoteRequest = async (role, path, options = {}) => {
  const value = await {
    Customer: customerRequest,
    Vendor: vendorRequest,
    Admin: adminRequest,
  }[role](path, options);
  return value.data ?? value;
};
export const mutateQuote = (role, path, body) =>
  quoteRequest(role, path, { method: "POST", body: JSON.stringify(body) });
export function useQuotation(role, path, revision = 0) {
  const [state, setState] = useState({}),
    [attempt, setAttempt] = useState(0),
    key = `${role}:${path}:${revision}:${attempt}`;
  useEffect(() => {
    if (!path) return;
    const abort = new AbortController();
    quoteRequest(role, path, { signal: abort.signal })
      .then((data) => setState({ key, data }))
      .catch((error) => {
        if (!abort.signal.aborted) setState({ key, error });
      });
    return () => abort.abort();
  }, [role, path, key]);
  return {
    ...(state.key === key ? state : { loading: !!path }),
    retry: () => setAttempt((n) => n + 1),
  };
}
export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
export const timestamp = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    : "Not recorded";
export const workspace = (role) => `/${role.toLowerCase()}`;
