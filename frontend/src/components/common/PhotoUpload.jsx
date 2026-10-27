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
      <label className="field">
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
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
