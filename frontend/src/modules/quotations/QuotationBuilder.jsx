import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  useQuotation,
  mutateQuote,
  quoteRequest,
  money,
} from "./quotation.api";
import { QuoteState, QuoteItems } from "./QuotationPages";
import "./quotations.css";
const blank = () => ({
  serviceId: "",
  packageId: null,
  serviceItemId: null,
  name: "",
  description: "",
  unit: "",
  kind: "Service",
  quantity: 1,
  price: 0,
  discountType: "Fixed",
  discountValue: 0,
  taxRate: 0,
  tax: 0,
});
export default function QuotationBuilder() {
  const { id } = useParams(),
    [params] = useSearchParams(),
    previousId = params.get("previous"),
    options = useQuotation("Vendor", "/quotation-options"),
    catalog = useQuotation("Vendor", "/catalog"),
    source = useQuotation(
      "Vendor",
      id || previousId ? `/quotations/${id || previousId}` : null,
    );
  const failed = options.error
    ? options
    : catalog.error
      ? catalog
      : source.error
        ? source
        : null;
  if (
    failed ||
    options.loading ||
    catalog.loading ||
    ((id || previousId) && source.loading)
  )
    return (
      <div className="quotation-workspace">
        <QuoteState state={failed || { loading: true }} />
      </div>
    );
  return (
    <QuotationEditor
      key={`${id || previousId || "new"}:${params.toString()}`}
      id={id}
      previousId={previousId}
      params={params}
      options={options}
      catalog={catalog}
      source={source}
    />
  );
}
function QuotationEditor({ id, previousId, params, options, catalog, source }) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const d = source.data,
    q = d?.quotation,
    request = options.data.requests?.find(
      (r) =>
        r.id === params.get("request") ||
        (previousId &&
          r.previousQuotationId?.toLowerCase() === previousId.toLowerCase()),
    );
  const localExpiry =
    id && q?.ValidUntil
      ? new Date(new Date(q.ValidUntil).getTime() + 330 * 60000).toISOString()
      : null;
  const [expiryTime, setExpiryTime] = useState(() =>
      localExpiry ? localExpiry.slice(11, 16) : "23:59",
    ),
    [preview, setPreview] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    { notify } = useAuth(),
    navigate = useNavigate(),
    [form, setForm] = useState(() => ({
      eventId: q?.EventId || params.get("event") || request?.eventId || "",
      idempotencyKey,
      requestId: request?.id || q?.RequestId || undefined,
      previousQuotationId: previousId || undefined,
      title: q?.Title || "Your event proposal",
      validUntil: localExpiry
        ? localExpiry.slice(0, 10)
        : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      message: q?.VendorMessage || "",
      terms: d?.terms?.text || "",
      cancellation: d?.terms?.cancellation || "",
      advancePercent: d?.terms?.advancePercent || 0,
      reason: "",
      items: d
        ? d.items.map((i) => ({
            serviceId: i.serviceId,
            packageId: i.packageId,
            serviceItemId: i.serviceItemId,
            name: i.name,
            description: i.description || "",
            unit: i.unit || "",
            kind: i.kind || "Service",
            quantity: Number(i.quantity),
            price: Number(i.price),
            discountType: i.discountType || "Fixed",
            discountValue: Number(i.discountValue ?? i.discount),
            taxRate: i.taxRate === null ? "" : Number(i.taxRate),
            tax: Number(i.tax),
          }))
        : [blank()],
      expectedUpdatedAt: id ? q.UpdatedAt : undefined,
    }));
  const change = (key, value) => {
      setForm((f) => ({ ...f, [key]: value }));
      setPreview(null);
    },
    lineChange = (index, patch) =>
      change(
        "items",
        form.items.map((i, n) => (n === index ? { ...i, ...patch } : i)),
      );
  const payload = (status) => ({
    ...form,
    validUntil: `${form.validUntil}T${expiryTime}:00+05:30`,
    status,
    advancePercent: Number(form.advancePercent),
    items: form.items.map((i) => ({
      ...i,
      quantity: Number(i.quantity),
      price: Number(i.price),
      discountValue: Number(i.discountValue),
      tax: Number(i.tax || 0),
      ...(i.taxRate === ""
        ? { taxRate: undefined }
        : { taxRate: Number(i.taxRate) }),
    })),
  });
  async function perform(action) {
    setBusy(true);
    setError("");
    try {
      if (action === "Preview") {
        const r = await mutateQuote(
          "Vendor",
          "/quotations/preview",
          payload("Sent"),
        );
        setPreview(r.preview);
      } else {
        const result = await quoteRequest(
          "Vendor",
          `/quotations${id ? `/${id}` : ""}`,
          {
            method: id ? "PUT" : "POST",
            body: JSON.stringify(payload(action)),
          },
        );
        notify(result.message);
        navigate(`/vendor/quotations/${result.id}`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="quotation-workspace">
      <h1>
        {id
          ? "Edit draft quotation"
          : previousId
            ? "Prepare a new revision"
            : "Create quotation"}
      </h1>
      <p>
        Sent versions remain immutable. Review server-calculated prices before
        sending.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          perform("Draft");
        }}
      >
        <section className="qt-panel qt-fields">
          <label>
            Customer event
            <select
              required
              value={form.eventId}
              disabled={!!id || !!previousId}
              onChange={(e) => change("eventId", e.target.value)}
            >
              <option value="">Choose a shared event</option>
              {options.data.events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.customer} · {String(e.eventDate).slice(0, 10)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Related request
            <select
              value={form.requestId || ""}
              onChange={(e) => change("requestId", e.target.value || undefined)}
            >
              <option value="">Shared booking / event</option>
              {options.data.requests
                ?.filter(
                  (r) => r.eventId.toLowerCase() === form.eventId.toLowerCase(),
                )
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Title
            <input
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => change("title", e.target.value)}
            />
          </label>
          <label>
            Valid until (India time)
            <input
              type="date"
              required
              value={form.validUntil}
              onChange={(e) => change("validUntil", e.target.value)}
            />
          </label>
          <label>
            Expiry time (India time)
            <input
              type="time"
              required
              value={expiryTime}
              onChange={(e) => {
                setExpiryTime(e.target.value);
                setPreview(null);
              }}
            />
          </label>
          <label>
            Advance percentage
            <input
              type="number"
              min={0}
              max={100}
              step=".01"
              value={form.advancePercent}
              onChange={(e) => change("advancePercent", e.target.value)}
            />
          </label>
          {previousId && (
            <label>
              Revision / counteroffer reason
              <textarea
                required
                minLength={3}
                maxLength={1000}
                value={form.reason}
                onChange={(e) => change("reason", e.target.value)}
              />
            </label>
          )}
        </section>
        <section className="qt-panel">
          <h2>Quotation items</h2>
          <p className="qt-note">
            Every item, including custom work and fees, is anchored to one of
            your services. Choose existing catalog items or describe authorized
            custom work.
          </p>
          <div className="qt-lines">
            {form.items.map((line, index) => (
              <article className="qt-line" key={index}>
                <h3>Item {index + 1}</h3>
                <div className="qt-line-fields">
                  <label>
                    Service
                    <select
                      required
                      value={line.serviceId}
                      onChange={(e) => {
                        const s = catalog.data.services.find(
                          (s) => s.id === e.target.value,
                        );
                        lineChange(index, {
                          serviceId: e.target.value,
                          packageId: null,
                          serviceItemId: null,
                          name: s?.name || "",
                          price: s?.price || 0,
                        });
                      }}
                    >
                      <option value="">Choose service</option>
                      {catalog.data.services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Package
                    <select
                      value={line.packageId || ""}
                      onChange={(e) => {
                        const p = options.data.packages.find(
                          (p) => p.id === e.target.value,
                        );
                        lineChange(index, {
                          packageId: p?.id || null,
                          name: p?.name || line.name,
                          price: p?.price || line.price,
                          kind: p ? "Package" : "Service",
                        });
                      }}
                    >
                      <option value="">No package</option>
                      {options.data.packages
                        .filter((p) => p.serviceId === line.serviceId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Service item
                    <select
                      value={line.serviceItemId || ""}
                      onChange={(e) => {
                        const i = options.data.items.find(
                          (i) => String(i.id) === e.target.value,
                        );
                        lineChange(index, {
                          serviceItemId: i?.id || null,
                          name: i?.name || line.name,
                          description: i?.description || "",
                          unit: i?.unit || "",
                          price: i?.price || line.price,
                          kind: i ? "ServiceItem" : "Service",
                        });
                      }}
                    >
                      <option value="">Custom selection</option>
                      {options.data.items
                        ?.filter((i) => i.serviceId === line.serviceId)
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Line type
                    <select
                      value={line.kind}
                      onChange={(e) =>
                        lineChange(index, { kind: e.target.value })
                      }
                    >
                      {[
                        "Service",
                        "Package",
                        "ServiceItem",
                        "Custom",
                        "Travel",
                        "Setup",
                        "Delivery",
                        "Other",
                      ].map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Item name
                    <input
                      value={line.name}
                      required
                      maxLength={200}
                      onChange={(e) =>
                        lineChange(index, { name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      maxLength={1000}
                      value={line.description}
                      onChange={(e) =>
                        lineChange(index, { description: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Quantity
                    <input
                      type="number"
                      required
                      min={0.001}
                      max={100000}
                      step=".001"
                      value={line.quantity}
                      onChange={(e) =>
                        lineChange(index, { quantity: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Unit
                    <input
                      maxLength={50}
                      value={line.unit}
                      onChange={(e) =>
                        lineChange(index, { unit: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Unit price
                    <input
                      type="number"
                      required
                      min={0}
                      max={1e8}
                      step=".01"
                      value={line.price}
                      onChange={(e) =>
                        lineChange(index, { price: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Discount type
                    <select
                      value={line.discountType}
                      onChange={(e) =>
                        lineChange(index, { discountType: e.target.value })
                      }
                    >
                      <option>Fixed</option>
                      <option>Percentage</option>
                    </select>
                  </label>
                  <label>
                    Discount value
                    <input
                      type="number"
                      min={0}
                      max={line.discountType === "Percentage" ? 100 : 1e8}
                      step=".01"
                      value={line.discountValue}
                      onChange={(e) =>
                        lineChange(index, { discountValue: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Tax rate (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step=".01"
                      value={line.taxRate}
                      onChange={(e) =>
                        lineChange(index, { taxRate: e.target.value })
                      }
                    />
                  </label>
                  {line.taxRate === "" && (
                    <label>
                      Legacy fixed tax amount
                      <input
                        type="number"
                        min={0}
                        step=".01"
                        value={line.tax}
                        onChange={(e) =>
                          lineChange(index, { tax: e.target.value })
                        }
                      />
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  disabled={form.items.length === 1 || busy}
                  onClick={() =>
                    change(
                      "items",
                      form.items.filter((_, n) => n !== index),
                    )
                  }
                >
                  <Trash2 size={16} />
                  Remove item
                </button>
              </article>
            ))}
          </div>
          <button
            type="button"
            disabled={busy || form.items.length >= 100}
            onClick={() => change("items", [...form.items, blank()])}
          >
            <Plus size={16} />
            Add item or fee
          </button>
        </section>
        <section className="qt-panel qt-fields">
          <label>
            Quotation notes
            <textarea
              maxLength={5000}
              value={form.message}
              onChange={(e) => change("message", e.target.value)}
            />
          </label>
          <label>
            Terms and conditions
            <textarea
              maxLength={10000}
              value={form.terms}
              onChange={(e) => change("terms", e.target.value)}
            />
          </label>
          <label>
            Cancellation terms
            <textarea
              maxLength={2000}
              value={form.cancellation}
              onChange={(e) => change("cancellation", e.target.value)}
            />
          </label>
        </section>
        {preview && (
          <section className="qt-panel" aria-label="Server quotation preview">
            <h2>Server-calculated preview</h2>
            <QuoteItems items={preview.lines} />
            <p>
              Subtotal (includes fee lines): {money(preview.subtotal)} · Fee
              lines: {money(preview.additionalCharges)}
            </p>
            <p>
              Discounts {money(preview.discount)} · Taxable{" "}
              {money(preview.subtotal - preview.discount)} · Taxes{" "}
              {money(preview.tax)}
            </p>
            <h2>Total {money(preview.total)}</h2>
            <p>
              Advance {money(preview.advance)} · Remaining after advance{" "}
              {money(preview.total - preview.advance)}
            </p>
          </section>
        )}
        {error && (
          <p role="alert" className="qt-error">
            {error}
          </p>
        )}
        <div className="qt-actions">
          <button disabled={busy}>Save draft</button>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              if (e.currentTarget.form.reportValidity()) perform("Preview");
            }}
          >
            Preview server prices
          </button>
          <button
            type="button"
            className="qt-primary"
            disabled={busy || !preview}
            onClick={() => perform("Sent")}
          >
            Send quotation to customer
          </button>
        </div>
      </form>
    </div>
  );
}
