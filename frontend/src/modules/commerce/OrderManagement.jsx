import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowRight, LoaderCircle, LockKeyhole, SlidersHorizontal } from "lucide-react";
import { adminRequest, saveBlob } from "../admin/api";
import { vendorRequest } from "../vendor/services/workspace.api";
import { useAuth } from "../../context/AuthContext";
import { OrderStatusBadge } from "./OrderTracking";
import { orderStatusLabels, orderStatusOptions } from "./order-status";
import { useOrderUpdates } from "./order-live";
import OrdersListView from "./OrdersListView";
import ManagedOrderDetailsView from "./ManagedOrderDetailsView";

const input = "h-10! w-full! min-w-0 rounded-lg! border! border-[#dce5dd]! bg-white! px-3! py-2! text-[12px]! font-normal! text-[#415e4e]!";
const button = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dce5dd] bg-white px-3 py-2 text-[12px] font-medium text-[#526e5d] hover:bg-[#f2f7f2] disabled:cursor-not-allowed disabled:opacity-45";
async function request(role, path, options) {
  const value = role === "Admin" ? await adminRequest(path, options) : await vendorRequest(path, options);
  return value?.data ?? value;
}
function useOrdersData(role, path) {
  const [state, setState] = useState({ loading: true });
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(value => value + 1), []);
  const key = `${role}:${path}`;
  useEffect(() => {
    const abort = new AbortController();
    request(role, path, { signal: abort.signal, cache: "no-store" }).then(data => {
      if (!abort.signal.aborted) setState({ key, data, loading: false });
    }).catch(error => { if (!abort.signal.aborted) setState(previous => ({ ...(previous.key === key ? previous : {}), key, error, loading: false })); });
    return () => abort.abort();
  }, [role, path, key, version]);
  return { ...(state.key === key ? state : { loading: true }), refresh };
}
function ErrorState({ error, retry }) {
  return <div role="alert" className="my-4 rounded-lg border border-[#efcccc] bg-[#fff6f4] p-4 text-sm text-[#a65353]">{error.message}<button type="button" onClick={retry} className="ml-3 underline">Try again</button></div>;
}
function Field({ label, children }) { return <label className="grid min-w-0 gap-1.5 text-[11px] font-medium text-[#788e7e]">{label}{children}</label>; }

export default function OrderManagement({ role }) {
  const [filters, setFilters] = useState({ q: "", status: "", paymentStatus: "", vendor: "", from: "", to: "", page: 1 });
  const [search, setSearch] = useState("");
  useEffect(() => { const timer = setTimeout(() => setFilters(old => ({ ...old, q: search, page: 1 })), 300); return () => clearTimeout(timer); }, [search]);
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "").map(([key, value]) => [key, String(value)]));
  const state = useOrdersData(role, `/orders?${params}`);
  useOrderUpdates(state.refresh);
  const data = state.data;
  const update = (key, value) => setFilters(old => ({ ...old, [key]: value, page: 1 }));
  const reset = () => { setSearch(""); setFilters({ q: "", status: "", paymentStatus: "", vendor: "", from: "", to: "", page: 1 }); };
  return <OrdersListView role={role} data={data} loading={state.loading} error={state.error} filters={filters} search={search} onSearch={setSearch} onFilter={update} onReset={reset} onPage={page => setFilters(old => ({ ...old, page }))} onRefresh={state.refresh} />;
}

