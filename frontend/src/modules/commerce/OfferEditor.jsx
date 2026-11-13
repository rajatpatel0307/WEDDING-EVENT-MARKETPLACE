import { ShoppingBag, CalendarDays, Layers } from "lucide-react";
import { useId } from "react";
import RequiredMark from "../../components/ui/RequiredMark";
import { bookingAdvanceError } from "./offer-validation.js";
import "./commerce.css";
export const offerLabel = (type) =>
  ({ Sell: "Sell Only", Book: "Book Only", Both: "Sell & Book Both" })[type] ||
  "Booking";
export const blankSell = () => ({
  price: 1,
  stock: 0,
  minimum: 1,
  maximum: null,
  sku: "",
  available: true,
  shippingRequired: true,
  weight: 0,
  shippingAmount: 0,
});
export const blankBook = () => ({
  price: 1,
  capacity: 1,
  minimum: 1,
  maximum: 1,
  mode: "Scheduled",
  duration: "Daily",
  durationMinutes: 1440,
  startDate: null,
  endDate: null,
  slots: [],
  advance: 0,
  cancellation: "",
  refund: "",
  instructions: "",
  available: true,
});
export function OfferSelection({ value, category, onChange }) {
  if (!category) return null;
  const options = [
    ...(category.sellEnabled ? ["Sell"] : []),
    ...(category.bookEnabled ? ["Book"] : []),
    ...(category.sellEnabled && category.bookEnabled ? ["Both"] : []),
  ];
  function select(type) {
    onChange({
      type,
      ...(type !== "Book" ? { sell: value?.sell || blankSell() } : {}),
      ...(type !== "Sell" ? { book: value?.book || blankBook() } : {}),
    });
  }
  return (
    <section className="commerce">
      <h3>How would you like to offer this product/service?</h3>
      <p>Available options are set by the category administrator.</p>
      <div
        className="offer-cards"
        role="group"
        aria-label="Product service options"
      >
        {options.map((type) => {
          const Icon = { Sell: ShoppingBag, Book: CalendarDays, Both: Layers }[
            type
          ];
          return (
            <button
              type="button"
              key={type}
              aria-pressed={value?.type === type}
              onClick={() => select(type)}
            >
              <Icon size={23} />
              <strong>{offerLabel(type)}</strong>
              <span>
                {type === "Sell"
                  ? "Online purchases with selling stock"
                  : type === "Book"
                    ? "Reservations with independent availability"
                    : "Offer both experiences independently"}
              </span>
            </button>
          );
        })}
      </div>
      {!options.length && (
        <p role="alert">
          Sell and Book are disabled for this category. Choose another category.
        </p>
      )}
      {!value && options.length > 0 && (
        <p>
          Existing booking settings are retained until you select an option.
        </p>
      )}
      {value && !options.includes(value.type) && (
        <p role="alert">
          The administrator changed this category. Select an allowed option
          before saving.
        </p>
      )}
    </section>
  );
}
export function OfferConfiguration({ value, onChange, taxRate, onTaxChange }) {
  const advanceHintId = useId();
  if (!value) return null;
  const advanceError = bookingAdvanceError(value.book);
  const set = (kind, key, v) =>
    onChange({ ...value, [kind]: { ...value[kind], [key]: v } });
  const field = (kind, key, label, type = "number", optional = false) => (
    <label key={`${kind}-${key}`}>
      <span>{label}{!optional && <RequiredMark />}</span>
      <input
        type={type}
        value={value[kind][key] ?? ""}
        required={!optional}
        step={
          type === "number"
            ? ["price", "advance", "shippingAmount", "weight"].includes(key)
              ? "0.01"
              : 1
            : undefined
        }
        min={
          type === "number"
            ? [
                "price",
                "minimum",
                "maximum",
                "capacity",
                "durationMinutes",
              ].includes(key)
              ? 1
              : 0
            : undefined
        }
        max={type === "number"
          ? kind === "book" && key === "advance" && Number.isFinite(value.book.price)
            ? value.book.price
            : 10000000
          : undefined}
        aria-invalid={kind === "book" && key === "advance" && advanceError ? true : undefined}
        aria-describedby={kind === "book" && key === "advance" ? advanceHintId : undefined}
        maxLength={type === "text" ? 100 : undefined}
        onChange={(e) =>
          set(
            kind,
            key,
            type === "number"
              ? e.target.value === "" && optional
                ? null
                : Number(e.target.value)
              : e.target.value || null,
          )
        }
      />
      {kind === "book" && key === "advance" && (
        <small
          id={advanceHintId}
          className={advanceError ? "text-[#b34242]" : "text-[#617366]"}
          role={advanceError ? "alert" : undefined}
        >
          {advanceError || "Enter an INR amount from 0 to the booking price per unit. Use 0 if no advance is needed."}
        </small>
      )}
    </label>
  );
  return (
    <div className="commerce">
      {value.sell && (
        <section className="commerce-panel">
          <h3>Sell Configuration</h3>
          <div className="commerce-grid">
            {field("sell", "price", "Selling Price (INR)")}
            {field("sell", "stock", "Available Selling Quantity / Stock")}
            {field("sell", "minimum", "Minimum Order Quantity")}
            {field(
              "sell",
              "maximum",
              "Maximum Order Quantity (optional)",
              "number",
              true,
            )}
            <label>
              Product SKU / Product Code
              <input
                type="text"
                value={value.sell.sku || ""}
                readOnly
                placeholder="Generated automatically when you save"
              />
              <small>
                Automatically assigned using the product name, location and
                vendor.
              </small>
            </label>
            <label>
              Product Availability Status
              <select
                value={String(value.sell.available)}
                onChange={(e) =>
                  set("sell", "available", e.target.value === "true")
                }
              >
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
            </label>
            <label>
              Shipping Required
              <select
                value={String(value.sell.shippingRequired)}
                onChange={(e) =>
                  set("sell", "shippingRequired", e.target.value === "true")
                }
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            {value.sell.shippingRequired && (
              <>
                {field("sell", "weight", "Shipping Weight (kg)")}
                {field(
                  "sell",
                  "shippingAmount",
                  "Delivery charges per order (INR)",
                )}
              </>
            )}
          </div>
          <p>Product images and description use the existing listing fields.</p>
        </section>
      )}
      {value.book && (
        <section className="commerce-panel">
          <h3>Book Configuration</h3>
          <div className="commerce-grid">
            {field("book", "price", "Booking Price per unit / duration (INR)")}
            {field("book", "capacity", "Available Booking Quantity / Slots")}
            {field("book", "minimum", "Minimum Booking Quantity")}
            {field("book", "maximum", "Maximum Booking Quantity")}
            <label>
              Booking type
              <select
                value={value.book.mode}
                onChange={(e) => set("book", "mode", e.target.value)}
              >
                <option>Scheduled</option>
                <option>Quantity</option>
              </select>
            </label>
            <label>
              Booking Duration
              <select
                value={value.book.duration}
                onChange={(e) => set("book", "duration", e.target.value)}
              >
                {["Hourly", "Daily", "Weekly", "Custom"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            {value.book.duration === "Custom" &&
              field("book", "durationMinutes", "Custom duration (minutes)")}
            {value.book.mode === "Scheduled" && (
              <>
                {field("book", "startDate", "Booking Start Date", "date", true)}
                {field("book", "endDate", "Booking End Date", "date", true)}
              </>
            )}
            {field(
              "book",
              "advance",
              "Advance Booking Amount per unit (INR)",
            )}
            <label>
              Booking Availability Status
              <select
                value={String(value.book.available)}
                onChange={(e) =>
                  set("book", "available", e.target.value === "true")
                }
              >
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
            </label>
            {["cancellation", "refund", "instructions"].map((key) => (
              <label key={key}>
                <span>{
                  {
                    cancellation: "Cancellation Policy",
                    refund: "Refund Policy",
                    instructions: "Booking Instructions",
                  }[key]
                }{key !== "instructions" && <RequiredMark />}</span>
                <textarea
                  rows={3}
                  required={key !== "instructions"}
                  maxLength={5000}
                  value={value.book[key]}
                  onChange={(e) => set("book", key, e.target.value)}
                />
              </label>
            ))}
          </div>
          {value.book.mode === "Scheduled" && (
            <div>
              <h4>Available Booking Time Slots (optional)</h4>
              <p>
                A selected time slot determines the reserved start and end time.
              </p>
              {value.book.slots.map((slot, i) => (
                <div className="commerce-slot" key={i}>
                  <label>
                    <span>Start<RequiredMark /></span>
                    <input
                      type="time"
                      required
                      value={slot.start}
                      onChange={(e) =>
                        set(
                          "book",
                          "slots",
                          value.book.slots.map((s, n) =>
                            n === i ? { ...s, start: e.target.value } : s,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>End<RequiredMark /></span>
                    <input
                      type="time"
                      required
                      value={slot.end}
                      onChange={(e) =>
                        set(
                          "book",
                          "slots",
                          value.book.slots.map((s, n) =>
                            n === i ? { ...s, end: e.target.value } : s,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "book",
                        "slots",
                        value.book.slots.filter((_, n) => n !== i),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={value.book.slots.length >= 48}
                onClick={() =>
                  set("book", "slots", [
                    ...value.book.slots,
                    { start: "09:00", end: "10:00" },
                  ])
                }
              >
                Add time slot
              </button>
            </div>
          )}
        </section>
      )}
      <label>
        <span>Applicable Tax (%)<RequiredMark /></span>
        <input
          type="number"
          required
          min={0}
          max={100}
          step="0.01"
          value={taxRate}
          onChange={(e) => onTaxChange(Number(e.target.value))}
        />
      </label>
      {value.type === "Both" && (
        <p>Selling stock and booking availability are independent.</p>
      )}
    </div>
  );
}
export function OfferReview({ offer }) {
  if (!offer) return null;
  return (
    <section className="commerce commerce-panel">
      <h3>{offerLabel(offer.type)}</h3>
      {["sell", "book"]
        .filter((k) => offer[k])
        .map((kind) => (
          <div key={kind}>
            <h4>
              {kind === "sell" ? "Sell Configuration" : "Book Configuration"}
            </h4>
            <dl className="commerce-review">
              {Object.entries(offer[kind]).map(([k, v]) => (
                <div key={k}>
                  <dt>{k.replace(/([A-Z])/g, " $1")}</dt>
                  <dd>
                    {typeof v === "boolean"
                      ? v
                        ? "Yes"
                        : "No"
                      : Array.isArray(v)
                        ? v.map((s) => `${s.start}–${s.end}`).join(", ")
                        : (v ?? "Not specified")}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
    </section>
  );
}
