import { useEffect, useState } from "react";
import { mutate } from "../../services/apollo";
export const mediaBase = new URL(
  "/api",
  new URL(
    import.meta.env.VITE_GRAPHQL_URL || "http://localhost:5000/graphql",
    window.location.origin,
  ),
).href;
export const mediaContent = (id, variant = "gallery") =>
  `${mediaBase}/media/${id}/content?variant=${variant}`;
export async function mediaRequest(path, options = {}, retry = true) {
  const response = await fetch(`${mediaBase}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Media-Request": "1",
      ...options.headers,
    },
  });
  if (response.status === 401 && retry) {
    try {
      await mutate("refreshToken");
      return mediaRequest(path, options, false);
    } catch {
      /* Preserve original response. */
    }
  }
  const b = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(b.message || "Unable to manage media."), {
      status: response.status,
    });
  return b.data;
}
export const mediaSave = (path, method, body = {}) =>
  mediaRequest(path, { method, body: JSON.stringify(body) });
export function useMedia(path, version = 0) {
  const key = `${path}:${version}`,
    [state, setState] = useState({});
  useEffect(() => {
    if (!path) return;
    const abort = new AbortController();
    mediaRequest(path, { signal: abort.signal })
      .then((data) => setState({ key, data }))
      .catch((error) => {
        if (!abort.signal.aborted) setState({ key, error: error.message });
      });
    return () => abort.abort();
  }, [path, key]);
  return state.key === key ? state : { loading: !!path };
}
function sendMedia(body, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${mediaBase}/media/upload`);
    xhr.withCredentials = true;
    xhr.timeout = 120000;
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("X-Media-Request", "1");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let b;
      try {
        b = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Invalid upload response."));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(b.data);
      else
        reject(
          Object.assign(new Error(b.message || "Upload failed."), {
            status: xhr.status,
          }),
        );
    };
    xhr.onerror = () =>
      reject(new Error("Connection lost. Retry safely with the same request."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Retry safely."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    const stop = () => xhr.abort();
    signal?.addEventListener("abort", stop, { once: true });
    xhr.onloadend = () => signal?.removeEventListener("abort", stop);
    xhr.send(JSON.stringify(body));
  });
}
export function optimizedMediaUrl(url, variant = "card") {
  if (!url) return url;
  try {
    const u = new URL(url, window.location.origin);
    if (
      /\/api\/media\/[a-f\d-]{36}\/content$/i.test(u.pathname) &&
      ["thumb", "card", "gallery"].includes(variant)
    ) {
      u.searchParams.set("variant", variant);
      return u.href;
    }
  } catch {
    /* Keep existing safe image URLs. */
  }
  return url;
}

export async function uploadMedia(body, onProgress, signal) {
  try {
    return await sendMedia(body, onProgress, signal);
  } catch (error) {
    if (error.status !== 401 || signal?.aborted) throw error;
    await mutate("refreshToken");
    return sendMedia(body, onProgress, signal);
  }
}
