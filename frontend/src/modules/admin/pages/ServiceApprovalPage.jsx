import ServiceReviewDetails, { ServiceReviewHeader } from "../components/ServiceReviewDetails";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { adminRequest } from "../api";
import DecisionDialog from "../components/ServiceDecisionDialog";
import { useAuth } from "../../../context/AuthContext";

function useReviewData(path, revision) {
  const [state, setState] = useState({ loading: true });
  const key = `${path}:${revision}`;
  useEffect(() => {
    const abort = new AbortController();
    adminRequest(path, { signal: abort.signal })
      .then((data) => setState({ key, data }))
      .catch((error) => {
        if (error.name !== "AbortError") setState({ key, error });
      });
    return () => abort.abort();
  }, [path, key]);
  return state.key === key ? state : { loading: true };
}
export default function ServiceApprovalPage() {
  const { serviceId } = useParams(),
    { notify } = useAuth();
  const [revision, setRevision] = useState(0),
    [dialog, setDialog] = useState(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const refresh = () => setRevision((v) => v + 1);
  const state = useReviewData(
    `/services/${serviceId}/review`,
    revision,
  );
  useEffect(() => {
    const update = () => setRevision((v) => v + 1);
    window.addEventListener("focus", update);
    return () => window.removeEventListener("focus", update);
  }, []);
  const saved = (message) => {
    setDialog(null);
    setNotice(message);
    notify(message);
    refresh();
  };
  const data = state.data;
  const s =
    data
      ? {
          id: data.ServiceId,
          name: data.ServiceName,
          vendor: data.BusinessName,
          category: data.CategoryName,
          price: data.BasePrice,
          location: data.document?.location?.city,
          updatedAt: data.UpdatedAt,
        }
      : null;
  async function startReview() {
    setBusy(true);
    setActionError("");
    try {
      const result = await adminRequest(`/services/${serviceId}/start-review`, {
        method: "POST",
        body: JSON.stringify({
          expectedUpdatedAt: new Date(s.updatedAt).toISOString(),
        }),
      });
      setActionError("");
      saved(result.message);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="service-review-page grid min-w-0 gap-6 text-[13px] text-[#293e35] [&_:where(a,button,summary)]:[-webkit-tap-highlight-color:transparent] [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-[#a58952]! [&_:focus-visible]:outline-offset-4 [@media(width<=600px)]:gap-5 motion-reduce:[&_*]:transition-none! motion-reduce:[&_*::before]:transition-none!">
      <ServiceReviewHeader />
      {notice && (
        <p role="status" className="rounded-lg border border-[#d9e5cf] bg-[#edf4e8] px-[18px] py-[14px] text-[12px]! text-[#496c3d]!">
          {notice}
        </p>
      )}
      {state.loading && (
        <section className="ad-panel p-[24px] [@media(width<=640px)]:p-[16px] [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]" role="status">
          Loading services…
        </section>
      )}
      {state.error && (
        <section className="ad-panel p-[24px] [@media(width<=640px)]:p-[16px] [background:white] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e5ebe6] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e5ebe6] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e5ebe6] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e5ebe6] rounded-[12px] [box-shadow:0_3px_8px_#263f2d02] min-w-0 [overflow-x:hidden] [overflow-y:hidden]" role="alert">
          <p>{state.error.message}</p>
          <button className="ad-button inline-flex justify-center items-center gap-[7px] [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7df] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7df] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7df] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7df] rounded-[7px] [padding:8px_12px] text-[#63786a] text-[10px] whitespace-nowrap leading-[1.6] [transition:background_0.2s,_box-shadow_0.2s] [&:hover]:[background:#f0f5ef] [&:hover]:[box-shadow:0_2px_5px_#244d3410] [&.ad-primary]:[background:#176b60] [&.ad-primary]:[border-top-color:#176b60] [&.ad-primary]:[border-right-color:#176b60] [&.ad-primary]:[border-bottom-color:#176b60] [&.ad-primary]:[border-left-color:#176b60] [&.ad-primary]:text-[#fff] [&.ad-primary:hover]:[background:#11594f] [&.ad-primary:hover]:text-[#fff] [&.ad-danger]:text-[#b25454] [&.ad-danger]:[border-top-color:#efd7d3] [&.ad-danger]:[border-right-color:#efd7d3] [&.ad-danger]:[border-bottom-color:#efd7d3] [&.ad-danger]:[border-left-color:#efd7d3] [&.ad-danger]:[background:#fff8f5] [&.ad-danger:hover]:[background:#f9e8e3]" onClick={refresh}>
            Try again
          </button>
        </section>
      )}
      {data && (
        <ServiceReviewDetails
          key={data.ServiceId}
          data={data}
          service={s}
          busy={busy}
          startReview={startReview}
          setDialog={setDialog}
          actionError={actionError}
        />
      )}
      {dialog && (
        <DecisionDialog
          {...dialog}
          close={() => setDialog(null)}
          saved={saved}
        />
      )}
    </div>
  );
}
