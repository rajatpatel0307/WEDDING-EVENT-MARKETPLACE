
import { useState } from "react";
import {
  ImagePlus,
  Star,
  Trash2,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
} from "lucide-react";
import { Modal, useVendorData, ErrorView } from "../components/WorkspaceUI";
import { save, readFile, vendorRequest } from "../services/workspace.api";
export default function MediaManager({ id, onChanged, disabled = false }) {
  const [version, setVersion] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(null),
    [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(null);
  const state = useVendorData(`/services/${id}`, version),
    images = state.data?.images || [];
  const mutate = async (body, removeId = null) => {
    const current = await vendorRequest(`/services/${id}`);
    await save(
      `/services/${id}/images${removeId ? `/${removeId}` : ""}`,
      removeId ? "DELETE" : "POST",
      { ...body, expectedUpdatedAt: current.updatedAt },
    );
  };
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setVersion((v) => v + 1);
      try {
        await onChanged?.();
      } catch (e) {
        setError(e.message);
      }
      setBusy(false);
      setProgress(null);
    }
  };
  const upload = (files) =>
    run(async () => {
      const list = Array.from(files);
      if (list.length + images.length > 30)
        throw new Error("Choose up to 30 images per service.");
      for (const file of list) {
        if (!["image/jpeg", "image/png"].includes(file.type))
          throw new Error("Choose JPEG or PNG images only.");
        if (!file.size || file.size > 5 * 1024 * 1024)
          throw new Error("Each image must be under 5 MB.");
      }
      setProgress({ done: 0, total: list.length });
      for (const [index, file] of list.entries()) {
        await mutate({ base64: await readFile(file) });
        setProgress({ done: index + 1, total: list.length });
      }
    });
  const move = (i, by) =>
    run(async () => {
      const order = images.map((x) => x.id);
      [order[i], order[i + by]] = [order[i + by], order[i]];
      await mutate({ order });
    });
  return (
    <div>
      {state.error && <ErrorView error={state.error} retry={state.retry} />}
      <label
        className={`flex flex-col items-center gap-[10px] [padding:45px_20px] [border-top:1px_dashed_#b9c8ae]
          [border-right:1px_dashed_#b9c8ae] [border-bottom:1px_dashed_#b9c8ae]
          [border-left:1px_dashed_#b9c8ae] rounded-[12px] [background:#f9fbf6] relative text-center
          text-[#7f9571] cursor-pointer [&.dragging]:[background:#eaf4e4]
          [&.dragging]:[border-color:#3d714a] [&_span]:text-[11px] [&_small]:text-[10px]
          [&_small]:text-[#a1ac96] [&_input]:absolute [&_input]:[inset:0] [&_input]:opacity-[0]
          [&_input]:w-[100%] [&_input]:cursor-pointer ${drag ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!busy && !disabled) upload(e.dataTransfer.files);
        }}
      >
        <ImagePlus size={30} />
        <strong>
          {busy ? "Uploading your images…" : "Drop your best work here"}
        </strong>
        <span>
          or click to browse · JPEG / PNG · 5 MB each · Up to 30 images
        </span>
        <small>Images are optimized securely by the server.</small>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png"
          disabled={busy || disabled}
          onChange={(e) => {
            if (e.target.files?.length) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {progress && <div role="status" aria-live="polite">
        <progress max={progress.total} value={progress.done} aria-label="Images uploaded" />
        <span> {progress.done} of {progress.total} images uploaded</span>
      </div>}
      {error && (
        <p className="rounded-[9px] [padding:14px_18px] [margin:14px_0] text-[12px] [background:#fff0ed] text-[#ab4b3c]" role="alert">
          {error}
        </p>
      )}
      <div className="
        grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[16px] mt-[20px] [&_figure]:m-[0]
        [&_figure]:[border-top:1px_solid_var(--sm-border)]
        [&_figure]:[border-right:1px_solid_var(--sm-border)]
        [&_figure]:[border-bottom:1px_solid_var(--sm-border)]
        [&_figure]:[border-left:1px_solid_var(--sm-border)] [&_figure]:rounded-[10px]
        [&_figure]:overflow-hidden [&_figcaption]:flex [&_figcaption]:items-center
        [&_figcaption]:justify-between [&_figcaption]:p-[9px] [&_figcaption]:gap-[4px]
        [&_figcaption_button]:text-[9px] [&_figcaption_button]:flex [&_figcaption_button]:items-center
        [&_figcaption_button]:gap-[4px] [&_figcaption_button]:[background:none]
        [&_figcaption_button]:[border-top:0] [&_figcaption_button]:[border-right:0]
        [&_figcaption_button]:[border-bottom:0] [&_figcaption_button]:[border-left:0]
        [&_figcaption_button]:text-[#7f9272] [&_figcaption_button]:p-[2px]
        service-tablet:grid-cols-[repeat(2,_minmax(0,_1fr))] service-mobile:gap-[8px]
        service-mobile:[&_figcaption]:flex-wrap
      ">
        {images.map((image, i) => (
          <figure key={image.id}>
            <button
              type="button"
              className="
                relative [border-top:0] [border-right:0] [border-bottom:0] [border-left:0] p-[0] w-[100%] block
                [&_img]:w-[100%] [&_img]:h-[160px] [&_img]:object-cover [&_>_svg]:absolute [&_>_svg]:right-[10px]
                [&_>_svg]:bottom-[10px] [&_>_svg]:text-[white] service-mobile:[&_img]:h-[120px]
              "
              aria-label="Preview image"
              onClick={() => setPreview(image.url)}
            >
              <img
                loading="lazy"
                src={image.url}
                alt={`Service image ${i + 1}`}
              />
              <ZoomIn size={18} />
            </button>
            <figcaption>
              <button
                type="button"
                title="Set primary image"
                disabled={busy || disabled || image.primary}
                onClick={() => run(() => mutate({ primaryId: image.id }))}
              >
                <Star
                  size={15}
                  fill={image.primary ? "currentColor" : "none"}
                />
                {image.primary ? "Primary" : "Set primary"}
              </button>
              <button
                type="button"
                title="Move earlier"
                disabled={busy || disabled || i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowLeft size={14} />
              </button>
              <button
                type="button"
                title="Move later"
                disabled={busy || disabled || i === images.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                title="Delete image"
                disabled={busy || disabled}
                onClick={() => {
                  if (window.confirm("Delete this image?"))
                    run(() => mutate({}, image.id));
                }}
              >
                <Trash2 size={14} />
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
      {preview && (
        <Modal title="Image preview" close={() => setPreview(null)} wide>
          <img src={preview} alt="Service preview" className="max-w-[100%] max-h-[75vh] object-contain block m-[auto]" />
        </Modal>
      )}
    </div>
  );
}