function StatusForm({ data, role, onSaved }) {
  const { notify } = useAuth();
  const [vendorId, setVendorId] = useState("");
  const [override, setOverride] = useState(false);
  const [target, setTarget] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = data.fulfillments.filter(group => !vendorId || group.vendorId === vendorId);
  const choices = orderStatusOptions(selected.map(group => group.status), data.paymentStatus === "Paid", role === "Admin" && override);
  const recommended = choices.find(status => status !== "Cancelled" && selected.some(group => group.status !== status));
  const next = choices.includes(target) ? target : override ? "" : recommended || choices[0] || "";
  const unchanged = selected.every(group => group.status === next);
  const closed = selected.length > 0 && selected.every(group => ["Delivered", "Cancelled"].includes(group.status));
  const current = [...new Set(selected.map(group => group.status))];
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await request(role, `/orders/${data.id}/status`, { method: "PATCH", body: JSON.stringify({ status: next, expectedVersion: data.version, note, ...(role === "Admin" ? { override, ...(vendorId ? { vendorId } : {}) } : {}) }) });
      notify(result.message); onSaved();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="overflow-hidden rounded-xl border border-[#d9e6d8] bg-white shadow-[0_3px_12px_#2d493503]"><header className="flex items-center gap-2.5 border-b border-[#e4eddf] bg-[#f6f9f2] px-5 py-3.5"><span className="grid size-7 place-items-center rounded-lg bg-[#eaf2e2] text-[#89a573]"><SlidersHorizontal size={14} aria-hidden="true" /></span><h2 className="m-0! font-sans! text-[13px]! font-semibold! text-[#4a684c]!">Update order status</h2></header><form className="grid gap-4 p-5" onSubmit={submit}>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e9eee2] bg-[#fafcf6] px-3 py-2.5"><span className="text-[10px] text-[#91a080]">Current status</span>{current.length === 1 ? <OrderStatusBadge status={current[0]} /> : <span className="text-[10px] text-[#799265]">Multiple fulfillment stages</span>}</div>
    {role === "Admin" && data.fulfillments.length > 1 && <Field label="Fulfillment to update"><select className={input} value={vendorId} onChange={event => setVendorId(event.target.value)}><option value="">All vendors in this order</option>{data.fulfillments.map(group => <option key={group.vendorId} value={group.vendorId}>{group.vendor} — {orderStatusLabels[group.status]}</option>)}</select></Field>}
    <Field label="Next status"><select aria-label="Next order status" className={input} value={next} onChange={event => setTarget(event.target.value)} disabled={busy || !choices.length}>{!next && <option value="">Select a status</option>}{choices.map(status => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}</select></Field>
    {next && !unchanged && <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#f1f7eb] px-3 py-2 text-[10px] text-[#7f9a69]"><span>{current.map(status => orderStatusLabels[status]).join(", ")}</span><ArrowRight size={12} aria-hidden="true" /><strong className="font-medium text-[#5a8043]">{orderStatusLabels[next]}</strong></div>}
    <Field label={override ? "Override reason (required)" : "Status note"}><textarea aria-label="Order status note" className={`${input} h-20! resize-y`} value={note} onChange={event => setNote(event.target.value)} maxLength={1000} required={override} minLength={override ? 3 : undefined} placeholder="Add delivery information or a reason for this change" /></Field>
    {role === "Admin" && <label className="flex items-start gap-2 text-[11px] text-[#7a8e7e]"><input className="mt-0.5 w-auto! accent-[#176b60]" type="checkbox" checked={override} onChange={event => setOverride(event.target.checked)} />Explicitly override the normal workflow, including delivered or cancelled orders</label>}
    {next === "Cancelled" && data.paymentStatus === "Paid" && <p className="text-[11px]! text-[#937348]!">Cancellation records fulfillment only. Any refund must follow the existing payment/refund process.</p>}
    {error && <p role="alert" className="text-[12px]! text-[#a65353]!">{error}</p>}
    <button type="submit" className={`${button} w-full border-[#376f43]! bg-[#376f43]! font-medium! text-white! hover:bg-[#2c5e36]! disabled:opacity-45`} disabled={busy || unchanged || !next}>{busy ? <><LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Saving…</> : next && !unchanged ? <>Update to {orderStatusLabels[next]}<ArrowRight size={13} aria-hidden="true" /></> : "Save status"}</button>
    {closed && !override ? <p className="m-0! flex items-start gap-2 text-[10px]! leading-relaxed! text-[#91a080]!"><LockKeyhole size={12} className="mt-0.5 shrink-0" aria-hidden="true" /><span>This fulfillment is closed.{role === "Admin" ? " Enable the explicit override to change it." : " An administrator must authorize further changes."}</span></p> : <p className="m-0! text-[10px]! leading-relaxed! text-[#96a48c]!">{data.paymentStatus !== "Paid" ? "Payment is required before preparing or dispatching this order." : "Saving updates the customer’s order tracking automatically."}</p>}
  </form></section>;
}

export function ManagedOrderDetails({ role }) {
  const { id } = useParams();
  const state = useOrdersData(role, `/orders/${id}`);
  const [invoice, setInvoice] = useState({ busy: false, error: "", preview: null });
  const invoiceRequest = useRef(null);
  useEffect(() => {
    setInvoice({ busy: false, error: "", preview: null });
    return () => { invoiceRequest.current?.abort(); invoiceRequest.current = null; };
  }, [id, role]);
  useEffect(() => {
    const url = invoice.preview?.url;
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [invoice.preview?.url]);
  useOrderUpdates(state.refresh, id);
  const data = state.data;
  async function loadInvoice(action) {
    invoiceRequest.current?.abort();
    const abort = new AbortController();
    invoiceRequest.current = abort;
    setInvoice(previous => ({ ...previous, busy: action, error: "" }));
    try {
      const file = await request(role, `/orders/${id}/invoice`, { download: true, includeFilename: true, signal: abort.signal });
      if (abort.signal.aborted) return;
      if (file.blob.type !== "application/pdf") throw new Error("The invoice could not be opened as a PDF. Please try again.");
      if (action === "view") {
        const url = URL.createObjectURL(file.blob);
        setInvoice({ busy: false, error: "", preview: { url, name: file.name } });
      } else {
        saveBlob(file.blob, file.name);
        setInvoice(previous => ({ ...previous, busy: false, error: "" }));
      }
      state.refresh();
    } catch (error) {
      if (!abort.signal.aborted) setInvoice(previous => ({ ...previous, busy: false, error: error.message || "Unable to load your invoice. Please try again." }));
    } finally { if (invoiceRequest.current === abort) invoiceRequest.current = null; }
  }
  function closeInvoice() {
    if (invoice.busy === "view") { invoiceRequest.current?.abort(); invoiceRequest.current = null; }
    setInvoice(previous => ({ ...previous, preview: null, busy: previous.busy === "view" ? false : previous.busy }));
  }
  if (!data) return state.error ? <ErrorState error={state.error} retry={state.refresh} /> : <div role="status" className="p-10 text-center text-sm text-[#839086]">Loading order details…</div>;
  return <ManagedOrderDetailsView role={role} data={data} error={state.error} onRefresh={state.refresh}
    invoiceBusy={Boolean(invoice.busy)} invoiceViewBusy={invoice.busy === "view"} invoiceError={invoice.error}
    invoicePreview={invoice.preview} onViewInvoice={() => loadInvoice("view")} onCloseInvoice={closeInvoice}
    onDownloadInvoice={() => loadInvoice("download")}
    statusControl={<StatusForm key={`${data.id}-${data.version}`} data={data} role={role} onSaved={state.refresh} />} />;
}
