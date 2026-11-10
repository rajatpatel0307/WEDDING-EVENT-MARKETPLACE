import { z } from "zod";
import { createHash } from "node:crypto";
import { scope, repo, owned } from "../customers/workspace.common.js";
import {
  availableService,
  createBooking,
} from "../customers/workspace.operations.js";
import { capacity } from "./booking-capacity.js";
import { assertAllowed, fail } from "./commerce.policy.js";
import { categoryOptions } from "./configuration.js";
import { assertAccess } from "../vendors/access.service.js";
export const bookingCheckoutInput = z
  .object({
    serviceId: z.guid(),
    quantity: z.number().int().min(1).max(100000),
    date: z.iso.date().optional(),
    start: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    addressId: z.guid().optional(),
    instructions: z.string().trim().max(2000).default(""),
    idempotencyKey: z.guid(),
    reviewToken: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    termsAccepted: z.boolean().default(false),
  })
  .strict();
export async function bookingCheckout(input, ctx, submit = false) {
  const { id } = scope(ctx),
    body = bookingCheckoutInput.parse(input);
  return repo.transaction(async (tx) => {
    await repo.select(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource=:key,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Checkout is busy.',1;",
      { key: `CommerceBooking:${id}:${body.idempotencyKey}` },
      tx,
    );
    const hash = createHash("sha256")
      .update(
        JSON.stringify({
          ...body,
          reviewToken: undefined,
          termsAccepted: undefined,
        }),
      )
      .digest("hex");
    const [replay] = await repo.select(
      "SELECT BookingId,BookingNumber,CommerceRequestHash FROM dbo.Booking WHERE CustomerId=:id AND CommerceCheckoutKey=:key",
      { id, key: body.idempotencyKey },
      tx,
    );
    if (replay) {
      if (replay.CommerceRequestHash !== hash)
        fail("Checkout key was already used with different details.", 409);
      return {
        id: replay.BookingId,
        number: replay.BookingNumber,
        message: "Booking already requested.",
      };
    }
    const { s } = await availableService(body.serviceId, null, tx);
    await assertAccess(s.VendorId, "booking", tx);
    const d = JSON.parse(s.DetailsJson || "{}"),
      config = d.offer?.book;
    assertAllowed(d.offer, await categoryOptions(s.CategoryId, tx));
    if (!config || d.offer.type === "Sell")
      fail("This listing is unavailable for this booking checkout.", 409);
    const window = await capacity(
      s.ServiceId,
      config,
      body.quantity,
      body.date,
      body.start,
      tx,
    );
    const address = body.addressId
      ? await owned("addresses", body.addressId, id, tx)
      : null;
    const location = address
      ? {
          fullName: address.FullName,
          phone: address.Phone,
          line1: address.AddressLine1,
          line2: address.AddressLine2,
          city: address.City,
          state: address.State,
          country: address.Country,
          postalCode: address.PostalCode,
        }
      : null;
    const subtotalMinor = Math.round(config.price * 100) * body.quantity,
      taxMinor = Math.round(
        (subtotalMinor * Number(d.pricing?.taxRate || 0)) / 100,
      );
    const total = (subtotalMinor + taxMinor) / 100;
    if (total > 1e8) fail("Booking total is outside supported limits.");
    const snapshot = {
      source: "Commerce",
      reservation: { startsAt: window.startsAt, endsAt: window.endsAt },
      serviceId: s.ServiceId,
      quantity: body.quantity,
      booking: config,
      location: { event: location },
      billingAddress: location,
      requirements: body.instructions,
      policies: {
        ...d.policies,
        cancellation: config.cancellation,
        refund: config.refund,
      },
      subtotal: subtotalMinor / 100,
      tax: taxMinor / 100,
      discount: 0,
      total,
      advance: (Math.round(config.advance * 100) * body.quantity) / 100,
    };
    const reviewToken = createHash("sha256")
      .update(JSON.stringify({ snapshot, date: body.date, start: body.start }))
      .digest("hex");
    if (!submit)
      return {
        reviewToken,
        service: s.ServiceName,
        vendor: s.BusinessName,
        quantity: body.quantity,
        price: config.price,
        subtotal: snapshot.subtotal,
        tax: snapshot.tax,
        total,
        advance: snapshot.advance,
        remaining: window.remaining,
        duration: config.duration,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        date: body.date || null,
        start: body.start || null,
        address: location,
        terms: snapshot.policies,
        instructions: config.instructions,
      };
    if (!body.termsAccepted || body.reviewToken !== reviewToken)
      fail("Review the current booking summary and accept the policies.", 409);
    const event = {
      EventId: null,
      EventName: s.ServiceName,
      EventType: "Reservation",
      EventDate: body.date || null,
      StartTime: body.start || null,
      EndTime:
        window.endsAt &&
        window.startsAt.slice(0, 10) === window.endsAt.slice(0, 10)
          ? window.endsAt.slice(11, 16)
          : null,
      City: address?.City || "",
      State: address?.State || "",
      GuestCount: 1,
      LocationJson: location ? JSON.stringify(location) : null,
      ReservationQuantities: { [s.ServiceId.toLowerCase()]: body.quantity },
    };
    const result = await createBooking(
      event,
      s.VendorId,
      [
        {
          ServiceId: s.ServiceId,
          ItemName: s.ServiceName,
          Quantity: body.quantity,
          UnitPrice: config.price,
          TaxAmount: snapshot.tax,
          DescriptionSnapshot: JSON.stringify({
            duration: config.duration,
            startsAt: window.startsAt,
            endsAt: window.endsAt,
            instructions: config.instructions,
          }),
        },
      ],
      ctx,
      tx,
      null,
      snapshot,
    );
    await repo.update(
      { table: "Booking", id: "BookingId" },
      result.id,
      { CommerceCheckoutKey: body.idempotencyKey, CommerceRequestHash: hash },
      tx,
    );
    return result;
  });
}
export async function bookingAvailability(serviceId, input) {
  z.guid().parse(serviceId);
  const body = z
    .object({
      quantity: z.coerce.number().int().min(1).max(100000).default(1),
      date: z.iso.date().optional(),
      start: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional(),
    })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const { s } = await availableService(serviceId, null, tx);
    await assertAccess(s.VendorId, "booking", tx);
    const offer = JSON.parse(s.DetailsJson || "{}").offer;
    assertAllowed(offer, await categoryOptions(s.CategoryId, tx));
    if (!offer?.book || offer.type === "Sell")
      fail("Booking is unavailable for this listing.", 409);
    const result = await capacity(
      serviceId,
      offer.book,
      body.quantity,
      body.date,
      body.start,
      tx,
    );
    return {
      available: true,
      remaining: result.remaining,
      startsAt: result.startsAt,
      endsAt: result.endsAt,
    };
  });
}
