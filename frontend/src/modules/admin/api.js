import { mutate } from "../../services/apollo";
const graphql =
  import.meta.env.VITE_GRAPHQL_URL || "http://localhost:5000/graphql";
const base =
  import.meta.env.VITE_ADMIN_API_URL ||
  new URL("/api/admin", new URL(graphql, window.location.origin)).href;
export async function adminRequest(path, options = {}, retry = true) {
  const response = await fetch(`${base}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Request": "1",
      ...options.headers,
    },
  });
  if (response.status === 401 && retry) {
    try {
      await mutate("refreshToken");
      return adminRequest(path, options, false);
    } catch {
      /* Report the original expired session. */
    }
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(
      response.status === 401
        ? "Your session expired. Sign in again."
        : response.status === 403
          ? "You do not have permission to access this workspace."
          : body.message || "Unable to load admin data. Please try again.",
    );
    error.status = response.status;
    throw error;
  }
  return options.download ? response.blob() : response.json();
}
export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const money = (value, compact = false) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(Number(value || 0));
export const number = (value) => Number(value || 0).toLocaleString("en-IN");
export const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "—";
