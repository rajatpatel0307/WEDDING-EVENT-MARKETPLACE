import { useState } from "react";
import { ImagePlus, X } from "lucide-react";

export default function CategoryImageUpload({ image, onReadingChange }) {
  const [preview, setPreview] = useState(image || "");
  const [base64, setBase64] = useState("");
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  return <div className="grid gap-3 rounded-xl border border-[#dfe7df] bg-[#f8faf7] p-4">
    <label htmlFor="category-image">Category image</label>
    {preview ? <img src={preview} alt="Category image preview" className="h-36 w-full rounded-lg object-cover" /> : <div className="grid h-28 place-items-center rounded-lg border border-dashed border-[#cad9ce] text-[#7c9382]"><ImagePlus size={30} aria-hidden="true" /></div>}
    <input id="category-image" type="file" disabled={reading} accept="image/png,image/jpeg,image/webp" aria-describedby="category-image-help" onChange={async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setError("");
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) {
        setError("Choose a PNG, JPEG or WebP image under 5 MB."); event.target.value = ""; return;
      }
      setReading(true);
      onReadingChange(true);
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("Unable to read this image.")); reader.readAsDataURL(file);
        });
        setBase64(dataUrl.split(",")[1]); setPreview(dataUrl); setRemoved(false);
      } catch (err) { setError(err.message); } finally { setReading(false); onReadingChange(false); }
    }} />
    <p id="category-image-help" className="text-xs!">PNG, JPEG or WebP, up to 5 MB. Uploaded to Cloudinary when you save the category.</p>
    {reading && <p role="status">Reading image…</p>}
    {error && <p role="alert" className="text-[#b25454]!">{error}</p>}
    {preview && <button type="button" disabled={reading} className="inline-flex items-center gap-1.5 justify-self-start text-xs text-[#b25454]" onClick={() => { setPreview(""); setBase64(""); setRemoved(true); }}><X size={14} /> Remove image</button>}
    {base64 && <input type="hidden" name="imageBase64" value={base64} />}
    {removed && <input type="hidden" name="removeImage" value="true" />}
  </div>;
}
