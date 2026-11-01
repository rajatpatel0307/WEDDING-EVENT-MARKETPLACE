import { useEffect, useState } from "react";
import { mutate } from "../../services/apollo";
export const contentBase = new URL(
  "/api",
  new URL(
    import.meta.env.VITE_GRAPHQL_URL || "http://localhost:5000/graphql",
    window.location.origin,
  ),
).href;
export async function contentRequest(path, options = {}, retry = true) {
  const response = await fetch(contentBase + path, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-CMS-Request": "1",
      ...options.headers,
    },
  });
  if (response.status === 401 && retry) {
    try {
      await mutate("refreshToken");
      return contentRequest(path, options, false);
    } catch {
      /* Preserve original error. */
    }
  }
  const body = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(body.message || "Content is temporarily unavailable."),
      { status: response.status },
    );
  return body.data;
}
export const contentSave = (path, method, body = {}) =>
  contentRequest(path, { method, body: JSON.stringify(body) });
export function useContent(path, version = 0) {
  const key = `${path}:${version}`,
    [state, setState] = useState({});
  useEffect(() => {
    if (!path) return;
    const abort = new AbortController();
    contentRequest(path, { signal: abort.signal })
      .then((data) => setState({ key, data }))
      .catch((error) => {
        if (!abort.signal.aborted)
          setState({ key, error: error.message, status: error.status });
      });
    return () => abort.abort();
  }, [path, key]);
  return state.key === key ? state : { loading: !!path };
}
export const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#e1d8cf] bg-white px-4 py-2.5 text-sm text-[#674c50] hover:bg-[#f7f2eb] disabled:cursor-not-allowed disabled:opacity-50";
export const primary = `${button} !border-[#785257] !bg-[#785257] !text-white hover:!bg-[#614146]`;
export const input =
  "w-full min-w-0 rounded-lg border border-[#dddcd2] bg-white px-3 py-2.5 text-sm text-[#3e4c3a]";
export const panel = "rounded-2xl border border-[#e6dfd5] bg-white p-5 sm:p-7";
export const labels = {
  New: "New",
  InProgress: "In progress",
  WaitingForCustomer: "Waiting for customer",
  Resolved: "Resolved",
  Closed: "Closed",
  Spam: "Spam",
};
export const types = {
  GENERAL: "General inquiry",
  CUSTOMER: "Customer support",
  VENDOR: "Vendor support",
  BOOKING: "Booking related",
  QUOTATION: "Quotation related",
  PAYMENT: "Payment related",
  TECHNICAL: "Technical issue",
  PARTNERSHIP: "Partnership inquiry",
  CANCELLATION: "Cancellation",
  OTHER: "Other",
};
export const privacyTypes = {
  Access: "Access personal information",
  Correction: "Correct personal information",
  AccountDeletion: "Request account deletion",
  DataDeletion: "Request data deletion",
  WithdrawConsent: "Withdraw optional communication consent",
  Question: "Privacy question",
};
export const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
    : "Not set";
