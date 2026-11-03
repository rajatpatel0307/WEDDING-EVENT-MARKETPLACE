import { useEffect, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { Badge, Modal } from "./WorkspaceUI";
import { vendorRequest, download } from "../services/workspace.api";

export default function VendorDocumentPreview({ document, close }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    let url;
    setFile(null);
    setError("");
    vendorRequest(`/documents/${document.id}/file`, {
      download: true,
      signal: abort.signal,
    })
      .then((blob) => {
        if (abort.signal.aborted) return;
        if (!["image/png", "image/jpeg", "application/pdf"].includes(blob.type))
          throw new Error(
            "This file cannot be previewed. Download the document from the list to view it.",
          );
        url = URL.createObjectURL(blob);
        setFile({ blob, url });
      })
      .catch((error) => {
        if (!abort.signal.aborted) setError(error.message);
      });
    return () => {
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [document.id, attempt]);
  return (
    <Modal title={document.type} close={close} wide>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge>{document.status}</Badge>
          {file && (
            <button
              type="button"
              onClick={() => download(file.blob, document.type)}
              className="inline-flex items-center gap-2 rounded-md bg-[#386348] px-4 py-2 text-xs text-white"
            >
              <Download size={15} /> Download document
            </button>
          )}
        </div>
        {document.number && (
          <p className="text-xs">Document number: {document.number}</p>
        )}
        {document.reason && (
          <p className="whitespace-pre-wrap text-xs text-red-700">
            Review note: {document.reason}
          </p>
        )}
        {error ? (
          <div
            role="alert"
            className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setAttempt((previous) => previous + 1)}
              className="rounded border border-red-300 px-3 py-2"
            >
              Retry preview
            </button>
          </div>
        ) : !file ? (
          <div
            role="status"
            className="flex min-h-48 items-center justify-center gap-2 text-sm"
          >
            <LoaderCircle size={20} className="animate-spin" /> Loading
            document...
          </div>
        ) : file.blob.type === "application/pdf" ? (
          <object
            data={file.url}
            type="application/pdf"
            aria-label={`${document.type} document preview`}
            className="h-[65vh] w-full rounded-lg border border-[#e4eade]"
          >
            <p className="p-4 text-sm">
              Your browser cannot display this PDF. Use Download document to
              view it.
            </p>
          </object>
        ) : (
          <img
            src={file.url}
            alt={`${document.type} document`}
            className="max-h-[65vh] w-full rounded-lg border border-[#e4eade] bg-[#f6f8f4] object-contain"
            onError={() =>
              setError(
                "Unable to display this image. Try downloading the document.",
              )
            }
          />
        )}
      </div>
    </Modal>
  );
}
