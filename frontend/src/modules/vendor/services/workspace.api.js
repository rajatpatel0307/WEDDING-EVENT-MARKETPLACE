import { mutate } from "../../../services/apollo";
const graphql =
  import.meta.env.VITE_GRAPHQL_URL || "http://localhost:5000/graphql";
const base =
  import.meta.env.VITE_VENDOR_API_URL ||
  new URL("/api/vendor", new URL(graphql, window.location.origin)).href;
export async function vendorRequest(path, options = {}, retry = true) {
  const response = await fetch(`${base}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Vendor-Request": "1",
      ...options.headers,
    },
  });
  if (response.status === 401 && retry) {
    try {
      await mutate("refreshToken");
      return vendorRequest(path, options, false);
    } catch {
      /* Preserve the original authentication error. */
    }
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(
      response.status === 401
        ? "Your session expired. Sign in again."
        : body.message || "Unable to complete this request.",
    );
    error.status = response.status;
    if (response.status === 403)
      window.dispatchEvent(new Event("vendor:access-changed"));
    throw error;
  }
  if (options.download) return response.blob();
  const body = await response.json();
  return body.data ?? body;
}
export const save = (path, method, body) =>
  vendorRequest(path, { method, body: JSON.stringify(body) });
export const money = (value, compact = false, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
export const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "—";
export const timestamp = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : "—";
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export async function readFile(file) {
  if (!file || file.size > 5 * 1024 * 1024 || !file.size)
    throw new Error("Choose a file under 5 MB.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Unable to read this file."));
    reader.readAsDataURL(file);
  });
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = /\.(pdf|png|jpe?g)$/i.test(name)
    ? name
    : `${name}${blob.type === "application/pdf" ? ".pdf" : blob.type === "image/png" ? ".png" : blob.type === "image/jpeg" ? ".jpg" : ""}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
