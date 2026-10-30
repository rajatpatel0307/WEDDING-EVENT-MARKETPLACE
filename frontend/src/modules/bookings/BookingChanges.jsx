import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, Ban } from "lucide-react";

const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(value || 0),
  );
const date = (value) => (value ? String(value).slice(0, 10) : "All day");
function ChangeDialog({ children, busy, close }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      aria-label="Request a booking change"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else close();
      }}
      className="m-auto max-h-[90vh] w-[min(95vw,36rem)] overflow-y-auto rounded-2xl border-0 bg-white p-5 text-stone-800 shadow-xl backdrop:bg-black/40"
    >
      {children}
    </dialog>,
    document.body,
  );
}
export default function BookingChanges({
  id,
  data,
  role = "Customer",
  request,
  saved,
}) {
  const [kind, setKind] = useState(""),
    [today] = useState(()=>new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"})),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const decision = values.request;
      const result = await request(
        `/bookings/${id}/change-requests${decision ? `/${decision}/decision` : ""}`,
        {
          method: "POST",
          body: JSON.stringify(
            decision
              ? { action: values.action, reason: values.reason }
              : {
                  kind,
                  reason: values.reason,
                  ...(kind === "Reschedule"
                    ? {
                        date: values.date,
                        start: values.start || null,
                        end: values.end || null,
                      }
                    : {}),
                },
          ),
        },
      );
      setKind("");
      saved(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="my-6 rounded-2xl border border-stone-200 bg-white p-5 text-stone-800"
      aria-label="Booking changes"
    >
      <h2 className="text-xl font-semibold">Manage this booking</h2>
      {(data.policy || []).map((p, i) => (
        <div key={i} className="my-3 text-sm">
          <strong>{p.service}</strong>
          <p>Cancellation: {p.cancellation || "Terms require review."}</p>
          <p>Refund: {p.refund || "Subject to financial review."}</p>
        </div>
      ))}
      {role !== "Admin" && (
        <>
          <p className="my-3 text-sm">{data.actions?.reason}</p>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-lg border px-4 py-2 disabled:opacity-40"
              disabled={busy || !data.actions?.cancel}
              onClick={() => setKind("Cancellation")}
            >
              <Ban className="mr-2 inline" size={16} />
              Request cancellation
            </button>
            {role === "Customer" && (
              <button
                className="rounded-lg border px-4 py-2 disabled:opacity-40"
                disabled={busy || !data.actions?.reschedule}
                onClick={() => setKind("Reschedule")}
              >
                <CalendarClock className="mr-2 inline" size={16} />
                Request reschedule
              </button>
            )}
          </div>
        </>
      )}
      {kind && (
        <ChangeDialog busy={busy} close={() => setKind("")}>
          <form
            onSubmit={submit}
            className="my-4 grid gap-3 rounded-xl bg-stone-50 p-4"
          >
            <h3 className="font-semibold">{kind} request</h3>
            {kind === "Cancellation" && (
              <p className="text-sm">
                Potential refund: {money(data.refundEstimate)}.{" "}
                {data.refundNote}{" "}
                {role === "Vendor" &&
                  "An administrator must review your request."}
              </p>
            )}
            {kind === "Reschedule" && (
              <>
                <label>
                  New event date
                  <input
                    className="mt-1 block w-full rounded border p-2"
                    type="date"
                    name="date"
                    min={today}
                    required
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <label>
                    Start time
                    <input
                      className="block rounded border p-2"
                      type="time"
                      name="start"
                    />
                  </label>
                  <label>
                    End time
                    <input
                      className="block rounded border p-2"
                      type="time"
                      name="end"
                    />
                  </label>
                </div>
                <p className="text-sm">
                  Your original reservation stays in place until approval. Price
                  changes require a revised quotation.
                </p>
              </>
            )}
            <label>
              Reason
              <textarea
                className="mt-1 block w-full rounded border p-2"
                name="reason"
                minLength={3}
                maxLength={1000}
                required
              />
            </label>
            <div className="flex gap-3">
              <button
                className="rounded-lg bg-stone-900 px-4 py-2 text-white"
                disabled={busy}
              >
                {busy ? "Submitting…" : "Submit request"}
              </button>
              <button type="button" disabled={busy} onClick={() => setKind("")}>
                Close
              </button>
            </div>
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
          </form>
        </ChangeDialog>
      )}
      <div className="my-4 grid gap-3">
        {(data.requests || []).length === 0 && (
          <p className="text-sm text-stone-500">No change requests.</p>
        )}
        {(data.requests || []).map((r) => (
          <article className="rounded-lg border p-3" key={r.id}>
            <strong>
              {r.kind} · {r.status}
            </strong>
            <p className="text-sm">{r.reason}</p>
            {r.kind === "Reschedule" && (
              <p className="text-sm">
                {date(r.originalDate)} → {date(r.date)}{" "}
                {r.start ? String(r.start).slice(0, 5) : ""}
              </p>
            )}
            {r.decisionReason && (
              <p className="text-sm">Decision: {r.decisionReason}</p>
            )}
            {role === "Vendor" && r.status === "Pending" && r.canDecide === false && <p className="text-sm">Awaiting administrator review.</p>}
            {role !== "Customer" &&
              r.status === "Pending" &&
              r.canDecide !== false && (
                <form onSubmit={submit} className="mt-3 grid gap-2">
                  <input type="hidden" name="request" value={r.id} />
                  <label>
                    Decision
                    <select name="action" className="ml-2 rounded border p-2">
                      <option value="Approve">Approve</option>
                      <option value="Reject">Reject</option>
                    </select>
                  </label>
                  <label>
                    Reason shared with customer
                    <textarea
                      name="reason"
                      className="block w-full rounded border p-2"
                      minLength={3}
                      maxLength={1000}
                      required
                    />
                  </label>
                  <button
                    disabled={busy}
                    className="justify-self-start rounded-lg border px-4 py-2"
                  >
                    {busy ? "Saving…" : "Save decision"}
                  </button>
                </form>
              )}
          </article>
        ))}
      </div>
      {(data.refunds || []).map((r) => (
        <p key={r.id} className="text-sm">
          Refund {money(r.amount)} · {r.status}
        </p>
      ))}
      {error && (
        <p role="alert" className="my-3 text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
