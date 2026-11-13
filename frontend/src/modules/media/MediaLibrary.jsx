import { useEffect, useId, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ImagePlus,
  Images,
  Star,
  Trash2,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  X,
  Upload,
  ShieldCheck,
  Info,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  useMedia,
  mediaContent,
  mediaRequest,
  mediaSave,
  uploadMedia,
} from "./api";
import "./media.css";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#dce5d7] bg-white px-3 py-2 text-xs font-medium text-[#36513c] hover:bg-[#f0f5ec] disabled:cursor-not-allowed disabled:opacity-50";
const primary = `${button} !bg-[#36583e] !text-white hover:!bg-[#28452e]`;
const input =
  "w-full min-w-0 rounded-lg border border-[#dce5d7] bg-white px-3 py-2.5 text-sm text-[#354b3b]";
const panel = "rounded-2xl border border-[#e0e7db] bg-white p-5";
const date = (value) => (value ? new Date(value).toLocaleString("en-IN") : "");
const bytes = (value) =>
  Number(value || 0) > 1048576
    ? `${(Number(value) / 1048576).toFixed(1)} MB`
    : `${Math.round(Number(value || 0) / 1024)} KB`;
function State({ state }) {
  return state.loading ? (
    <p role="status" className="p-6 text-sm text-[#77866f]">
      Loading media…
    </p>
  ) : state.error ? (
    <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
      {state.error}
    </p>
  ) : null;
}
function Badge({ children }) {
  return (
    <span className="inline-flex rounded-full bg-[#eef3e9] px-2.5 py-1 text-[11px] text-[#5c7152]">
      {children}
    </span>
  );
}
export function MediaPreview({ title, close, children }) {
  const ref = useRef(null),
    id = useId();
  useEffect(() => {
    const el = ref.current;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="mm-dialog mm-module"
      aria-labelledby={id}
      onSubmit={(e) => e.stopPropagation()}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id={id} className="text-xl font-semibold">
          {title}
        </h2>
        <button
          className={button}
          onClick={close}
          type="button"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ImageLightbox({ images, index = 0, close }) {
  const [current, setCurrent] = useState(index),
    image = images[current];
  return (
    <MediaPreview
      title={image.fileName || image.name || "Image preview"}
      close={close}
    >
      <img
        className="mm-full rounded-xl"
        src={mediaContent(image.id, "gallery")}
        alt={image.fileName || "Gallery image"}
      />
      <div className="mt-4 flex items-center justify-between">
        <button type="button"
          className={button}
          onClick={() =>
            setCurrent((current + images.length - 1) % images.length)
          }
        >
          <ArrowLeft size={16} />
          Previous
        </button>
        <span>
          {current + 1} / {images.length}
        </span>
        <button type="button"
          className={button}
          onClick={() => setCurrent((current + 1) % images.length)}
        >
          Next
          <ArrowRight size={16} />
        </button>
      </div>
    </MediaPreview>
  );
}
export function MediaGallery({ type, id, variant, fallbackImage, title }) {
  const state = useMedia(`/${type}/${id}/media`),
    [index, setIndex] = useState(null);
  if (variant === "editorial") {
    const images = state.data?.rows || [];
    return (
      <section
        className="mm-module cm-editorial-gallery"
        aria-label="Image gallery"
        data-empty={!state.loading && !images.length && !fallbackImage ? "true" : undefined}
      >
        {state.loading ? (
          <div className="cm-gallery-placeholder" role="status">
            <Images size={32} aria-hidden="true" />
            <p>Loading gallery…</p>
          </div>
        ) : images.length ? (
          <>
            <div className={`cm-gallery-mosaic${images.length === 1 ? " cm-gallery-single" : images.length > 3 ? " cm-gallery-rich" : ""}`}>
              {images.slice(0, 5).map((image, i) => (
                <button
                  type="button"
                  key={image.id}
                  onClick={() => setIndex(i)}
                  aria-label={`View ${image.fileName || `photo ${i + 1}`}`}
                >
                  <img
                    src={mediaContent(image.id, i === 0 ? "gallery" : "card")}
                    alt={image.fileName || `${title || "Listing"} photo ${i + 1}`}
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                </button>
              ))}
            </div>
            <span className="cm-gallery-label"><Images size={13} aria-hidden="true" />THE GALLERY</span>
            <button type="button" className="cm-gallery-view" onClick={() => setIndex(0)}>
              <Images size={16} aria-hidden="true" />
              View all {images.length} {images.length === 1 ? "photo" : "photos"}
            </button>
          </>
        ) : fallbackImage ? (
          <img className="cm-gallery-cover" src={fallbackImage} alt={title || "Listing cover"} />
        ) : (
          <div className="cm-gallery-placeholder">
            <div className="cm-gallery-placeholder-copy">
              <span className="cm-kicker">THE POSSIBILITIES BEGIN HERE</span>
              <h2>Your next chapter.<br /><em>Beautifully imagined.</em></h2>
              <p>{state.error ? "The gallery is unavailable right now. Message the vendor for photos." : "Photos haven’t been added yet. Get a closer look at the setting for your celebration."}</p>
              <a href="#listing-booking">Ask the vendor for photos<ArrowRight size={15} aria-hidden="true" /></a>
            </div>
            <div className="cm-gallery-art" aria-hidden="true">
              <svg viewBox="0 0 300 330" fill="none" stroke="currentColor" strokeWidth="0.8">
                <path d="M60 295V140a90 90 0 0 1 180 0v155M75 295V140a75 75 0 0 1 150 0v155M90 295V140a60 60 0 0 1 120 0v155M40 295h220M35 303h230M150 80v215M90 175h120M90 235h120" />
                <circle cx="150" cy="38" r="9" /><path d="M150 17v8m0 26v8m-21-21h8m26 0h8m-36-15 6 6m18 18 6 6m0-30-6 6m-18 18-6 6" />
                <path d="M46 280c-15-34-23-57-16-97m12 82c-26 3-33-8-29-19 13-1 23 5 29 19Zm-8-29c-22-2-28-13-22-23 12 1 20 8 22 23Zm-4-30c-18-6-19-17-11-25 10 5 13 13 11 25Zm11 59c13-18 25-18 30-7-6 11-16 14-30 7Zm-8-28c12-18 23-19 29-10-4 11-15 17-29 10Z" />
                <path d="M254 280c15-34 23-57 16-97m-12 82c26 3 33-8 29-19-13-1-23 5-29 19Zm8-29c22-2 28-13 22-23-12 1-20 8-22 23Zm4-30c18-6 19-17 11-25-10 5-13 13-11 25Zm-11 59c-13-18-25-18-30-7 6 11 16 14 30 7Zm8-28c-12-18-23-19-29-10 4 11 15 17 29 10Z" />
              </svg>
              <span>THE ART OF CELEBRATING</span>
            </div>
            <span className="cm-gallery-index" aria-hidden="true">01 / THE GALLERY</span>
          </div>
        )}
        {state.error && fallbackImage && <p role="status" className="cm-gallery-note">Additional photos are unavailable right now.</p>}
        {index !== null && images[index] && (
          <ImageLightbox images={images} index={index} close={() => setIndex(null)} />
        )}
      </section>
    );
  }
  return (
    <section className="mm-module my-6" aria-label="Image gallery">
      <State state={state} />
      {state.data?.rows.length > 0 && (
        <>
          <h2 className="mb-4 text-xl font-semibold">Gallery</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {state.data.rows.map((image, i) => (
              <button
                type="button"
                className="overflow-hidden rounded-xl"
                key={image.id}
                onClick={() => setIndex(i)}
                aria-label={`View ${image.fileName || "gallery photo"}`}
              >
                <img
                  className="mm-image"
                  src={mediaContent(image.id, "card")}
                  srcSet={`${mediaContent(image.id, "thumb")} 320w, ${mediaContent(image.id, "card")} 720w`}
                  sizes="(max-width:600px) 45vw, 250px"
                  alt={image.fileName || "Gallery photo"}
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </>
      )}
      {index !== null && state.data?.rows[index] && (
        <ImageLightbox
          images={state.data.rows}
          index={index}
          close={() => setIndex(null)}
        />
      )}
    </section>
  );
}
export function MediaUploader({
  target,
  purpose = "Gallery",
  replaceId,
  done,
  maxMb = 5,
}) {
  const [files, setFiles] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    previews = useRef(new Set()),
    controller = useRef(null);
  useEffect(
    () => () => {
      controller.current?.abort();
      for (const url of previews.current) URL.revokeObjectURL(url);
    },
    [],
  );
  function choose(list) {
    setError("");
    try {
      const selected = Array.from(list);
      if (selected.length + files.length > (replaceId ? 1 : 30))
        throw new Error("Choose fewer images.");
      for (const file of selected)
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          !/\.(png|jpe?g|webp)$/i.test(file.name) ||
          !file.size ||
          file.size > maxMb * 1048576
        )
          throw new Error(`Choose JPEG, PNG or WebP images under ${maxMb} MB.`);
      setFiles((old) => [
        ...old,
        ...selected.map((file) => {
          const preview = URL.createObjectURL(file);
          previews.current.add(preview);
          return {
            file,
            preview,
            key: crypto.randomUUID(),
            progress: 0,
            status: "Ready to upload",
          };
        }),
      ]);
    } catch (err) {
      setError(err.message);
    }
  }
  const change = (key, patch) =>
    setFiles((old) => old.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  async function send() {
    if (!target?.entityId) {
      setError("Choose the image owner first.");
      return;
    }
    setBusy(true);
    controller.current = new AbortController();
    try {
      for (const item of files.filter((f) => f.status !== "Uploaded")) {
        change(item.key, { status: "Sending…" });
        try {
          const base64 = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result).split(",")[1]);
            r.onerror = () => reject(new Error("Could not read image."));
            r.readAsDataURL(item.file);
          });
          let result = await uploadMedia(
            {
              ...target,
              purpose,
              replaceId,
              requestKey: item.key,
              fileName: item.file.name,
              mimeType: item.file.type,
              base64,
            },
            (progress) =>
              change(item.key, {
                progress,
                status: progress === 100 ? "Processing securely…" : "Sending…",
              }),
            controller.current.signal,
          );
          if (result.uploadStatus === "Uploading") {
            for (
              let attempt = 0;
              attempt < 90 && result.uploadStatus === "Uploading";
              attempt++
            ) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              if (controller.current.signal.aborted)
                throw new Error("Upload cancelled.");
              result = await mediaRequest(`/media/${result.id}`, {
                signal: controller.current.signal,
              });
            }
            if (result.uploadStatus !== "Ready")
              throw new Error(
                "Upload has not completed. Retry to check its status.",
              );
          }
          change(item.key, { status: "Uploaded", progress: 100 });
        } catch (err) {
          change(item.key, {
            status: err.message,
            restart: err.status === 409 || err.status === 502,
          });
          throw err;
        }
      }
      done();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <label
        className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-[#b8c9ab] bg-[#f8faf5] p-7 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) choose(e.dataTransfer.files);
        }}
      >
        <ImagePlus size={30} className="mb-2 text-[#789369]" />
        <strong>Choose images or drop them here</strong>
        <span className="mt-1 text-xs text-[#77866f]">
          JPEG, PNG, WebP · Up to {maxMb} MB each
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={!replaceId}
          disabled={busy}
          className="mt-4 max-w-full text-xs"
          onChange={(e) => {
            choose(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {files.map((item) => (
          <div
            key={item.key}
            className="min-w-0 overflow-hidden rounded-xl border border-[#e0e7db]"
          >
            <img src={item.preview} className="mm-image" alt={item.file.name} />
            <div className="space-y-2 p-3">
              <p className="truncate text-xs">{item.file.name}</p>
              <progress
                className="h-2 w-full accent-[#65825a]"
                value={item.progress}
                max={100}
                aria-label={`${item.file.name} upload progress`}
              />
              <p className="break-words text-[11px]">{item.status}</p>
              {!busy && item.status !== "Uploaded" && (
                <div className="flex flex-wrap gap-1">
                  <button type="button"
                    className={button}
                    onClick={() => {
                      URL.revokeObjectURL(item.preview);
                      previews.current.delete(item.preview);
                      setFiles((old) => old.filter((f) => f.key !== item.key));
                    }}
                  >
                    Remove
                  </button>
                  {item.restart && (
                    <button type="button"
                      className={button}
                      onClick={() =>
                        setFiles((old) =>
                          old.map((f) =>
                            f.key === item.key
                              ? {
                                  ...f,
                                  key: crypto.randomUUID(),
                                  status: "Ready to retry",
                                  restart: false,
                                }
                              : f,
                          ),
                        )
                      }
                    >
                      Start new attempt
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <button type="button"
        className={primary}
        disabled={
          busy || !files.length || files.every((f) => f.status === "Uploaded")
        }
        onClick={send}
      >
        <Upload size={16} />
        {busy ? "Uploading…" : "Upload selected images"}
      </button>
      <p className="text-xs text-[#77866f]">
        Images remain private until their image and entity publishing policies
        allow public access.
      </p>
    </div>
  );
}
function MediaDetails({ id, close }) {
  const state = useMedia(`/media/${id}`),
    r = state.data;
  return (
    <MediaPreview title="Media details & history" close={close}>
      <State state={state} />
      {r && (
        <>
          {r.uploadStatus === "Ready" ? (
            <img
              className="mm-full rounded-xl"
              src={mediaContent(r.id)}
              alt={r.fileName || "Media preview"}
            />
          ) : (
            <p className="rounded-lg bg-amber-50 p-4 text-sm">
              {r.error ||
                "This upload is still processing; no image preview is available yet."}
            </p>
          )}
          <dl className="my-5 grid grid-cols-2 gap-3 text-sm">
            <dt>File</dt>
            <dd className="break-all">{r.fileName}</dd>
            <dt>Dimensions</dt>
            <dd>
              {r.width || "Unknown"} × {r.height || "Unknown"}
            </dd>
            <dt>Storage</dt>
            <dd>{bytes(r.size)}</dd>
            <dt>Category</dt>
            <dd>
              {r.entityType} / {r.purpose}
            </dd>
            <dt>Uploaded</dt>
            <dd>{date(r.createdAt)}</dd>
            <dt>Status</dt>
            <dd>
              {r.status} · {r.uploadStatus}
            </dd>
            <dt>Cleanup</dt>
            <dd>{r.cleanupStatus}</dd>
          </dl>
          {r.uploader?.map((u) => (
            <p key={u.id} className="text-sm">
              Uploaded by {u.name} · {u.email}
            </p>
          ))}
          {r.reason && <p className="my-3 text-sm">Moderation: {r.reason}</p>}
          <h3 className="my-4 font-semibold">History</h3>
          {r.history?.length ? (
            r.history.map((h, i) => (
              <details key={i} className="border-t border-[#e0e7db] py-3">
                <summary>
                  {date(h.CreatedAt)} · {h.ActionType}
                </summary>
                <pre className="mt-3 whitespace-pre-wrap break-all text-xs">
                  {h.OldValue}
                  {"\n"}
                  {h.NewValue}
                </pre>
              </details>
            ))
          ) : (
            <p className="text-sm text-[#77866f]">
              No history recorded for this legacy asset.
            </p>
          )}
        </>
      )}
    </MediaPreview>
  );
}
function Confirmation({ action, close, done }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <MediaPreview
      title={action.title}
      close={() => {
        if (!busy) close();
      }}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const b = Object.fromEntries(new FormData(e.currentTarget));
          setBusy(true);
          try {
            await mediaSave(action.path, action.method, b);
            done();
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="text-sm text-[#77866f]">
          {action.description ||
            "This action is checked for ownership, publishing policy and retention, and recorded in the audit history."}
        </p>
        {action.reason && (
          <label className="block text-sm">
            Moderation reason
            <textarea
              className={`${input} mt-2`}
              name="reason"
              rows={3}
              required={action.required}
              maxLength={2000}
            />
          </label>
        )}
        {action.rename && (
          <label className="block text-sm">
            Display file name
            <input
              className={`${input} mt-2`}
              name="fileName"
              required
              maxLength={255}
              defaultValue={action.fileName}
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button type="submit" className={primary} disabled={busy}>
            {busy ? "Saving…" : "Confirm"}
          </button>
          <button
            className={button}
            type="button"
            onClick={close}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </form>
    </MediaPreview>
  );
}
export default function MediaLibrary({
  role = "Vendor",
  fixedTarget,
  embedded = false,
  onChanged,
  disabled = false,
  purpose: fixedPurpose,
}) {
  const { user } = useAuth(),
    [params] = useSearchParams(),
    [version, setVersion] = useState(0),
    [page, setPage] = useState(1),
    [view, setView] = useState("grid"),
    [filters, setFilters] = useState({
      q: "",
      category: fixedTarget?.entityType || params.get("category") || "",
      entityId: fixedTarget?.entityId || params.get("entityId") || "",
      vendorId: "",
      status: "",
      uploadStatus: "",
      from: "",
      to: "",
      deleted: "false",
      orphaned: "",
    }),
    [uploading, setUploading] = useState(null),
    [uploadType, setUploadType] = useState(
      fixedTarget?.entityType ||
        (role === "Admin"
          ? "Admin"
          : role === "Customer"
            ? "Review"
            : "Vendor"),
    ),
    [uploadEntity, setUploadEntity] = useState(fixedTarget?.entityId || ""),
    [purpose, setPurpose] = useState(
      fixedPurpose ||
        (role === "Admin" && !fixedTarget ? "General" : "Gallery"),
    ),
    [details, setDetails] = useState(null),
    [lightbox, setLightbox] = useState(null),
    [action, setAction] = useState(null),
    [notice, setNotice] = useState("");
  const query = new URLSearchParams({ page: String(page) });
  for (const [k, v] of Object.entries(filters)) if (v) query.set(k, v);
  const state = useMedia(`/media?${query}`, version),
    metadata = useMedia("/media/metadata"),
    stats = useMedia(
      role === "Admin" ? "/admin/media/statistics" : null,
      version,
    );
  const refresh = () => {
    setVersion((v) => v + 1);
    setUploading(null);
    setAction(null);
    setNotice("Media library updated.");
    onChanged?.();
  };
  const choose = (key, value) => {
    setFilters((f) => ({
      ...f,
      [key]: value,
      ...(key === "category" ? { entityId: "" } : {}),
    }));
    setPage(1);
  };
  const collection = {
    Vendor: "vendors",
    Service: "services",
    Package: "packages",
    Review: "reviews",
  };
  const options = metadata.data?.[collection[uploadType]] || [];
  const currentTarget = fixedTarget || {
    entityType: uploadType,
    entityId: uploadType === "Admin" ? user?.id : uploadEntity,
  };
  const perform = (r, name) =>
    setAction({
      title: `${name[0].toUpperCase() + name.slice(1)} image`,
      path:
        name === "delete"
          ? `/media/${r.id}`
          : name === "primary"
            ? `/media/${r.id}/primary`
            : name === "rename"
              ? `/media/${r.id}`
              : `/admin/media/${r.id}/${name}`,
      method: name === "delete" ? "DELETE" : "PATCH",
      reason: ["approve", "reject", "hide", "restore"].includes(name),
      required: ["reject", "hide"].includes(name),
      rename: name === "rename",
      fileName: r.fileName,
      description:
        name === "delete"
          ? "The image will be withdrawn. Storage is retained while active or historical records reference it, and cleanup runs only after retention checks."
          : undefined,
    });
  async function move(r, by) {
    try {
      const all = await mediaRequest(
        `/media?entityId=${r.entityId}&category=${r.entityType}&uploadStatus=Ready&pageSize=60`,
      );
      for (let page = 2; all.rows.length < all.total; page++) {
        const next = await mediaRequest(
          `/media?entityId=${r.entityId}&category=${r.entityType}&uploadStatus=Ready&pageSize=60&page=${page}`,
        );
        if (!next.rows.length) break;
        all.rows.push(...next.rows);
      }
      const rows = all.rows
          .filter(
            (i) =>
              i.entityType === r.entityType &&
              i.uploadStatus === "Ready" &&
              !i.deletedAt,
          )
          .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
        index = rows.findIndex((i) => i.id === r.id),
        next = index + by;
      if (next < 0 || next >= rows.length) return;
      [rows[index], rows[next]] = [rows[next], rows[index]];
      await mediaSave("/media/reorder", "PATCH", {
        entityType: r.entityType,
        entityId: r.entityId,
        ids: rows.map((i) => i.id),
      });
      refresh();
    } catch (err) {
      setNotice(err.message);
    }
  }
  return (
    <section className="mm-module space-y-5" aria-label="Media management">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {!embedded && (
            <p className="mb-2 text-xs tracking-widest text-[#8c9c81]">
              {role.toUpperCase()} / MEDIA LIBRARY
            </p>
          )}
          <h1 className={`${embedded ? "text-xl" : "text-3xl"} font-semibold`}>
            {embedded ? "Image library" : "Your work, beautifully presented"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#77866f]">
            {role === "Admin"
              ? "Review uploads, control publication, and preserve assets used by existing bookings."
              : "Manage your profile, services and package galleries in one place."}
          </p>
        </div>
        <button type="button"
          className={primary}
          disabled={disabled || metadata.loading}
          onClick={() => setUploading({})}
        >
          <ImagePlus size={17} />
          {embedded ? "Add images" : "Upload images"}
        </button>
      </div>
      {notice && (
        <p className="rounded-lg bg-[#edf5e7] p-3 text-sm" role="status">
          {notice}
        </p>
      )}
      {role === "Admin" && (
        <>
          <State state={stats} />
          {stats.data && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className={panel}>
                <p className="text-xs text-[#77866f]">Total current files</p>
                <strong className="text-2xl">
                  {stats.data.categories.reduce(
                    (n, c) => n + Number(c.count),
                    0,
                  )}
                </strong>
              </div>
              <div className={panel}>
                <p className="text-xs text-[#77866f]">Tracked storage</p>
                <strong className="text-2xl">
                  {bytes(stats.data.trackedStorageBytes)}
                </strong>
                <p className="mt-1 text-[11px] text-[#77866f]">
                  Includes retained originals; excludes unknown legacy sizes and
                  Cloudinary derivatives.
                </p>
              </div>
              <div className={panel}>
                <p className="text-xs text-[#77866f]">Failed uploads</p>
                <strong className="text-2xl">
                  {stats.data.failedUploads || 0}
                </strong>
              </div>
              <div className={panel}>
                <p className="text-xs text-[#77866f]">Cleanup queue</p>
                <strong className="text-2xl">
                  {stats.data.cleanupQueue || 0}
                </strong>
              </div>
              {stats.data.categories.map((c) => (
                <div className={panel} key={c.category}>
                  <p className="text-xs text-[#77866f]">{c.category} images</p>
                  <strong className="text-lg">{c.count}</strong>
                  <span className="ml-2 text-xs">{bytes(c.bytes)}</span>
                </div>
              ))}
              {stats.data.statuses.map((s) => (
                <button type="button"
                  className={button}
                  key={s.status}
                  onClick={() => choose("status", s.status)}
                >
                  {s.status}: {s.count}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <div className={panel}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs">
            Search
            <input
              className={`${input} mt-1`}
              placeholder="File, vendor, service or package"
              value={filters.q}
              onChange={(e) => choose("q", e.target.value)}
              maxLength={200}
            />
          </label>
          {!fixedTarget && (
            <label className="text-xs">
              Category
              <select
                className={`${input} mt-1`}
                value={filters.category}
                onChange={(e) => choose("category", e.target.value)}
              >
                <option value="">All categories</option>
                {(role === "Customer"
                  ? ["Review"]
                  : [
                      "Vendor",
                      "Service",
                      "Package",
                      "Review",
                      ...(role === "Admin" ? ["Admin"] : []),
                    ]
                ).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
          <label className="text-xs">
            Moderation
            <select
              className={`${input} mt-1`}
              value={filters.status}
              onChange={(e) => choose("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {["Pending", "Approved", "Rejected", "Hidden"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Upload state
            <select
              className={`${input} mt-1`}
              value={filters.uploadStatus}
              onChange={(e) => choose("uploadStatus", e.target.value)}
            >
              <option value="">All uploads</option>
              {["Ready", "Uploading", "Failed"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            From
            <input
              className={`${input} mt-1`}
              type="date"
              value={filters.from}
              onChange={(e) => choose("from", e.target.value)}
            />
          </label>
          <label className="text-xs">
            Through
            <input
              className={`${input} mt-1`}
              type="date"
              value={filters.to}
              onChange={(e) => choose("to", e.target.value)}
            />
          </label>
          {role === "Admin" && (
            <>
              <label className="text-xs">
                Vendor
                <select
                  className={`${input} mt-1`}
                  value={filters.vendorId}
                  onChange={(e) => choose("vendorId", e.target.value)}
                >
                  <option value="">All vendors</option>
                  {metadata.data?.vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                Retention view
                <select
                  className={`${input} mt-1`}
                  value={filters.deleted}
                  onChange={(e) => choose("deleted", e.target.value)}
                >
                  <option value="false">Current records</option>
                  <option value="true">Withdrawn / retained</option>
                </select>
              </label>
              <label className="text-xs">
                References
                <select
                  className={`${input} mt-1`}
                  value={filters.orphaned}
                  onChange={(e) => choose("orphaned", e.target.value)}
                >
                  <option value="">All entities</option>
                  <option value="true">Missing owning entity</option>
                </select>
              </label>
            </>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button"
            className={button}
            onClick={() => setView(view === "grid" ? "list" : "grid")}
          >
            <Images size={14} />
            {view === "grid" ? "List view" : "Grid view"}
          </button>
          <button type="button" className={button} onClick={() => setVersion((v) => v + 1)}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>
      <State state={state} />
      {state.data?.rows.length === 0 && (
        <div className={`${panel} py-12 text-center`}>
          <Images size={36} className="mx-auto mb-4 text-[#94a589]" />
          <h2 className="text-lg font-semibold">
            A little space for your best work
          </h2>
          <p className="mt-2 text-sm text-[#77866f]">
            No media matches your selection. Upload an image or adjust the
            filters.
          </p>
          <button
            type="button"
            className={`${primary} mt-5 min-h-11`}
            disabled={disabled || metadata.loading}
            onClick={() => setUploading({})}
          >
            <ImagePlus size={17} aria-hidden="true" />
            Add images
          </button>
        </div>
      )}
      <div
        className={
          view === "grid"
            ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            : "grid gap-4"
        }
      >
        {state.data?.rows.map((r, index) => (
          <article
            key={r.id}
            className={`overflow-hidden rounded-2xl border border-[#e0e7db] bg-white ${view === "list" ? "sm:grid sm:grid-cols-[200px_1fr]" : ""}`}
          >
            <button type="button"
              className="block w-full text-left"
              onClick={() => setLightbox(index)}
              disabled={r.uploadStatus !== "Ready" || !!r.deletedAt}
              aria-label={`Preview ${r.fileName}`}
            >
              {r.uploadStatus === "Ready" && !r.deletedAt ? (
                <img
                  src={r.thumbnail}
                  className="mm-image"
                  alt={r.fileName || "Uploaded image"}
                  loading="lazy"
                />
              ) : (
                <div className="mm-image flex items-center justify-center">
                  <Info size={28} />
                </div>
              )}
            </button>
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{r.entityType}</Badge>
                <Badge>{r.deletedAt ? "Retained" : r.status}</Badge>
                {r.primary && <Badge>Primary</Badge>}
              </div>
              <h2 className="truncate text-sm font-semibold" title={r.fileName}>
                {r.fileName || "Legacy image"}
              </h2>
              <p className="text-xs text-[#77866f]">
                {r.vendor || r.service || r.package || r.purpose} ·{" "}
                {bytes(r.size)} · {date(r.createdAt)}
              </p>
              {r.orphaned && (
                <p className="text-xs text-amber-800">
                  Owning entity is missing. Cleanup still checks historical
                  references.
                </p>
              )}
              {r.error && <p className="text-xs text-red-700">{r.error}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={button} onClick={() => setDetails(r.id)}>
                  <Info size={13} />
                  Details
                </button>
                {!r.deletedAt && r.uploadStatus === "Ready" && (
                  <>
                    <button type="button"
                      className={button}
                      disabled={disabled}
                      onClick={() => perform(r, "primary")}
                    >
                      <Star size={13} />
                      Primary
                    </button>
                    <button type="button"
                      className={button}
                      disabled={disabled}
                      onClick={() => {
                        setUploadType(r.entityType);
                        setUploadEntity(r.entityId);
                        setPurpose(r.purpose);
                        setUploading({
                          replaceId: r.id,
                          target: {
                            entityType: r.entityType,
                            entityId: r.entityId,
                          },
                        });
                      }}
                    >
                      Replace
                    </button>
                    <button type="button"
                      className={button}
                      disabled={disabled}
                      onClick={() => perform(r, "rename")}
                    >
                      Rename
                    </button>
                    <button type="button"
                      className={button}
                      disabled={disabled}
                      onClick={() => move(r, -1)}
                      aria-label="Move image earlier"
                    >
                      <ArrowLeft size={13} />
                    </button>
                    <button type="button"
                      className={button}
                      disabled={disabled}
                      onClick={() => move(r, 1)}
                      aria-label="Move image later"
                    >
                      <ArrowRight size={13} />
                    </button>
                  </>
                )}
                {!r.deletedAt && (
                  <button type="button"
                    className={`${button} !text-red-700`}
                    disabled={disabled}
                    onClick={() => perform(r, "delete")}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                )}
                {role === "Admin" &&
                  !r.deletedAt &&
                  r.uploadStatus === "Ready" &&
                  ["approve", "reject", "hide", "restore"].map((name) => (
                    <button type="button"
                      className={button}
                      key={name}
                      onClick={() => perform(r, name)}
                    >
                      <ShieldCheck size={13} />
                      {name[0].toUpperCase() + name.slice(1)}
                    </button>
                  ))}
              </div>
            </div>
          </article>
        ))}
      </div>
      {state.data && state.data.total > state.data.pageSize && (
        <nav className="flex items-center gap-3" aria-label="Media pages">
          <button type="button"
            className={button}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span className="text-xs">
            Page {page} of {Math.ceil(state.data.total / state.data.pageSize)}
          </span>
          <button type="button"
            className={button}
            disabled={page * state.data.pageSize >= state.data.total}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </nav>
      )}
      {uploading && (
        <MediaPreview
          title={uploading.replaceId ? "Replace image" : "Upload images"}
          close={() => setUploading(null)}
        >
          {!fixedTarget && !uploading.target && (
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Category
                <select
                  className={`${input} mt-1`}
                  value={uploadType}
                  onChange={(e) => {
                    setUploadType(e.target.value);
                    setUploadEntity("");
                    setPurpose(
                      e.target.value === "Admin" ? "General" : "Gallery",
                    );
                  }}
                >
                  {(role === "Admin"
                    ? ["Admin", "Vendor", "Service", "Package"]
                    : role === "Customer"
                      ? ["Review"]
                      : ["Vendor", "Service", "Package"]
                  ).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              {uploadType !== "Admin" && (
                <label className="text-sm">
                  Associated {uploadType.toLowerCase()}
                  <select
                    className={`${input} mt-1`}
                    value={uploadEntity}
                    onChange={(e) => setUploadEntity(e.target.value)}
                  >
                    <option value="">Choose an owner</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          {!fixedPurpose && uploadType !== "Review" && (
            <label className="mb-5 block text-sm">
              Image purpose
              <select
                className={`${input} mt-1`}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              >
                {(uploadType === "Vendor"
                  ? ["Logo", "Cover", "Gallery", "Portfolio", "Office", "Team"]
                  : uploadType === "Admin"
                    ? ["Banner", "Category", "Promotion", "General"]
                    : ["Cover", "Gallery", "Portfolio"]
                ).map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          )}
          {uploadType === "Admin" && (
            <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Platform uploads are stored in the library. They do not replace
              Home Page banners or other existing assets.
            </p>
          )}
          <MediaUploader
            key={`${uploadType}:${uploading.replaceId || ""}`}
            target={uploading.target || currentTarget}
            purpose={fixedPurpose || purpose}
            replaceId={uploading.replaceId}
            maxMb={uploadType === "Review" ? 2 : metadata.data?.maxMb || 5}
            done={refresh}
          />
        </MediaPreview>
      )}
      {details && <MediaDetails id={details} close={() => setDetails(null)} />}{" "}
      {lightbox !== null && state.data?.rows[lightbox] && (
        <ImageLightbox
          images={state.data.rows}
          index={lightbox}
          close={() => setLightbox(null)}
        />
      )}{" "}
      {action && (
        <Confirmation
          action={action}
          close={() => setAction(null)}
          done={refresh}
        />
      )}{" "}
      {!embedded && role === "Customer" && (
        <Link className={button} to="/customer/reviews">
          Back to your reviews
        </Link>
      )}
    </section>
  );
}
