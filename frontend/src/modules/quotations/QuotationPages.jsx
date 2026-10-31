import { useEffect, useRef, useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import {
  FileText,
  Clock3,
  MessageSquare,
  GitCompareArrows,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  useQuotation,
  mutateQuote,
  money,
  timestamp,
  workspace,
} from "./quotation.api";
import "./quotations.css";
export function QuoteState({ state }) {
  return state.loading ? (
    <div
      className="qt-skeleton"
      role="status"
      aria-label="Loading quotations"
    />
  ) : state.error ? (
    <section role="alert" className="qt-panel qt-error">
      <p>{state.error.message}</p>
      <button onClick={state.retry}>Try again</button>
    </section>
  ) : null;
}
function Dialog({ title, close, busy, children }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className="quotation-workspace qt-dialog"
      onCancel={(e) => (busy ? e.preventDefault() : close())}
    >
      <h2>{title}</h2>
      {children}
      <button disabled={busy} onClick={close}>
        Close
      </button>
    </dialog>
  );
}
export function QuotationOverview({ role = "Customer" }) {
  const stats = useQuotation(role, "/quotations/statistics");
  return (
    <section className="quotation-workspace" aria-label="Quotation overview">
      <h2>Quotation overview</h2>
      <QuoteState state={stats} />
      {stats.data && (
        <div className="qt-stats">
          {[
            ["Requests", stats.data.requests.total],
            ["Pending requests", stats.data.requests.pending],
            ["Received / sent quotations", stats.data.quotes.total],
            ["Awaiting response", stats.data.quotes.pending],
            ["Negotiations", stats.data.negotiations],
            ["Rejected", stats.data.quotes.rejected],
            ["Accepted", stats.data.quotes.accepted],
            ["Expired", stats.data.quotes.expired],
            ["Converted bookings", stats.data.converted],
            ["Quotation value", money(stats.data.quotes.value)],
          ].map(([label, value]) => (
            <div className="qt-stat" key={label}>
              <strong>{value || 0}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
      <Link to={`${workspace(role)}/quotations`}>Manage quotations</Link>
    </section>
  );
}
export function QuotationList({
  role = "Customer",
  requests = false,
  filter = "",
}) {
  const [params, setParams] = useSearchParams(),
    status = params.has("status") ? params.get("status") : filter,
    path = `/${requests ? "quotation-requests" : "quotations"}?${new URLSearchParams({ ...Object.fromEntries(params), ...(status ? { status } : {}) })}`,
    state = useQuotation(role, path);
  const base = workspace(role),
    requestsPath =
      role === "Vendor"
        ? "/vendor/requests"
        : role === "Admin"
          ? "/admin/quotation-requests"
          : `${base}/requests`;
  const change = (key, value) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (key === "status" || value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  return (
    <div className="quotation-workspace">
      <h1>{requests ? "Quotation requests" : "Your quotations"}</h1>
      <p>
        From the first idea to a clear agreement. Every sent version stays in
        your history.
      </p>
      <nav className="qt-actions">
        <Link className="qt-button" to={requestsPath}>
          Requests
        </Link>
        <Link
          className="qt-button"
          to={`${base}/quotations${role === "Vendor" ? "/sent" : ""}`}
        >
          Quotations
        </Link>
        {role === "Vendor" && (
          <Link className="qt-button qt-primary" to="/vendor/quotations/new">
            Create quotation
          </Link>
        )}
      </nav>
      <QuotationOverview role={role} />
      <form
        className="qt-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          change("q", new FormData(e.currentTarget).get("q"));
        }}
      >
        <label>
          Search
          <input
            key={params.get("q") || ""}
            name="q"
            maxLength={150}
            defaultValue={params.get("q") || ""}
            placeholder="Reference, customer, vendor or service"
          />
        </label>
        <button>Search</button>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => change("status", e.target.value)}
          >
            <option value="">All statuses</option>
            {(requests
              ? ["Pending", "Responded", "Closed"]
              : [
                  "Draft",
                  "Sent",
                  "Viewed",
                  "Negotiation",
                  "Accepted",
                  "Rejected",
                  "Expired",
                  "Cancelled",
                  "Converted",
                ]
            )
              .filter((s) => !(role === "Customer" && s === "Draft"))
              .map((s) => (
                <option key={s}>{s}</option>
              ))}
          </select>
        </label>
        <label>
          Event from
          <input
            type="date"
            value={params.get("from") || ""}
            onChange={(e) => change("from", e.target.value)}
          />
        </label>
        <label>
          Event to
          <input
            type="date"
            value={params.get("to") || ""}
            onChange={(e) => change("to", e.target.value)}
          />
        </label>
        <label>
          Order
          <select
            value={params.get("direction") || "newest"}
            onChange={(e) => change("direction", e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </label>
        <button type="button" onClick={() => setParams({ status: "" })}>
          Reset filters
        </button>
      </form>
      <QuoteState state={state} />
      {state.data &&
        (state.data.rows.length ? (
          <section className="qt-panel qt-table">
            <table>
              <thead>
                <tr>
                  {[
                    "Reference",
                    "Customer / vendor",
                    "Event",
                    "Date / place",
                    "Guests / budget",
                    requests ? "Service" : "Amount",
                    "Status",
                    "Action",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.data.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.number}
                      {row.revision && <p>Version {row.revision}</p>}
                    </td>
                    <td>{role === "Vendor" ? row.customer : row.vendor}</td>
                    <td>{row.event}</td>
                    <td>
                      {row.date}
                      <p>{row.city}</p>
                    </td>
                    <td>
                      {row.guests}
                      <p>{money(row.budget)}</p>
                    </td>
                    <td>{requests ? row.service : money(row.amount)}</td>
                    <td>
                      <span className="qt-badge">
                        {row.bookingId
                          ? "Converted"
                          : row.negotiating
                            ? "Negotiation requested"
                            : row.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="qt-button"
                        to={`${base}/${requests ? (role === "Admin" ? "quotation-requests" : "requests") : "quotations"}/${row.id}`}
                      >
                        View details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <section className="qt-panel">
            <FileText />
            <h2>No matching {requests ? "requests" : "quotations"} yet.</h2>
            <p>
              Try a different filter or discover a service to start an enquiry.
            </p>
            {role === "Customer" && (
              <Link to="/customer/discover">Discover services</Link>
            )}
          </section>
        ))}
      {state.data && (
        <div className="qt-pagination">
          <button
            disabled={state.data.page <= 1}
            onClick={() => change("page", state.data.page - 1)}
          >
            Previous
          </button>
          <span>Page {state.data.page}</span>
          <button
            disabled={state.data.page * state.data.pageSize >= state.data.total}
            onClick={() => change("page", state.data.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
function Timeline({ rows }) {
  return (
    <section className="qt-panel">
      <h2>Negotiation and history</h2>
      <ol className="qt-timeline">
        {rows.map((h, i) => (
          <li key={h.id || i}>
            <strong>{h.action}</strong> · {h.role} · {timestamp(h.createdAt)}
            <p>{h.message}</p>
            {h.visibility === "Internal" && (
              <span className="qt-badge">Internal administrator note</span>
            )}
          </li>
        ))}
      </ol>
      {!rows.length && <p>No history recorded yet.</p>}
    </section>
  );
}
export function RequestDetails({ role = "Customer" }) {
  const { id } = useParams(),
    [revision, setRevision] = useState(0),
    state = useQuotation(role, `/quotation-requests/${id}`, revision),
    [action, setAction] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    { notify } = useAuth(),
    navigate = useNavigate();
  if (state.loading || state.error)
    return (
      <div className="quotation-workspace">
        <QuoteState state={state} />
      </div>
    );
  const d = state.data,
    r = d.request,
    e = d.snapshot.event || {},
    base = workspace(role);
  async function chat() {
    setBusy(true);
    try {
      const body =
        role === "Vendor"
          ? { requestId: id }
          : { vendorId: r.VendorId, eventId: r.EventId, requestId: id };
      const result = await mutateQuote(role, "/conversations", body);
      navigate(`${base}/messages?conversation=${result.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="quotation-workspace">
      <Link
        to={
          role === "Vendor"
            ? "/vendor/requests"
            : role === "Admin"
              ? "/admin/quotation-requests"
              : `${base}/requests`
        }
      >
        ← Requests
      </Link>
      <h1>{r.RequestNumber || "Quotation request"}</h1>
      <p>
        {r.VendorName} - {r.CustomerName}
      </p>
      <span className="qt-badge">{r.Status}</span>
      <section className="qt-panel">
        <h2>Event requirements</h2>
        <p>
          {e.EventName} · {e.EventType} · {e.EventDate} {e.StartTime}–
          {e.EndTime}
        </p>
        <p>
          {e.City} {e.State} · {e.GuestCount} guests · Budget {money(e.Budget)}
        </p>
        <p>{r.Message}</p>
        {d.snapshot.services?.map((s) => (
          <p key={s.serviceId}>
            {s.name} {s.package ? ` · ${s.package}` : ""}
          </p>
        ))}
        {d.snapshot.items?.map((i, index) => (
          <p key={index}>
            {i.name} × {i.quantity}
          </p>
        ))}
        {r.DecisionReason && <p>Response: {r.DecisionReason}</p>}
        <div className="qt-actions">
          {role !== "Admin" && (
            <button disabled={busy} onClick={chat}>
              <MessageSquare size={16} />
              Message {role === "Vendor" ? "customer" : "vendor"}
            </button>
          )}
          {role === "Vendor" && r.Status === "Pending" && (
            <>
              <Link
                className="qt-button qt-primary"
                to={`/vendor/quotations/new?event=${r.EventId}&request=${id}`}
              >
                Create quotation
              </Link>
              <button onClick={() => setAction("Reject")}>
                Reject request
              </button>
              <button onClick={() => setAction("Information")}>
                Request information
              </button>
            </>
          )}
          {role === "Customer" && r.Status === "Pending" && (
            <button onClick={() => setAction("Cancel")}>Cancel request</button>
          )}
        </div>
      </section>
      <section className="qt-panel">
        <h2>Related quotations</h2>
        {d.quotations.map((q) => (
          <p key={q.id}>
            <Link to={`${base}/quotations/${q.id}`}>
              {q.number} · Version {q.revision}
            </Link>{" "}
            · {q.status}
          </p>
        ))}
        {!d.quotations.length && <p>No proposal has been sent yet.</p>}
      </section>
      <Timeline rows={d.history} />
      {error && (
        <p className="qt-error" role="alert">
          {error}
        </p>
      )}
      {action && (
        <Dialog
          title={`${action} request`}
          close={() => setAction(null)}
          busy={busy}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const result = await mutateQuote(
                  role,
                  `/quotation-requests/${id}/action`,
                  {
                    action,
                    reason: new FormData(e.currentTarget).get("reason"),
                  },
                );
                notify(result.message);
                setAction(null);
                setRevision((v) => v + 1);
              } catch (err) {
                setError(err.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {error && (
              <p role="alert" className="qt-error">
                {error}
              </p>
            )}
            <label>
              Reason shared with the other party
              <textarea name="reason" minLength={3} maxLength={1000} required />
            </label>
            <button className="qt-primary" disabled={busy}>
              Confirm
            </button>
            {error && <p role="alert">{error}</p>}
          </form>
        </Dialog>
      )}
    </div>
  );
}
export function QuoteItems({ items }) {
  return (
    <div className="qt-table">
      <table>
        <thead>
          <tr>
            {[
              "Item / description",
              "Quantity / unit",
              "Unit price",
              "Discount",
              "Tax",
              "Line total",
            ].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((i, k) => (
            <tr key={i.id || k}>
              <td>
                <strong>{i.name}</strong>
                <p>{i.description}</p>
                <span className="qt-note">{i.kind}</span>
              </td>
              <td>
                {Number(i.quantity)} {i.unit}
              </td>
              <td>{money(i.price)}</td>
              <td>{money(i.discount)}</td>
              <td>{money(i.tax)}</td>
              <td>{money(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Expiry({ until, serverTime }) {
  const [start] = useState(() => ({
      at: Date.now(),
      remaining: Math.max(0, new Date(until) - new Date(serverTime)),
    })),
    [remaining, setRemaining] = useState(start.remaining);
  useEffect(() => {
    const timer = setInterval(
      () =>
        setRemaining(Math.max(0, start.remaining - (Date.now() - start.at))),
      1000,
    );
    return () => clearInterval(timer);
  }, [start]);
  return (
    <p className="qt-note">
      <Clock3 size={14} /> Valid until {timestamp(until)} ·{" "}
      {remaining > 0
        ? `${Math.floor(remaining / 3600000)}h ${Math.floor(remaining / 60000) % 60}m ${Math.floor(remaining / 1000) % 60}s remaining`
        : "Validity period ended. Refresh to load the current status."}{" "}
      Server validation controls all decisions.
    </p>
  );
}
export function QuotationDetails({ role = "Customer" }) {
  const { id } = useParams(),
    [revision, setRevision] = useState(0),
    state = useQuotation(role, `/quotations/${id}`, revision),
    [comparison, setComparison] = useState(""),
    previous = useQuotation(
      role,
      comparison ? `/quotations/${comparison}` : null,
    ),
    [action, setAction] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    { notify } = useAuth(),
    navigate = useNavigate();
  if (state.loading || state.error)
    return (
      <div className="quotation-workspace">
        <QuoteState state={state} />
      </div>
    );
  const d = state.data,
    q = d.quotation,
    base = workspace(role),
    e = d.event;
  async function execute(body) {
    setBusy(true);
    setError("");
    try {
      const result =
        action === "Convert"
          ? await mutateQuote(role, `/quotations/${id}/convert`, {})
          : role === "Vendor"
            ? await mutateQuote(role, `/quotations/${id}/action`, {
                action: body.action,
                expectedUpdatedAt: new Date(q.UpdatedAt).toISOString(),
              })
            : await mutateQuote(role, `/quotations/${id}/decision`, {
                ...body,
                convert: false,
              });
      notify(result.message);
      setAction(null);
      if (action === "Convert" && result.id)
        navigate(`${base}/bookings/${result.id}`);
      else setRevision((v) => v + 1);
    } catch (err) {
      setError(err.message);
      setAction(null);
      setRevision((v) => v + 1);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="quotation-workspace">
      <Link to={`${base}/quotations${role === "Vendor" ? "/sent" : ""}`}>
        ← Quotations
      </Link>
      <h1>{q.Title || "Event quotation"}</h1>
      <p>
        {q.VendorName} - {q.CustomerName}
      </p>
      <p>
        {q.QuotationNumber} · Version {q.RevisionNumber}
      </p>
      <span className="qt-badge">
        {d.booking
          ? "Converted"
          : q.Negotiating
            ? "Negotiation requested"
            : !q.IsCurrent
              ? "Superseded"
              : q.IsExpired && ["Sent", "Viewed", "Accepted"].includes(q.Status)
                ? "Expired"
                : q.Status}
      </span>
      <Expiry
        key={`${q.QuotationId}:${q.ValidUntil}`}
        until={q.ValidUntil}
        serverTime={d.serverTime}
      />
      <div className="qt-actions">
        <button onClick={() => setRevision((v) => v + 1)}>
          Refresh status
        </button>
        <button onClick={() => window.print()}>Print quotation</button>
        {role !== "Admin" && (
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const body =
                  role === "Vendor"
                    ? { quotationId: id }
                    : { vendorId: q.VendorId, eventId: q.EventId, quotationId: id };
                const r = await mutateQuote(role, "/conversations", body);
                navigate(`${base}/messages?conversation=${r.id}`);
              } catch (err) {
                setError(err.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Message {role === "Vendor" ? "customer" : "vendor"}
          </button>
        )}
        {role === "Vendor" && q.Status === "Draft" && (
          <>
            <Link className="qt-button" to={`/vendor/quotations/${id}/edit`}>
              Edit draft
            </Link>
            <button onClick={() => setAction("Send")}>Send quotation</button>
            <button onClick={() => setAction("Cancel")}>Cancel draft</button>
          </>
        )}
        {role === "Vendor" &&
          q.IsCurrent &&
          q.Status !== "Draft" &&
          !d.booking &&
          q.Status !== "Accepted" && (
            <Link
              className="qt-button"
              to={`/vendor/quotations/new?event=${q.EventId}&previous=${id}`}
            >
              Create revision / counteroffer
            </Link>
          )}
      </div>
      <section className="qt-panel">
        <h2>Agreed event details</h2>
        <p>
          {e.EventName} · {e.EventType} · {e.EventDate} {e.StartTime}–
          {e.EndTime}
        </p>
        <p>
          {e.City} {e.State} · {e.GuestCount} guests
        </p>
        {role === "Customer" && (
          <p>
            <Link to={`/customer/vendors/${q.VendorId}`}>Vendor profile</Link>
          </p>
        )}
        <QuoteItems items={d.items} />
        <h2>{money(q.TotalAmount)}</h2>
        <p>
          Subtotal (including fee lines): {money(q.SubTotal)} · Discount{" "}
          {money(q.DiscountAmount)} · Tax {money(q.TaxAmount)}
        </p>
        <p>
          Advance: {money(q.AdvanceAmount)} · Balance after advance:{" "}
          {money(Number(q.TotalAmount) - Number(q.AdvanceAmount))}
        </p>
        <h3>Terms and cancellation</h3>
        <p>{d.terms.text || q.VendorMessage}</p>
        <p>
          {d.terms.cancellation ||
            "Review the service cancellation terms before accepting."}
        </p>
        {d.terms.bookingPolicy?.terms?.map((t, i) => (
          <p key={i}>
            {t.service}: {t.cancellation} {t.refund}
          </p>
        ))}
        {q.CustomerMessage && <p>Customer response: {q.CustomerMessage}</p>}
        {role === "Customer" && (
          <>
            <p className="qt-note">{d.actions.reason}</p>
            <div className="qt-actions">
              {d.actions.accept && (
                <button
                  className="qt-primary"
                  onClick={() => setAction("Accept")}
                >
                  Review and accept
                </button>
              )}
              {d.actions.reject && (
                <button onClick={() => setAction("Reject")}>Reject</button>
              )}
              {d.actions.modify && (
                <button onClick={() => setAction("Modify")}>
                  Request modification
                </button>
              )}
              {d.actions.convert && (
                <button
                  className="qt-primary"
                  onClick={() => setAction("Convert")}
                >
                  Convert accepted quotation to booking
                </button>
              )}
            </div>
          </>
        )}
        {d.booking && (
          <Link
            className="qt-button qt-primary"
            to={`${base}/bookings/${d.booking.id}`}
          >
            Booking {d.booking.number} · {d.booking.status} · Payment{" "}
            {d.booking.paymentStatus}
          </Link>
        )}
      </section>
      <section className="qt-panel">
        <h2>
          <GitCompareArrows size={20} /> Revision comparison
        </h2>
        <div className="qt-actions">
          {d.versions.map((v) => (
            <Link
              className="qt-button"
              key={v.id}
              to={`${base}/quotations/${v.id}`}
            >
              V{v.revision}: {money(v.total)} · {v.status}
            </Link>
          ))}
        </div>
        <label>
          Compare with version
          <select
            value={comparison}
            onChange={(e) => setComparison(e.target.value)}
          >
            <option value="">Choose a previous version</option>
            {d.versions
              .filter((v) => v.id.toLowerCase() !== id.toLowerCase())
              .map((v) => (
                <option key={v.id} value={v.id}>
                  Version {v.revision} · {money(v.total)}
                </option>
              ))}
          </select>
        </label>
        <QuoteState state={previous} />
        {previous.data && (
          <>
            <h3>
              Previous items and agreed price:{" "}
              {money(previous.data.quotation.TotalAmount)}
            </h3>
            <QuoteItems items={previous.data.items} />
            <p>Previous terms: {previous.data.terms.text}</p>
            <p>Current terms: {d.terms.text}</p>
            <p>
              Difference:{" "}
              {money(
                Number(q.TotalAmount) -
                  Number(previous.data.quotation.TotalAmount),
              )}
              . No automatic charge or refund is authorized by this comparison.
            </p>
          </>
        )}
      </section>
      <Timeline rows={d.history} />
      {role === "Admin" && (
        <section className="qt-panel">
          <h2>Internal administrative note</h2>
          <p>
            Prices and sent versions cannot be edited through administration.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const r = await mutateQuote(role, `/quotations/${id}/notes`, {
                  message: new FormData(e.currentTarget).get("message"),
                });
                notify(r.message);
                setRevision((v) => v + 1);
              } catch (err) {
                setError(err.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Private note
              <textarea
                name="message"
                minLength={3}
                maxLength={2000}
                required
              />
            </label>
            <button disabled={busy}>Add internal note</button>
          </form>
        </section>
      )}
      {error && (
        <p role="alert" className="qt-error">
          {error}
        </p>
      )}
      {action && (
        <Dialog
          title={`${action} quotation`}
          close={() => setAction(null)}
          busy={busy}
        >
          <p>
            {q.QuotationNumber} · Version {q.RevisionNumber} ·{" "}
            {money(q.TotalAmount)}
          </p>
          <p>
            {e.EventDate} · {e.City} · {e.GuestCount} guests · Advance{" "}
            {money(q.AdvanceAmount)}
          </p>
          <p>{d.terms.text}</p>
          <p>{d.terms.cancellation}</p>
          <p>Expiry: {timestamp(q.ValidUntil)}</p>
          {action === "Convert" && (
            <p>
              Availability is checked again. The agreed quotation stays accepted
              if conversion fails; no payment is automatically charged.
            </p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              execute({ action, message: values.get("message") || "" });
            }}
          >
            {["Modify", "Reject"].includes(action) && (
              <label>
                {action === "Modify"
                  ? "Describe item, date, budget or term changes"
                  : "Rejection reason (optional)"}
                <textarea
                  name="message"
                  minLength={action === "Modify" ? 5 : 0}
                  maxLength={2000}
                  required={action === "Modify"}
                />
              </label>
            )}
            <label className="qt-check">
              <input type="checkbox" required />I have reviewed the items,
              total, event details, expiry and terms and confirm this action.
            </label>
            <button disabled={busy} className="qt-primary">
              Confirm {action.toLowerCase()}
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
