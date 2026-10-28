import { useState } from "react";
import { mutate } from "../../services/apollo";

export default function PhotoUpload({ email, url, onUploaded, onBusy }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setError("");
    if (
      !file.size ||
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png"].includes(file.type)
    ) {
      setError("Choose a PNG or JPEG photo under 5 MB.");
      input.value = "";
      return;
    }
    setBusy(true);
    onBusy?.(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error("Unable to read this photo."));
        reader.readAsDataURL(file);
      });
      const result = await mutate("uploadProfilePhoto", {
        email: email || undefined,
        base64,
      });
      await onUploaded(result);
    } catch (err) {
      setError(err.message || "Unable to upload your photo.");
    } finally {
      setBusy(false);
      onBusy?.(false);
      input.value = "";
    }
  }
  return (
    <div className="profile-photo-upload">
      {url && (
        <img
          src={url}
          alt="Profile"
          width="96"
          height="96"
          style={{
            borderRadius: "50%",
            objectFit: "cover",
            width: 96,
            height: 96,
          }}
        />
      )}
      <label className="field block mb-[18px] text-[11px] font-medium [color:#55494d] [&_>_span]:block [&_>_span]:mb-[7px] [&_input]:block [&_input]:w-full [&_input]:[border:1px_solid_#e8dfe0] [&_input]:bg-white [&_input]:rounded-[6px] [&_input]:min-h-[45px] [&_input]:[padding:11px_13px] [&_input]:[color:#453438] [&_input]:text-[12px] [&_input]:[transition:border_0.2s,_box-shadow_0.2s] [&_textarea]:block [&_textarea]:w-full [&_textarea]:[border:1px_solid_#e8dfe0] [&_textarea]:bg-white [&_textarea]:rounded-[6px] [&_textarea]:min-h-[45px] [&_textarea]:[padding:11px_13px] [&_textarea]:[color:#453438] [&_textarea]:text-[12px] [&_textarea]:[transition:border_0.2s,_box-shadow_0.2s] [&_textarea]:resize-y [&_select]:block [&_select]:w-full [&_select]:[border:1px_solid_#e8dfe0] [&_select]:bg-white [&_select]:rounded-[6px] [&_select]:min-h-[45px] [&_select]:[padding:11px_13px] [&_select]:[color:#453438] [&_select]:text-[12px] [&_select]:[transition:border_0.2s,_box-shadow_0.2s] [&_input::placeholder]:[color:#b3a6aa] [&_textarea::placeholder]:[color:#b3a6aa] [&_input:focus]:[border-color:#ad7b82] [&_input:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_input:focus]:[outline:none] [&_textarea:focus]:[border-color:#ad7b82] [&_textarea:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_textarea:focus]:[outline:none] [&_select:focus]:[border-color:#ad7b82] [&_select:focus]:[box-shadow:0_0_0_3px_#ad7b8212] [&_select:focus]:[outline:none] [&_small]:block [&_small]:[color:#95868a] [&_small]:text-[10px] [&_small]:mt-[5px] [&_small]:font-normal">
        <span>Profile photo (optional)</span>
        <input
          type="file"
          accept="image/png,image/jpeg"
          disabled={
            busy ||
            (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          }
          onChange={upload}
        />
        <small>
          {busy
            ? "Uploading photo…"
            : "PNG or JPEG, up to 5 MB. Your profile photo is public."}
        </small>
      </label>
      {error && (
        <p className="error-box [padding:12px_14px] [border:1px_solid_#e8bac2] rounded-[6px] [background:#fff2f3] [color:#a1374a] text-[12px] mb-[20px] [overflow-wrap:anywhere]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
