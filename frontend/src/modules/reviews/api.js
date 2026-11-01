import { mutate } from "../../services/apollo";
import { useEffect, useState } from "react";
import { startChatPolling } from "../../services/chat-sync";
export function useReviews(path, version = 0) {
  const key = `${path}:${version}`;
  const [state, setState] = useState({});
  useEffect(() => {
    if (!path) return;
    return startChatPolling(
      async (signal) => {
        const data = await reviewRequest(path, { signal });
        setState({ key, data });
      },
      {
        interval: 30000,
        onError: (error) => setState({ key, error: error.message }),
      },
    );
  }, [path, key]);
  return state.key === key ? state : { loading: !!path };
}
export const reviewBase = new URL(
  "/api",
  new URL(
    import.meta.env.VITE_GRAPHQL_URL || "http://localhost:5000/graphql",
    window.location.origin,
  ),
).href;
export const imageUrl = (id) => `${reviewBase}/review-images/${id}`;
export async function reviewRequest(path, options = {}, retry = true) {
  const r = await fetch(`${reviewBase}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Review-Request": "1",
      ...options.headers,
    },
  });
  if (r.status === 401 && retry) {
    try {
      await mutate("refreshToken");
      return reviewRequest(path, options, false);
    } catch {
      /* Use original error. */
    }
  }
  const b = await r.json();
  if (!r.ok) throw new Error(b.message || "Unable to load reviews.");
  return b.data;
}
export const reviewSave = (path, method, body = {}) =>
  reviewRequest(path, { method, body: JSON.stringify(body) });
