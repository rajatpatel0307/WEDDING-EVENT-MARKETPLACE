import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileText,
  LoaderCircle,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { requiredDocumentTypes } from "../services/onboarding.validation";
import {
  vendorRequest,
  save,
  readFile,
  download,
} from "../services/workspace.api";
const documentTypes = [
  ...requiredDocumentTypes,
  "Business Registration",
  "GST",
  "Other Supporting Document",
];
function UploadedDocument({
  doc,
  editable,
  busy,
  action,
  refreshProfile,
  notify,
}) {
  const [preview, setPreview] = useState(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    let url;
    vendorRequest(`/onboarding/documents/${doc.id}/file`, {
      download: true,
      signal: abort.signal,
    })
      .then((blob) => {
        if (abort.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setPreview({
          url,
          image: ["image/png", "image/jpeg"].includes(blob.type),
        });
      })
      .catch(() => {
        if (!abort.signal.aborted) setFailed(true);
      });
    return () => {
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc.id]);
  return (
    <div className="space-y-3 rounded-lg border border-[#eee4e5] bg-white p-3">
      <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg bg-[#faf8f6]">
        {preview?.image ? (
          <img
            src={preview.url}
            alt={`Uploaded ${doc.type}`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-xs text-[#947b85]">
            {!preview && !failed ? (
              <LoaderCircle className="animate-spin" size={24} />
            ) : (
              <FileText size={32} />
            )}
            <span>
              {failed
                ? "Preview unavailable"
                : preview
                  ? "PDF document uploaded"
                  : "Loading preview..."}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span
          className={
            doc.status === "Rejected" ? "text-red-700" : "text-[#667157]"
          }
        >
          {doc.status}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            aria-label={`Download ${doc.type}`}
            title="Download document"
            className="rounded border border-[#eee4e5] p-2"
            onClick={() =>
              action(async () =>
                download(
                  await vendorRequest(`/onboarding/documents/${doc.id}/file`, {
                    download: true,
                  }),
                  doc.type,
                ),
              )
            }
          >
            <Download size={16} />
          </button>
          {editable && (
            <button
              type="button"
              disabled={busy}
              aria-label={`Remove ${doc.type}`}
              title="Remove document"
              className="rounded border border-[#eee4e5] p-2 text-red-700"
              onClick={() =>
                action(async () => {
                  const result = await save(
                    `/onboarding/documents/${doc.id}`,
                    "DELETE",
                    {},
                  );
                  notify(result.message);
                  await refreshProfile();
                })
              }
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      {doc.number && (
        <p className="break-all text-xs text-[#947b85]">
          Document number: {doc.number}
        </p>
      )}
      {doc.reason && (
        <p className="whitespace-pre-wrap text-xs text-red-700">{doc.reason}</p>
      )}
    </div>
  );
}
function DocumentBox({ type, profile, busy, action, refreshProfile, notify }) {
  const [number, setNumber] = useState("");
  const fileInput = useRef(null);
  const required = requiredDocumentTypes.includes(type);
  const docs = profile.documents.filter((doc) => doc.type === type);
  const uploaded = docs.some((doc) => doc.status !== "Rejected");
  return (
    <article className="min-w-0 space-y-4 rounded-xl border border-[#e9dce1] bg-[#fffdfd] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#7d646e]">
          {type}
          {required && <span className="text-red-700"> *</span>}
        </h3>
        <span className="text-[10px] text-[#947b85]">
          {uploaded ? "Uploaded" : required ? "Required" : "Optional"}
        </span>
      </div>
      {docs.map((doc) => (
        <UploadedDocument
          key={doc.id}
          doc={doc}
          editable={profile.editable}
          busy={busy}
          action={action}
          refreshProfile={refreshProfile}
          notify={notify}
        />
      ))}
      {!docs.length && (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#d6b9c3] bg-[#fdf9fa] text-xs text-[#947b85]">
          <FileText size={30} />
          <span>No document uploaded</span>
        </div>
      )}
      {profile.editable && (
        <>
          <button
            type="button"
            disabled={busy || profile.documents.length >= 6}
            onClick={() => fileInput.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#8c414e] bg-[#8c414e] px-4 py-3 text-xs font-medium text-white hover:bg-[#763542] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UploadCloud size={20} />
            Upload {type}
          </button>
          <input
            ref={fileInput}
            type="file"
            aria-label={`Upload ${type}`}
            aria-required={required && !uploaded}
            accept=".pdf,.png,.jpg,.jpeg"
            disabled={busy || profile.documents.length >= 6}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file)
                action(async () => {
                  const base64 = await readFile(file);
                  const result = await save("/onboarding/documents", "POST", {
                    type,
                    number,
                    base64,
                  });
                  notify(result.message);
                  setNumber("");
                  await refreshProfile();
                });
            }}
          />
          <label className="block text-xs text-[#7d646e]">
            Document number (optional)
            <input
              value={number}
              maxLength={100}
              disabled={busy}
              onChange={(event) => setNumber(event.target.value)}
              className="mt-2 block w-full rounded-md border border-[#e9e1e4] bg-white p-3"
            />
          </label>
          <p className="text-[10px] text-[#947b85]">
            PNG, JPG or PDF. Up to 5 MB per file.
          </p>
        </>
      )}
    </article>
  );
}
export default function VerificationDocuments(props) {
  return (
    <>
      <p className="mb-4 text-xs text-[#947b85]">
        PAN, Identity Proof and Address Proof are required (*). Upload each
        document in its own box. {props.profile.documents.length} / 6 files
        uploaded.
      </p>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {documentTypes.map((type) => (
          <DocumentBox key={type} type={type} {...props} />
        ))}
      </div>
      {props.profile.editable && props.profile.documents.length >= 6 && (
        <p className="mt-3 text-xs text-[#947b85]">
          Six-file limit reached. Remove a document before uploading a
          replacement.
        </p>
      )}
    </>
  );
}
