import { validateCoverage } from "../addresses/locations.service.js";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import * as repo from "../admin/admin.repository.js";
import {
  requireRole,
  requireApprovedVendor,
} from "../../middleware/auth.middleware.js";
import {
  notify,
  notifyBusiness,
  owned as customerOwned,
} from "../customers/workspace.common.js";
import {
  availableService,
  createBooking,
} from "../customers/workspace.operations.js";
import { assertVersion } from "../vendors/workspace.common.js";
import { assertEventTime, dayOf, clockOf } from "../bookings/reservations.js";
import { commissionRate, policySchema } from "../admin/booking-finance.js";
import { ruleForServices } from "../payments/commission-rules.js";
import {
  quoteInput,
  requestInput,
  decisionInput,
  calculateQuotation,
} from "./quotations.validation.js";
const fail = (message, status = 409) => {
  throw Object.assign(new Error(message), { status });
};
const parse = (value, fallback = {}) => (value ? JSON.parse(value) : fallback);
async function insertQuoteItem(values, tx) {
  const keys = Object.keys(values);
  return repo.select(
    `DECLARE @ids TABLE(id bigint); INSERT INTO dbo.QuotationItems(${keys.map((k) => `[${k}]`).join(",")}) OUTPUT inserted.QuotationItemId INTO @ids VALUES(${keys.map((_, i) => `:v${i}`).join(",")}); SELECT id FROM @ids;`,
    Object.fromEntries(
      Object.values(values).map((value, i) => [`v${i}`, value]),
    ),
    tx,
  );
}
export function actor(ctx, role) {
  if (!["Customer", "Vendor", "Admin"].includes(role))
    fail("Unsupported quotation role.", 403);
  return role === "Vendor"
    ? requireApprovedVendor(ctx)
    : requireRole(ctx, role === "Admin" ? "ADMIN" : "CUSTOMER");
}
const ownerClause = (role) =>
  role === "Customer"
    ? "AND CustomerId=:owner"
    : role === "Vendor"
      ? "AND VendorId=:owner"
      : "";
