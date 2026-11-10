import { z } from "zod";
const money = z.number().finite().min(0).max(10000000).multipleOf(0.01);
const count = z.number().int().min(1).max(100000);
const text = z.string().trim().max(5000).default("");
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const offerSchema = z
  .object({
    type: z.enum(["Sell", "Book", "Both"]),
    sell: z
      .object({
        price: money.positive(),
        stock: z.number().int().min(0).max(10000000),
        minimum: count.max(999).default(1),
        maximum: count.max(999).nullable().default(null),
        sku: z.string().trim().max(100).default(""),
        available: z.boolean().default(true),
        shippingRequired: z.boolean().default(true),
        weight: z.number().min(0).max(100000).default(0),
        shippingAmount: money.default(0),
      })
      .strict()
      .optional(),
    book: z
      .object({
        price: money.positive(),
        capacity: count,
        minimum: count.default(1),
        maximum: count,
        mode: z.enum(["Scheduled", "Quantity"]).default("Scheduled"),
        duration: z
          .enum(["Hourly", "Daily", "Weekly", "Custom"])
          .default("Daily"),
        durationMinutes: z.number().int().min(1).max(525600).default(1440),
        startDate: z.iso.date().nullable().default(null),
        endDate: z.iso.date().nullable().default(null),
        slots: z
          .array(
            z
              .object({ start: clock, end: clock })
              .strict()
              .refine(
                (s) => s.end > s.start,
                "A time slot must end after it starts.",
              ),
          )
          .max(48)
          .default([]),
        advance: money.default(0),
        cancellation: text,
        refund: text,
        instructions: text,
        available: z.boolean().default(true),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((o, ctx) => {
    const issue = (message) => ctx.addIssue({ code: "custom", message });
    if (o.type !== "Book" && !o.sell) issue("Complete the sell configuration.");
    if (o.type !== "Sell" && !o.book)
      issue("Complete the booking configuration.");
    if ((o.type === "Book" && o.sell) || (o.type === "Sell" && o.book))
      issue("Remove the disabled service configuration.");
    if (o.sell?.maximum != null && o.sell.maximum < o.sell.minimum)
      issue("Maximum selling quantity must be at least the minimum.");
    if (
      o.book &&
      (o.book.maximum < o.book.minimum || o.book.maximum > o.book.capacity)
    )
      issue("Booking quantity limits must fit the capacity.");
    if (
      o.book?.startDate &&
      o.book?.endDate &&
      o.book.endDate < o.book.startDate
    )
      issue("Booking end date must follow its start date.");
    if (o.book && o.book.advance > o.book.price)
      issue("Advance per unit cannot exceed the booking price.");
    if (o.book && (!o.book.cancellation || !o.book.refund))
      issue("Provide cancellation and refund policies.");
    const slots = [...(o.book?.slots || [])].sort((a, b) =>
      a.start.localeCompare(b.start),
    );
    if (slots.some((s, i) => i && s.start < slots[i - 1].end))
      issue("Booking time slots cannot overlap.");
  });
export const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
export function assertAllowed(offer, category) {
  const type = offer?.type || "Book";
  if (
    (type !== "Book" && !category.AllowBuyOnline) ||
    (type !== "Sell" && [false, 0].includes(category.AllowBooking))
  )
    fail("The category does not permit this Sell/Book selection.", 409);
}
export function assertQuantity(quantity, config, stock) {
  if (
    !Number.isInteger(quantity) ||
    quantity < config.minimum ||
    quantity > (config.maximum ?? 100000)
  )
    fail("Quantity is outside the allowed limits.");
  if (quantity > stock)
    fail("The requested quantity is no longer available.", 409);
}
export function bookingWindow(config, date, start, now = new Date()) {
  if (config.mode === "Quantity") {
    if (date || start) fail("Quantity bookings do not accept a date or time.");
    return { startsAt: null, endsAt: null };
  }
  z.iso.date().parse(date);
  if (
    (config.startDate && date < config.startDate) ||
    (config.endDate && date > config.endDate)
  )
    fail("Choose a date within the booking window.");
  if (config.slots.length && !config.slots.some((s) => s.start === start))
    fail("Select an available time slot.");
  if (start) clock.parse(start);
  const startsAt = `${date}T${start || "00:00"}:00`;
  const instant = new Date(`${startsAt}+05:30`);
  if (
    date < now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) ||
    (start && instant <= now)
  )
    fail("Choose an upcoming booking date and time.");
  const slot = config.slots.find((s) => s.start === start);
  const duration = slot
    ? Number(slot.end.slice(0, 2)) * 60 +
      Number(slot.end.slice(3)) -
      (Number(start.slice(0, 2)) * 60 + Number(start.slice(3)))
    : { Hourly: 60, Daily: 1440, Weekly: 10080 }[config.duration] ||
      config.durationMinutes;
  const endsAt = new Date(new Date(`${startsAt}Z`).getTime() + duration * 60000)
    .toISOString()
    .slice(0, 19);
  if (
    config.endDate &&
    endsAt.slice(0, 10) > config.endDate &&
    endsAt !== `${config.endDate}T00:00:00`
  ) {
    // endDate is inclusive, including a full final day.
    const exclusive = new Date(`${config.endDate}T00:00:00Z`);
    exclusive.setUTCDate(exclusive.getUTCDate() + 1);
    if (endsAt > exclusive.toISOString().slice(0, 19))
      fail("The duration exceeds the booking window.");
  }
  return { startsAt, endsAt };
}
export function sellingTotals(rows) {
  const lines = rows.map((r) => {
    const unit = Math.round(Number(r.UnitPrice) * 100),
      subtotal = unit * r.Quantity;
    if (!Number.isSafeInteger(unit) || unit <= 0)
      fail("Invalid selling price.", 409);
    const tax = Math.round((subtotal * Number(r.TaxRate)) / 100);
    const shipping =
      r.shippingRequired === false
        ? 0
        : Math.round(Number(r.ShippingAmount) * 100);
    return {
      ...r,
      subtotal: subtotal / 100,
      tax: tax / 100,
      shipping: shipping / 100,
      total: (subtotal + tax + shipping) / 100,
    };
  });
  const sum = (key) =>
    lines.reduce((n, r) => n + Math.round(r[key] * 100), 0) / 100;
  const total = sum("total");
  if (!Number.isFinite(total) || total <= 0 || total > 100000000)
    fail("Order total is outside the supported limits.");
  return {
    lines,
    subtotal: sum("subtotal"),
    tax: sum("tax"),
    shipping: sum("shipping"),
    discount: 0,
    total,
  };
}