async function groupLock(root, tx) {
  await repo.select(
    "DECLARE @r int; EXEC @r=sp_getapplock @Resource=:key,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Quotation is busy. Please retry.',1;",
    { key: `Quotation:${root.toLowerCase()}` },
    tx,
  );
}
export async function access(id, ctx, role, tx, lock = false) {
  const user = actor(ctx, role);
  z.guid().parse(id);
  const params = { id, owner: role === "Vendor" ? user.vendor.id : user.id };
  const read = (hint) =>
    repo.select(
      `SELECT *,(SELECT BusinessName FROM dbo.Vendors v WHERE v.VendorId=dbo.Quotations.VendorId) AS VendorName,(SELECT CONCAT(u.FirstName,' ',u.LastName) FROM dbo.Users u WHERE u.UserId=dbo.Quotations.CustomerId) AS CustomerName,CASE WHEN EXISTS(SELECT 1 FROM dbo.QuotationRequests nr WHERE nr.OriginalQuotationId=dbo.Quotations.QuotationId AND nr.Status='Pending') THEN 1 ELSE 0 END AS Negotiating,CASE WHEN ValidUntil IS NOT NULL AND ValidUntil<=SYSUTCDATETIME() THEN 1 ELSE 0 END AS IsExpired FROM dbo.Quotations ${hint} WHERE QuotationId=:id ${ownerClause(role)} ${role === "Customer" ? "AND Status<>'Draft' AND SentAt IS NOT NULL" : ""}`,
      params,
      tx,
    );
  let [row] = await read("");
  if (!row) fail("Quotation not found.", 404);
  if (lock) {
    await groupLock(row.RootQuotationId || row.QuotationId, tx);
    [row] = await read("WITH(UPDLOCK,HOLDLOCK)");
  }
  return row;
}
async function accessRequest(id, ctx, role, tx, lock = false) {
  const user = actor(ctx, role);
  z.guid().parse(id);
  const [row] = await repo.select(
    `SELECT *,(SELECT BusinessName FROM dbo.Vendors v WHERE v.VendorId=dbo.QuotationRequests.VendorId) AS VendorName,(SELECT CONCAT(u.FirstName,' ',u.LastName) FROM dbo.Users u WHERE u.UserId=dbo.QuotationRequests.CustomerId) AS CustomerName FROM dbo.QuotationRequests ${lock ? "WITH(UPDLOCK,HOLDLOCK)" : ""} WHERE RequestId=:id ${ownerClause(role)}`,
    { id, owner: role === "Vendor" ? user.vendor.id : user.id },
    tx,
  );
  if (!row) fail("Quotation request not found.", 404);
  return row;
}
async function record(
  row,
  action,
  message,
  ctx,
  role,
  tx,
  {
    request = false,
    previous = null,
    status = null,
    key = null,
    internal = false,
    metadata = null,
  } = {},
) {
  if (key) {
    const [old] = await repo.select(
      "SELECT HistoryId FROM dbo.QuotationHistory WITH(UPDLOCK,HOLDLOCK) WHERE QuotationId=:id AND EventKey=:key",
      { id: row.QuotationId, key },
      tx,
    );
    if (old) return false;
  }
  await repo.insert(
    { table: "QuotationHistory", id: "HistoryId" },
    {
      QuotationId: request ? null : row.QuotationId,
      RequestId: row.RequestId || null,
      Action: action,
      PreviousStatus: previous,
      NewStatus: status,
      ActorId: ctx?.auth?.user?.id || null,
      ActorRole: role,
      Message: message.slice(0, 2000),
      MetadataJson: metadata ? JSON.stringify(metadata) : null,
      Visibility: internal ? "Internal" : "Public",
      EventKey: key,
    },
    tx,
  );
  await repo.select(
    "INSERT INTO dbo.AuditLogs(UserId,ActionType,EntityType,EntityId,OldValue,NewValue,IPAddress,UserAgent) VALUES(:user,:action,:entity,:id,:old,:next,:ip,:agent)",
    {
      user: ctx?.auth?.user?.id || null,
      action: `QUOTATION_${action}`,
      entity: request ? "QuotationRequest" : "Quotation",
      id: request ? row.RequestId : row.QuotationId,
      old: JSON.stringify({ status: previous }),
      next: JSON.stringify({ status, message, metadata }),
      ip: ctx?.req?.ip || "quotation-worker",
      agent: String(ctx?.req?.get?.("user-agent") || "quotation-worker").slice(
        0,
        1000,
      ),
    },
    tx,
  );
  return true;
}
async function inform(row, title, message, tx) {
  const id = row.QuotationId || row.RequestId,
    type = row.QuotationId ? "Quotation" : "QuotationRequest";
  await notify(row.CustomerId, title, message, type, id, tx);
  await notifyBusiness(row.VendorId, title, message, type, id, tx);
}
function eventSnapshot(e) {
  return {
    LocationJson: e.LocationJson || null,
    location: e.LocationJson ? JSON.parse(e.LocationJson) : null,
    EventId: e.EventId,
    CustomerId: e.CustomerId,
    EventName: e.EventName,
    EventType: e.EventType,
    EventDate: dayOf(e.EventDate),
    StartTime: clockOf(e.StartTime),
    EndTime: clockOf(e.EndTime),
    City: e.City,
    State: e.State,
    GuestCount: e.GuestCount,
    Budget: e.Budget,
    Description: e.Description,
    Status: e.Status,
  };
}
export async function request(input, ctx) {
  const user = actor(ctx, "Customer"),
    body = requestInput.parse(input);
  return repo.transaction(async (tx) => {
    const event = await customerOwned("events", body.eventId, user.id, tx);
    if (!["Planning", "Confirmed"].includes(event.Status))
      fail("Select an active event.");
    assertEventTime(event);
    const selections = [
        { serviceId: body.serviceId, packageId: body.packageId },
        ...body.services,
      ],
      services = [];
    let vendor = null;
    for (const selection of selections) {
      if (
        services.some(
          (s) =>
            s.serviceId.toLowerCase() === selection.serviceId.toLowerCase(),
        )
      )
        continue;
      const { s, pack } = await availableService(
        selection.serviceId,
        selection.packageId,
        tx,
      );
      if (!event.LocationJson)
        fail("Add a full event location before requesting a quotation.", 409);
      const coverage = JSON.parse(s.DetailsJson || "{}").location;
      if (coverage?.active === false)
        fail("This service location is inactive.", 409);
      validateCoverage(coverage, JSON.parse(event.LocationJson));
      if (!s.IsCustomQuoteAvailable)
        fail(
          "This service does not accept customized quotation requests. Contact the vendor or use its booking options.",
          409,
        );
      if (vendor && vendor.toLowerCase() !== s.VendorId.toLowerCase())
        fail("Submit a separate quotation request for each vendor.", 400);
      vendor = s.VendorId;
      services.push({
        serviceId: s.ServiceId,
        name: s.ServiceName,
        categoryId: s.CategoryId,
        subcategoryId: s.SubCategoryId,
        packageId: pack?.PackageId || null,
        package: pack?.PackageName || null,
      });
    }
    const selectedItems = [];
    for (const item of body.items) {
      if (
        !services.some(
          (s) => s.serviceId.toLowerCase() === item.serviceId.toLowerCase(),
        )
      )
        fail("Select the service associated with each requested item.", 400);
      const [row] = await repo.select(
        "SELECT ItemName FROM dbo.ServiceItems WHERE ServiceItemId=:id AND ServiceId=:service",
        { id: item.id, service: item.serviceId },
        tx,
      );
      if (!row) fail("A requested service item is unavailable.", 400);
      selectedItems.push({ ...item, name: row.ItemName });
    }
    const [pending] = await repo.select(
      "SELECT RequestId FROM dbo.QuotationRequests WITH(UPDLOCK,HOLDLOCK) WHERE CustomerId=:customer AND VendorId=:vendor AND EventId=:event AND Status='Pending'",
      { customer: user.id, vendor, event: body.eventId },
      tx,
    );
    if (pending)
      fail(
        "A request is already pending for this event and vendor. Use its conversation to add requirements.",
      );
    const id = randomUUID(),
      number = `QR-${id.replaceAll("-", "").toUpperCase()}`;
    const row = {
      RequestId: id,
      RequestNumber: number,
      CustomerId: user.id,
      VendorId: vendor,
      EventId: body.eventId,
      ServiceId: services[0].serviceId,
      PackageId: services[0].packageId,
      Message: body.message,
      SnapshotJson: JSON.stringify({
        event: eventSnapshot(event),
        services,
        items: selectedItems,
      }),
    };
    await repo.insert({ table: "QuotationRequests", id: "RequestId" }, row, tx);
    await record(row, "RequestSubmitted", body.message, ctx, "Customer", tx, {
      request: true,
      status: "Pending",
    });
    await inform(
      row,
      "Quotation request submitted",
      `${number}: ${body.message}`,
      tx,
    );
    return {
      id,
      number,
      message: "Quotation request submitted. Your vendor has been notified.",
    };
  });
}
export async function requestDetail(id, ctx, role) {
  const row = await accessRequest(id, ctx, role);
  const history = await repo.select(
    `SELECT Action AS action,ActorRole AS role,Message AS message,CreatedAt AS createdAt,Visibility AS visibility FROM dbo.QuotationHistory WHERE RequestId=:id ${role === "Admin" ? "" : "AND Visibility='Public'"} ${role === "Customer" ? "AND (QuotationId IS NULL OR EXISTS(SELECT 1 FROM dbo.Quotations hq WHERE hq.QuotationId=dbo.QuotationHistory.QuotationId AND hq.SentAt IS NOT NULL))" : ""} ORDER BY HistoryId`,
    { id },
  );
  const quotations = await repo.select(
    `SELECT QuotationId AS id,QuotationNumber AS number,RevisionNumber AS revision,Status AS status,IsCurrent AS [current] FROM dbo.Quotations WHERE RequestId=:id ${role === "Customer" ? "AND Status<>'Draft' AND SentAt IS NOT NULL" : ""} ORDER BY RevisionNumber`,
    { id },
  );
  return {
    request: row,
    snapshot: parse(row.SnapshotJson),
    history,
    quotations,
  };
}
export async function requestAction(id, input, ctx, role) {
  actor(ctx, role);
  const body = z
    .object({
      action: z.enum(["Cancel", "Reject", "Information"]),
      reason: z.string().trim().min(3).max(1000),
    })
    .strict()
    .parse(input);
  if (
    (role === "Customer" && body.action !== "Cancel") ||
    (role === "Vendor" && body.action === "Cancel") ||
    role === "Admin"
  )
    fail("This request action is not permitted.", 403);
  return repo.transaction(async (tx) => {
    const row = await accessRequest(id, ctx, role, tx, true);
    if (row.Status !== "Pending") fail("This request is no longer pending.");
    if (body.action === "Information") {
      const [prior] = await repo.select(
        "SELECT HistoryId FROM dbo.QuotationHistory WHERE RequestId=:id AND Action='InformationRequested' AND Message=:message",
        { id, message: body.reason },
        tx,
      );
      if (prior)
        return { message: "This information request was already recorded." };
    }
    const status = body.action === "Information" ? "Pending" : "Closed";
    await repo.update(
      { table: "QuotationRequests", id: "RequestId" },
      id,
      { Status: status, DecisionReason: body.reason },
      tx,
    );
    await record(
      row,
      body.action === "Information"
        ? "InformationRequested"
        : body.action === "Reject"
          ? "RequestRejected"
          : "RequestCancelled",
      body.reason,
      ctx,
      role,
      tx,
      { request: true, previous: row.Status, status },
    );
    await inform(row, "Quotation request updated", body.reason, tx);
    return { message: "Quotation request updated." };
  });
}
async function snapshotLines(lines, vendor, tx, send) {
  const result = [];
  for (const line of lines) {
    const [s] = await repo.select(
      "SELECT ServiceId,ServiceName,VendorId,IsActive,ApprovalStatus,DetailsJson FROM dbo.Services WITH(UPDLOCK,HOLDLOCK) WHERE ServiceId=:id AND VendorId=:vendor",
      { id: line.serviceId, vendor },
      tx,
    );
    if (!s) fail("A selected service does not belong to your business.", 404);
    if (send) await availableService(line.serviceId, line.packageId, tx);
    let pack = null;
    if (line.packageId) {
      [pack] = await repo.select(
        "SELECT PackageId,PackageName,Description FROM dbo.ServicePackages WHERE PackageId=:id AND ServiceId=:service",
        { id: line.packageId, service: line.serviceId },
        tx,
      );
      if (!pack)
        fail("The selected package does not belong to this service.", 400);
    }
    let serviceItem = null;
    if (line.serviceItemId) {
      [serviceItem] = await repo.select(
        "SELECT ServiceItemId,ItemName,Description FROM dbo.ServiceItems WHERE ServiceItemId=:id AND ServiceId=:service",
        { id: line.serviceItemId, service: line.serviceId },
        tx,
      );
      if (!serviceItem)
        fail("The selected service item does not belong to this service.", 400);
    }
    const inclusions = pack
      ? await repo.select(
          "SELECT ItemName AS name,Description AS description,Quantity AS quantity,Unit AS unit FROM dbo.PackageItems WHERE PackageId=:id ORDER BY SortOrder,PackageItemId",
          { id: pack.PackageId },
          tx,
        )
      : [];
    result.push({
      ...line,
      snapshot: {
        description: line.description,
        service: s.ServiceName,
        package: pack
          ? { name: pack.PackageName, description: pack.Description }
          : null,
        inclusions,
        serviceItem,
      },
      policies: parse(s.DetailsJson).policies || {},
    });
  }
  return result;
}
async function bookingPolicy(lines, tx) {
  const terms = lines.map((l) => ({
      service: l.snapshot.service,
      cancellation: l.policies.cancellation || "",
      refund: l.policies.refund || "",
      policy: l.policies.bookingRefundPolicy || null,
    })),
    valid = terms.map((t) => policySchema.safeParse(t.policy));
  return {
    terms,
    policy:
      valid.length && valid.every((p) => p.success)
        ? {
            refundPercent: Math.min(...valid.map((p) => p.data.refundPercent)),
            cancellationFeePercent: Math.max(
              ...valid.map((p) => p.data.cancellationFeePercent),
            ),
            minimumNoticeHours: Math.max(
              ...valid.map((p) => p.data.minimumNoticeHours),
            ),
          }
        : null,
    commissionRate: await commissionRate(tx),
    commissionRule: await ruleForServices(
      lines.map((l) => l.serviceId).filter(Boolean),
      tx,
    ),
    capturedAt: new Date().toISOString(),
  };
}
export async function save(id, input, ctx, preview = false) {
  const user = actor(ctx, "Vendor"),
    body = quoteInput.parse(input),
    expiry = new Date(
      body.validUntil.length === 10
        ? `${body.validUntil}T23:59:59+05:30`
        : body.validUntil,
    );
  if (expiry <= new Date()) fail("Choose a future expiry date and time.", 400);
  return repo.transaction(async (tx) => {
    const creationHash = createHash("sha256")
      .update(JSON.stringify(body))
      .digest("hex");
    if (!id && body.idempotencyKey && !preview) {
      await groupLock(body.idempotencyKey, tx);
      const [prior] = await repo.select(
        "SELECT QuotationId,CreationHash FROM dbo.Quotations WITH(UPDLOCK,HOLDLOCK) WHERE VendorId=:vendor AND CreationKey=:key",
        { vendor: user.vendor.id, key: body.idempotencyKey },
        tx,
      );
      if (prior) {
        if (prior.CreationHash !== creationHash)
          fail(
            "Idempotency key was already used for different quotation content.",
          );
        return {
          id: prior.QuotationId,
          replayed: true,
          message: "Quotation already saved.",
        };
      }
    }
    const old = id ? await access(id, ctx, "Vendor", tx, true) : null;
    if (old) {
      assertVersion(old, body.expectedUpdatedAt);
      if (
        body.previousQuotationId &&
        body.previousQuotationId.toLowerCase() !==
          old.PreviousQuotationId?.toLowerCase()
      )
        fail("A draft cannot be moved to another revision chain.");
      if (old.Status !== "Draft")
        fail("Sent quotations are immutable. Create a revision.");
      if (old.EventId.toLowerCase() !== body.eventId.toLowerCase())
        fail("A draft revision must retain its event.");
    }
    let requested = body.requestId
      ? await accessRequest(body.requestId, ctx, "Vendor", tx, true)
      : null;
    if (!requested && !old && !body.previousQuotationId) {
      [requested] = await repo.select(
        "SELECT TOP(1) * FROM dbo.QuotationRequests WITH(UPDLOCK,HOLDLOCK) WHERE EventId=:event AND VendorId=:vendor AND Status='Pending' ORDER BY CreatedAt DESC",
        { event: body.eventId, vendor: user.vendor.id },
        tx,
      );
    }
    const previousId =
      old?.PreviousQuotationId ||
      body.previousQuotationId ||
      requested?.OriginalQuotationId;
    if (
      requested?.OriginalQuotationId &&
      previousId &&
      requested.OriginalQuotationId.toLowerCase() !== previousId.toLowerCase()
    )
      fail(
        "The modification request belongs to a different quotation revision.",
      );
    const previous = previousId
      ? await access(previousId, ctx, "Vendor", tx, true)
      : null;
    if (requested && !previous && !old) {
      const [existing] = await repo.select(
        "SELECT QuotationId FROM dbo.Quotations WITH(UPDLOCK,HOLDLOCK) WHERE RequestId=:request AND IsCurrent=1 AND (Status<>'Cancelled' OR SentAt IS NOT NULL)",
        { request: requested.RequestId },
        tx,
      );
      if (existing && !preview)
        fail(
          "This request already has a quotation. Edit its draft or create a revision.",
        );
    }
    if (previous && (previous.Status === "Accepted" || !previous.IsCurrent))
      fail(
        "This agreement is accepted or a newer revision exists. Resolve it before revising.",
      );
    if (
      requested &&
      (requested.EventId.toLowerCase() !== body.eventId.toLowerCase() ||
        requested.Status === "Closed")
    )
      fail("This request is closed or belongs to another event.");
    const [event] = await repo.select(
      "SELECT * FROM dbo.Events WHERE EventId=:id AND (EXISTS(SELECT 1 FROM dbo.QuotationRequests r WHERE r.EventId=:id AND r.VendorId=:vendor AND r.Status IN('Pending','Responded')) OR EXISTS(SELECT 1 FROM dbo.Booking b WHERE b.EventId=:id AND b.VendorId=:vendor AND b.BookingStatus NOT IN('Cancelled','Rejected','Refunded')) OR EXISTS(SELECT 1 FROM dbo.Quotations q WHERE q.EventId=:id AND q.VendorId=:vendor AND q.IsCurrent=1 AND q.Status IN('Sent','Viewed','Accepted'))) AND Status IN('Planning','Confirmed')",
      { id: body.eventId, vendor: user.vendor.id },
      tx,
    );
    if (!event)
      fail(
        "Choose an active event shared by a request or customer booking.",
        404,
      );
    assertEventTime(event);
    if (
      previous &&
      previous.CustomerId.toLowerCase() !== event.CustomerId.toLowerCase()
    )
      fail("A revision cannot change the customer.");
    const priced = calculateQuotation(body.items, body.advancePercent),
      lines = await snapshotLines(
        priced.lines,
        user.vendor.id,
        tx,
        body.status === "Sent",
      );
    const terms = {
      text: body.terms,
      cancellation: body.cancellation,
      advancePercent: body.advancePercent,
      bookingPolicy: await bookingPolicy(lines, tx),
    };
    if (preview)
      return {
        preview: {
          ...priced,
          lines: priced.lines,
          title: body.title,
          terms,
          expiry: expiry.toISOString(),
        },
      };
    const quoteId = old?.QuotationId || randomUUID(),
      root =
        old?.RootQuotationId ||
        previous?.RootQuotationId ||
        previous?.QuotationId ||
        quoteId;
    await groupLock(root, tx);
    let revision = old?.RevisionNumber || 1;
    if (!old && previous) {
      if ((body.reason || requested?.Message || "").length < 3)
        fail("Provide a reason for this revision.", 400);
      const [last] = await repo.select(
        "SELECT MAX(RevisionNumber) AS revision FROM dbo.Quotations WITH(UPDLOCK,HOLDLOCK) WHERE RootQuotationId=:root",
        { root },
        tx,
      );
      revision = Number(last.revision) + 1;
    }
    const values = {
      EventId: event.EventId,
      CustomerId: event.CustomerId,
      VendorId: user.vendor.id,
      RequestId:
        requested?.RequestId || old?.RequestId || previous?.RequestId || null,
      Title: body.title || "Event quotation",
      ValidUntil: expiry,
      SubTotal: priced.subtotal,
      DiscountAmount: priced.discount,
      TaxAmount: priced.tax,
      AdvanceAmount: priced.advance,
      Currency: "INR",
      VendorMessage: body.message,
      EventSnapshotJson: JSON.stringify(eventSnapshot(event)),
      TermsJson: JSON.stringify(terms),
      UpdatedAt: new Date(),
    };
    if (old)
      await repo.update(
        { table: "Quotations", id: "QuotationId" },
        quoteId,
        values,
        tx,
      );
    else
      await repo.insert(
        { table: "Quotations", id: "QuotationId" },
        {
          ...values,
          QuotationId: quoteId,
          CreationKey: body.idempotencyKey || null,
          CreationHash: creationHash,
          QuotationNumber: `QT-${quoteId.replaceAll("-", "").toUpperCase()}`,
          RootQuotationId: root,
          PreviousQuotationId: previous?.QuotationId || null,
          RevisionNumber: revision,
          IsCurrent: previous ? 0 : 1,
          Status: "Draft",
        },
        tx,
      );
    await repo.select(
      "DELETE FROM dbo.QuotationItems WHERE QuotationId=:id",
      { id: quoteId },
      tx,
    );
    for (const line of lines)
      await insertQuoteItem(
        {
          QuotationId: quoteId,
          ServiceId: line.serviceId,
          PackageId: line.packageId || null,
          ServiceItemId: line.serviceItemId || null,
          ItemName: line.name,
          Description: line.description,
          Quantity: line.quantity,
          Unit: line.unit,
          UnitPrice: line.price,
          DiscountAmount: line.discount,
          TaxAmount: line.tax,
          DiscountType: line.discountType,
          DiscountValue: line.discountValue,
          TaxRate: line.taxRate ?? null,
          ItemKind: line.kind,
          SnapshotJson: JSON.stringify(line.snapshot),
        },
        tx,
      );
    const row = {
      ...values,
      QuotationId: quoteId,
      RootQuotationId: root,
      PreviousQuotationId: previous?.QuotationId || null,
      RevisionNumber: revision,
      Status: "Draft",
    };
    await record(
      row,
      old ? "DraftUpdated" : previous ? "RevisionCreated" : "DraftCreated",
      body.reason || requested?.Message || "Quotation draft prepared.",
      ctx,
      "Vendor",
      tx,
      {
        status: "Draft",
        metadata: {
          previousQuotationId: previous?.QuotationId || null,
          total: priced.total,
        },
      },
    );
    if (body.status === "Sent") await send(row, ctx, tx);
    return {
      id: quoteId,
      message:
        body.status === "Sent" ? "Quotation sent." : "Quotation draft saved.",
    };
  });
}
async function send(row, ctx, tx) {
  if (row.ValidUntil && new Date(row.ValidUntil) <= new Date())
    fail("Update the expiry before sending.");
  const [current] = await repo.select(
    "SELECT * FROM dbo.Quotations WITH(UPDLOCK,HOLDLOCK) WHERE (RootQuotationId=:root OR QuotationId=:root) AND IsCurrent=1",
    { root: row.RootQuotationId || row.QuotationId },
    tx,
  );
  if (
    row.PreviousQuotationId &&
    current &&
    ![
      row.PreviousQuotationId.toLowerCase(),
      row.QuotationId.toLowerCase(),
    ].includes(current.QuotationId.toLowerCase())
  )
    fail(
      "A newer revision was sent. Create a revision from the current proposal.",
    );
  if (
    current &&
    current.QuotationId.toLowerCase() !== row.QuotationId.toLowerCase() &&
    current.Status === "Accepted"
  )
    fail(
      "The current agreement was accepted while this revision was being prepared.",
    );
  const items = await repo.select(
    "SELECT ServiceId,PackageId FROM dbo.QuotationItems WHERE QuotationId=:id",
    { id: row.QuotationId },
    tx,
  );
  if (!items.length) fail("Add quotation items before sending.");
  for (const i of items) await availableService(i.ServiceId, i.PackageId, tx);
  if (row.RequestId) {
    const [r] = await repo.select(
      "SELECT Status FROM dbo.QuotationRequests WITH(UPDLOCK,HOLDLOCK) WHERE RequestId=:id",
      { id: row.RequestId },
      tx,
    );
    if (!r || r.Status === "Closed") fail("The linked request is closed.");
    await repo.update(
      { table: "QuotationRequests", id: "RequestId" },
      row.RequestId,
      { Status: "Responded" },
      tx,
    );
  }
  if (
    current &&
    current.QuotationId.toLowerCase() !== row.QuotationId.toLowerCase()
  ) {
    await repo.update(
      { table: "Quotations", id: "QuotationId" },
      current.QuotationId,
      { IsCurrent: 0, UpdatedAt: new Date() },
      tx,
    );
    await record(
      current,
      "Superseded",
      "A new quotation revision was sent.",
      ctx,
      "Vendor",
      tx,
      {
        previous: current.Status,
        status: current.Status,
        metadata: { revision: row.QuotationId },
      },
    );
  }
  await repo.update(
    { table: "Quotations", id: "QuotationId" },
    row.QuotationId,
    { Status: "Sent", IsCurrent: 1, SentAt: new Date(), UpdatedAt: new Date() },
    tx,
  );
  await record(
    row,
    "Sent",
    "Quotation sent to the customer.",
    ctx,
    "Vendor",
    tx,
    { previous: "Draft", status: "Sent", key: "sent" },
  );
  await inform(
    row,
    row.RevisionNumber > 1
      ? "Revised quotation received"
      : "Quotation received",
    "Review the itemized prices, terms and expiry before responding.",
    tx,
  );
}
export async function action(id, input, ctx) {
  actor(ctx, "Vendor");
  const body = z
    .object({
      action: z.enum(["Send", "Cancel"]),
      expectedUpdatedAt: z.iso.datetime().optional(),
    })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const row = await access(id, ctx, "Vendor", tx, true);
    assertVersion(row, body.expectedUpdatedAt);
    if (body.action === "Send") {
      if (row.Status !== "Draft") fail("Only drafts can be sent.");
      await send(row, ctx, tx);
    } else {
      if (
        !["Draft", "Sent", "Viewed"].includes(row.Status) ||
        (row.Status !== "Draft" && !row.IsCurrent)
      )
        fail("This quotation cannot be cancelled.");
      await repo.update(
        { table: "Quotations", id: "QuotationId" },
        id,
        { Status: "Cancelled", UpdatedAt: new Date() },
        tx,
      );
      await record(
        row,
        "Cancelled",
        "Vendor cancelled this quotation.",
        ctx,
        "Vendor",
        tx,
        { previous: row.Status, status: "Cancelled" },
      );
      if (row.Status !== "Draft")
        await inform(
          row,
          "Quotation cancelled",
          "The vendor cancelled this proposal. Previous versions remain available.",
          tx,
        );
    }
    return {
      message: `Quotation ${body.action === "Send" ? "sent" : "cancelled"}.`,
    };
  });
}
export async function details(id, ctx, role) {
  const row = await access(id, ctx, role);
  const root = row.RootQuotationId || row.QuotationId;
  const [items, versions, history, bookings] = await Promise.all([
    repo.select(
      "SELECT QuotationItemId AS id,ServiceId AS serviceId,PackageId AS packageId,ServiceItemId AS serviceItemId,ItemName AS name,Description AS description,Quantity AS quantity,Unit AS unit,UnitPrice AS price,DiscountAmount AS discount,TaxAmount AS tax,LineTotal AS total,ItemKind AS kind,DiscountType AS discountType,DiscountValue AS discountValue,TaxRate AS taxRate,SnapshotJson AS snapshot FROM dbo.QuotationItems WHERE QuotationId=:id ORDER BY QuotationItemId",
      { id },
    ),
    repo.select(
      `SELECT q.QuotationId AS id,q.QuotationNumber AS number,q.RevisionNumber AS revision,q.Status AS status,q.IsCurrent AS [current],q.TotalAmount AS total,q.ValidUntil AS validUntil,q.TermsJson AS terms,q.CreatedAt AS createdAt FROM dbo.Quotations q WHERE (q.RootQuotationId=:root OR q.QuotationId=:root) ${role === "Customer" ? "AND q.Status<>'Draft' AND q.SentAt IS NOT NULL" : ""} ORDER BY q.RevisionNumber`,
      { root },
    ),
    repo.select(
      `SELECT h.HistoryId AS id,h.QuotationId AS quotationId,h.Action AS action,h.ActorRole AS role,h.Message AS message,h.MetadataJson AS metadata,h.Visibility AS visibility,h.CreatedAt AS createdAt FROM dbo.QuotationHistory h WHERE (h.QuotationId IN(SELECT QuotationId FROM dbo.Quotations WHERE RootQuotationId=:root OR QuotationId=:root) OR h.RequestId=:request) ${role === "Admin" ? "" : "AND h.Visibility='Public'"} ${role === "Customer" ? "AND (h.QuotationId IS NULL OR EXISTS(SELECT 1 FROM dbo.Quotations hq WHERE hq.QuotationId=h.QuotationId AND hq.Status<>'Draft' AND hq.SentAt IS NOT NULL))" : ""} ORDER BY h.HistoryId`,
      { root, request: row.RequestId || null },
    ),
    repo.select(
      "SELECT BookingId AS id,BookingNumber AS number,BookingStatus AS status,PaymentStatus AS paymentStatus FROM dbo.Booking WHERE QuotationId=:id",
      { id },
    ),
  ]);
  const expired =
      !!row.IsExpired && ["Sent", "Viewed", "Accepted"].includes(row.Status),
    actionable =
      !!row.IsCurrent && !expired && ["Sent", "Viewed"].includes(row.Status);
  const publicTerms = (value) => {
    const t = parse(value);
    if (t.bookingPolicy) {
      const { commissionRate, commissionRule, ...safe } = t.bookingPolicy;
      t.bookingPolicy = safe;
    }
    return t;
  };
  return {
    quotation:
      role === "Customer"
        ? {
            ...row,
            CreationHash: undefined,
            CreationKey: undefined,
            TermsJson: JSON.stringify(publicTerms(row.TermsJson)),
          }
        : row,
    items,
    versions:
      role === "Customer"
        ? versions.map((v) => ({
            ...v,
            terms: JSON.stringify(publicTerms(v.terms)),
          }))
        : versions,
    history,
    booking: bookings[0] || null,
    event: parse(row.EventSnapshotJson),
    terms:
      role === "Customer" ? publicTerms(row.TermsJson) : parse(row.TermsJson),
    actions: {
      accept: actionable,
      reject: actionable,
      modify:
        !!row.IsCurrent &&
        !bookings.length &&
        ["Sent", "Viewed", "Accepted"].includes(row.Status),
      convert:
        row.Status === "Accepted" &&
        !expired &&
        !!row.IsCurrent &&
        !bookings.length,
      reason: !row.IsCurrent
        ? "A newer revision supersedes this quotation."
        : expired
          ? "The quotation validity period has ended."
          : bookings.length
            ? "This revision has already been converted into a booking."
            : "Only the current unexpired sent revision can be accepted.",
    },
    serverTime: new Date().toISOString(),
  };
}
export async function decide(id, input, ctx) {
  const user = actor(ctx, "Customer"),
    body = decisionInput.parse(input);
  if (body.action === "Modify" && body.message.length < 5)
    fail("Describe the changes you need.", 400);
  const result = await repo.transaction(async (tx) => {
    const row = await access(id, ctx, "Customer", tx, true);
    if (!row.IsCurrent)
      fail("A newer revision exists. Review the current quotation.");
    const [booking] = await repo.select(
      "SELECT BookingId FROM dbo.Booking WHERE QuotationId=:id",
      { id },
      tx,
    );
    if (booking) fail("This revision has already been converted.");
    if (body.action === "Modify" && row.Status === "Accepted") {
    } else if (!["Sent", "Viewed"].includes(row.Status))
      fail("This quotation has already been handled.");
    if (row.IsExpired)
      fail("This quotation has expired. Request a new revision.");
    const next = {
      Accept: "Accepted",
      Reject: "Rejected",
      Modify: "Cancelled",
    }[body.action];
    await repo.update(
      { table: "Quotations", id: "QuotationId" },
      id,
      {
        Status: next,
        CustomerMessage: body.message || null,
        UpdatedAt: new Date(),
        ...(body.action === "Accept"
          ? { AcceptedAt: new Date(), AcceptedBy: user.id }
          : body.action === "Reject"
            ? { RejectedAt: new Date(), RejectedBy: user.id }
            : {}),
      },
      tx,
    );
    if (body.action === "Modify") {
      const items = await repo.select(
        "SELECT TOP(1) ServiceId,PackageId FROM dbo.QuotationItems WHERE QuotationId=:id AND ServiceId IS NOT NULL ORDER BY QuotationItemId",
        { id },
        tx,
      );
      if (!items.length) fail("Contact the vendor for a revised request.");
      const requestId = randomUUID();
      await repo.insert(
        { table: "QuotationRequests", id: "RequestId" },
        {
          RequestId: requestId,
          RequestNumber: `QR-${requestId.replaceAll("-", "").toUpperCase()}`,
          CustomerId: row.CustomerId,
          VendorId: row.VendorId,
          EventId: row.EventId,
          ServiceId: items[0].ServiceId,
          PackageId: items[0].PackageId,
          OriginalQuotationId: id,
          Message: body.message,
          SnapshotJson: row.EventSnapshotJson
            ? JSON.stringify({ event: parse(row.EventSnapshotJson) })
            : null,
        },
        tx,
      );
    }
    await record(
      row,
      body.action === "Modify" ? "ModificationRequested" : next,
      body.message || `Quotation ${next.toLowerCase()}.`,
      ctx,
      "Customer",
      tx,
      {
        previous: row.Status,
        status: next,
        key: body.action === "Modify" ? null : next.toLowerCase(),
      },
    );
    await inform(
      row,
      body.action === "Modify"
        ? "Quotation modification requested"
        : `Quotation ${next.toLowerCase()}`,
      body.message || `Quotation ${next.toLowerCase()}.`,
      tx,
    );
    return {
      quotationId: id,
      accepted: body.action === "Accept",
      message:
        body.action === "Modify"
          ? "Modification requested. The previous version is preserved."
          : `Quotation ${next.toLowerCase()}.`,
    };
  });
  // Acceptance is durable independently of inventory conversion. A failed conversion
  // never erases the customer's acceptance or partially creates a booking.
  if (result.accepted && body.convert)
    return { ...result, ...(await convert(id, ctx)) };
  return result;
}
export async function convert(id, ctx) {
  actor(ctx, "Customer");
  return repo.transaction(async (tx) => {
    const row = await access(id, ctx, "Customer", tx, true);
    const [prior] = await repo.select(
      "SELECT BookingId AS id FROM dbo.Booking WITH(UPDLOCK,HOLDLOCK) WHERE QuotationId=:id",
      { id },
      tx,
    );
    if (prior)
      return {
        ...prior,
        message: "This quotation has already been converted.",
        replayed: true,
      };
    if (row.Status !== "Accepted" || !row.IsCurrent)
      fail("Accept the current quotation before converting.");
    if (row.IsExpired)
      fail(
        "The accepted quotation expired before conversion. Request a resolution from the vendor.",
      );
    const current = await customerOwned(
      "events",
      row.EventId,
      row.CustomerId,
      tx,
    );
    if (!["Planning", "Confirmed"].includes(current.Status))
      fail("The event is no longer active.");
    const event = { ...current, ...parse(row.EventSnapshotJson) };
    assertEventTime(event);
    const items = await repo.select(
      "SELECT * FROM dbo.QuotationItems WHERE QuotationId=:id ORDER BY QuotationItemId",
      { id },
      tx,
    );
    if (!items.length) fail("The quotation has no items.");
    for (const i of items) {
      const { s, pack } = await availableService(i.ServiceId, i.PackageId, tx);
      if (s.VendorId.toLowerCase() !== row.VendorId.toLowerCase())
        fail("A quoted service is no longer owned by this vendor.");
      if (
        pack &&
        ((pack.MinimumGuests && event.GuestCount < pack.MinimumGuests) ||
          (pack.MaximumGuests && event.GuestCount > pack.MaximumGuests))
      )
        fail(
          "The agreed guest count no longer satisfies package availability.",
        );
    }
    const terms = parse(row.TermsJson),
      snapshot = {
        source: "Quotation",
        quotationId: id,
        rootQuotationId: row.RootQuotationId || id,
        revision: row.RevisionNumber,
        acceptedAt: row.AcceptedAt,
        number: row.QuotationNumber,
        currency: row.Currency,
        validUntil: row.ValidUntil,
        subtotal: Number(row.SubTotal),
        discount: Number(row.DiscountAmount),
        tax: Number(row.TaxAmount),
        total: Number(row.TotalAmount),
        advance: Number(row.AdvanceAmount),
        terms,
      };
    const booking = await createBooking(
      event,
      row.VendorId,
      items.map((i) => ({
        ...i,
        DescriptionSnapshot: JSON.stringify({
          ...parse(i.SnapshotJson, { description: i.Description }),
          quotationItemId: i.QuotationItemId,
          unit: i.Unit,
          kind: i.ItemKind,
          discountType: i.DiscountType,
          discountValue: i.DiscountValue,
          taxRate: i.TaxRate,
        }),
      })),
      ctx,
      tx,
      id,
      snapshot,
    );
    await repo.update(
      { table: "Booking", id: "BookingId" },
      booking.id,
      {
        AdvanceAmount: row.AdvanceAmount,
        ...(terms.bookingPolicy
          ? { PolicySnapshotJson: JSON.stringify(terms.bookingPolicy) }
          : {}),
      },
      tx,
    );
    await record(
      row,
      "Converted",
      "Accepted quotation converted to a booking.",
      ctx,
      "Customer",
      tx,
      {
        previous: "Accepted",
        status: "Accepted",
        key: "converted",
        metadata: { bookingId: booking.id },
      },
    );
    await inform(
      row,
      "Quotation converted to booking",
      `${row.QuotationNumber} is linked to ${booking.number}. Payment and vendor confirmation follow the booking workflow.`,
      tx,
    );
    return booking;
  });
}
export async function list(input, ctx, role, requests = false) {
  const user = actor(ctx, role),
    q = z
      .object({
        q: z.string().trim().max(150).default(""),
        status: z
          .enum(
            requests
              ? ["", "Pending", "Responded", "Closed"]
              : [
                  "",
                  "Draft",
                  "Sent",
                  "Viewed",
                  "Accepted",
                  "Rejected",
                  "Expired",
                  "Cancelled",
                  "Negotiation",
                  "Converted",
                ],
          )
          .default(""),
        from: z.iso.date().optional(),
        to: z.iso.date().optional(),
        page: z.coerce.number().int().min(1).max(10000).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(20),
        direction: z.enum(["newest", "oldest"]).default("newest"),
      })
      .parse(input);
  if (q.from && q.to && q.from > q.to)
    fail("Choose a valid event date range.", 400);
  const params = {
    owner: role === "Vendor" ? user.vendor.id : user.id,
    q: `%${q.q.replace(/[\[\]%_]/g, (c) => `[${c}]`)}%`,
    status: q.status,
    from: q.from || null,
    to: q.to || null,
    offset: (q.page - 1) * q.pageSize,
    size: q.pageSize,
  };
  const table = requests ? "QuotationRequests" : "Quotations",
    key = requests ? "RequestId" : "QuotationId",
    status = requests ? "t.Status" : "t.Status",
    where = [
      role === "Customer"
        ? "t.CustomerId=:owner"
        : role === "Vendor"
          ? "t.VendorId=:owner"
          : "1=1",
    ];
  if (!requests) {
    if (role === "Customer")
      where.push("t.Status<>'Draft' AND t.SentAt IS NOT NULL");
    where.push("t.IsCurrent=1");
  }
  where.push(
    `(CONVERT(nvarchar(36),t.${key}) LIKE :q OR ${requests ? "t.RequestNumber" : "t.QuotationNumber"} LIKE :q OR CONCAT(u.FirstName,' ',u.LastName) LIKE :q OR v.BusinessName LIKE :q ${requests ? "OR s.ServiceName LIKE :q" : ""})`,
  );
  if (q.status === "Converted" && !requests)
    where.push(
      "EXISTS(SELECT 1 FROM dbo.Booking b WHERE b.QuotationId=t.QuotationId)",
    );
  else if (q.status === "Negotiation" && !requests)
    where.push(
      "EXISTS(SELECT 1 FROM dbo.QuotationRequests nr WHERE nr.OriginalQuotationId=t.QuotationId AND nr.Status='Pending')",
    );
  else if (q.status) where.push(`${status}=:status`);
  if (q.from) where.push("e.EventDate>=:from");
  if (q.to) where.push("e.EventDate<=:to");
  const source = `FROM dbo.${table} t JOIN dbo.Events e ON e.EventId=t.EventId JOIN dbo.Users u ON u.UserId=t.CustomerId JOIN dbo.Vendors v ON v.VendorId=t.VendorId ${requests ? "JOIN dbo.Services s ON s.ServiceId=t.ServiceId" : ""} WHERE ${where.join(" AND ")}`;
  const [count] = await repo.select(
    `SELECT COUNT(*) AS total ${source}`,
    params,
  );
  const rows = await repo.select(
    `SELECT t.${key} AS id,${requests ? "t.RequestNumber" : "t.QuotationNumber"} AS number,t.Status AS status,e.EventName AS event,CONVERT(char(10),e.EventDate,120) AS date,e.City AS city,e.GuestCount AS guests,e.Budget AS budget,CONCAT(u.FirstName,' ',u.LastName) AS customer,v.BusinessName AS vendor,${requests ? "s.ServiceName AS service,t.Message AS message" : "t.RevisionNumber AS revision,t.TotalAmount AS amount,t.ValidUntil AS validUntil,CASE WHEN EXISTS(SELECT 1 FROM dbo.QuotationRequests nr WHERE nr.OriginalQuotationId=t.QuotationId AND nr.Status='Pending') THEN 1 ELSE 0 END AS negotiating,(SELECT TOP(1) BookingId FROM dbo.Booking b WHERE b.QuotationId=t.QuotationId) AS bookingId"},t.CreatedAt AS createdAt ${source} ORDER BY t.CreatedAt ${q.direction === "oldest" ? "ASC" : "DESC"},t.${key} OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    params,
  );
  return {
    rows,
    total: Number(count.total),
    page: q.page,
    pageSize: q.pageSize,
  };
}
export async function statistics(ctx, role) {
  const user = actor(ctx, role),
    where =
      role === "Customer"
        ? "CustomerId=:owner"
        : role === "Vendor"
          ? "VendorId=:owner"
          : "1=1",
    params = { owner: role === "Vendor" ? user.vendor.id : user.id };
  const [quotes] = await repo.select(
    `SELECT COUNT(*) AS total,SUM(CASE WHEN Status IN('Sent','Viewed') THEN 1 ELSE 0 END) AS pending,SUM(CASE WHEN Status='Accepted' THEN 1 ELSE 0 END) AS accepted,SUM(CASE WHEN Status='Rejected' THEN 1 ELSE 0 END) AS rejected,SUM(CASE WHEN Status='Expired' THEN 1 ELSE 0 END) AS expired,SUM(TotalAmount) AS value FROM dbo.Quotations WHERE IsCurrent=1 AND ${where} ${role === "Customer" ? "AND Status<>'Draft' AND SentAt IS NOT NULL" : ""}`,
    params,
  );
  const [requests] = await repo.select(
    `SELECT COUNT(*) AS total,SUM(CASE WHEN Status='Pending' THEN 1 ELSE 0 END) AS pending FROM dbo.QuotationRequests WHERE ${where}`,
    params,
  );
  const [negotiations] = await repo.select(
    `SELECT COUNT(*) AS total FROM dbo.QuotationRequests WHERE Status='Pending' AND OriginalQuotationId IS NOT NULL AND ${where}`,
    params,
  );
  const [converted] = await repo.select(
    `SELECT COUNT(*) AS total FROM dbo.Quotations q WHERE ${where} AND EXISTS(SELECT 1 FROM dbo.Booking b WHERE b.QuotationId=q.QuotationId)`,
    params,
  );
  return {
    quotes,
    requests,
    negotiations: Number(negotiations.total),
    converted: Number(converted.total),
  };
}
export async function adminNote(id, input, ctx) {
  actor(ctx, "Admin");
  const { message } = z
    .object({ message: z.string().trim().min(3).max(2000) })
    .strict()
    .parse(input);
  return repo.transaction(async (tx) => {
    const row = await access(id, ctx, "Admin", tx, true);
    await record(row, "AdminNote", message, ctx, "Admin", tx, {
      internal: true,
    });
    return { message: "Private administrative note recorded." };
  });
}
export async function processQuotationJobs() {
  const candidates = await repo.select(
    "SELECT TOP(100) QuotationId AS id FROM dbo.Quotations WHERE IsCurrent=1 AND Status IN('Sent','Viewed','Accepted') AND (ValidUntil<=SYSUTCDATETIME() OR NOT EXISTS(SELECT 1 FROM dbo.QuotationHistory h WHERE h.QuotationId=dbo.Quotations.QuotationId AND h.EventKey='expiry-reminder')) AND NOT EXISTS(SELECT 1 FROM dbo.Booking b WHERE b.QuotationId=dbo.Quotations.QuotationId) AND ValidUntil<=DATEADD(hour,24,SYSUTCDATETIME()) ORDER BY ValidUntil,QuotationId",
  );
  let expired = 0,
    reminded = 0;
  for (const candidate of candidates)
    await repo.transaction(async (tx) => {
      const [initial] = await repo.select(
        "SELECT * FROM dbo.Quotations WHERE QuotationId=:id",
        { id: candidate.id },
        tx,
      );
      await groupLock(initial.RootQuotationId || initial.QuotationId, tx);
      const [row] = await repo.select(
        "SELECT *,CASE WHEN ValidUntil<=SYSUTCDATETIME() THEN 1 ELSE 0 END AS IsExpired FROM dbo.Quotations WITH(UPDLOCK,HOLDLOCK) WHERE QuotationId=:id AND IsCurrent=1 AND Status IN('Sent','Viewed','Accepted') AND NOT EXISTS(SELECT 1 FROM dbo.Booking b WHERE b.QuotationId=dbo.Quotations.QuotationId)",
        { id: candidate.id },
        tx,
      );
      if (!row) return;
      if (row.IsExpired) {
        await repo.update(
          { table: "Quotations", id: "QuotationId" },
          row.QuotationId,
          { Status: "Expired", UpdatedAt: new Date() },
          tx,
        );
        if (
          await record(
            row,
            "Expired",
            "Quotation validity period ended.",
            null,
            "System",
            tx,
            { previous: row.Status, status: "Expired", key: "expired" },
          )
        ) {
          await inform(
            row,
            "Quotation expired",
            "Request a new revision to continue negotiations.",
            tx,
          );
          expired++;
        }
      } else if (
        await record(
          row,
          "ExpiryReminder",
          "Quotation expires within 24 hours.",
          null,
          "System",
          tx,
          { status: row.Status, key: "expiry-reminder" },
        )
      ) {
        await inform(
          row,
          "Quotation expires soon",
          "Review the current quotation before its expiry time.",
          tx,
        );
        reminded++;
      }
    });
  return { expired, reminded };
}
