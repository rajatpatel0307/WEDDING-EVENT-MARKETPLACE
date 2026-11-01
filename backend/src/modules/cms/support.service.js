import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import * as db from "../admin/admin.repository.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { limit } from "../auth/security.service.js";
import { notifyAdmins } from "../notifications/admin-events.js";
import { createNotification } from "../notifications/notification-center.service.js";
import { mailConfigured, sendTransactionalMail } from "../auth/mail.service.js";
import { current } from "./cms.service.js";
import * as validation from "./support.validation.js";
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const admin = (ctx) => requireRole(ctx, "ADMIN");
const insert = async (table, id, values, tx) =>
  (await db.insert({ table, id }, values, tx))[0];
const audit = (ctx, action, entity, id, old, next, tx) =>
  db.auditAdmin(ctx, action, entity, id, old ?? null, next ?? null, tx);
export async function submit(input, ctx) {
  const b = validation.inquiryInput.parse(input);
  if (b.website) fail("Unable to submit this inquiry.");
  const page = await current("contact"),
    settings = page ? JSON.parse(page.ContentJson).contact : null;
  if (!settings?.formEnabled)
    fail("The contact form is currently unavailable.", 503);
  if (settings.phoneRequired && !b.phone)
    fail("A phone number is required for this contact form.");
  const hash = createHash("sha256")
    .update(
      JSON.stringify([
        b.fullName,
        b.email,
        b.phone,
        b.subject,
        b.category,
        b.message,
      ]),
    )
    .digest("hex");
  const [prior] = await db.select(
    "SELECT ReferenceNumber,RequestHash FROM dbo.ContactMessages WHERE RequestKey=:key",
    { key: b.requestKey },
  );
  if (prior) {
    if (prior.RequestHash !== hash)
      fail("This request key was used for a different inquiry.", 409);
    return {
      reference: prior.ReferenceNumber,
      message: "Your inquiry has been saved.",
    };
  }
  await limit(`contact:${ctx.req.ip}`, 5, 3600);
  return db.transaction(async (tx) => {
    await db.select(
      "DECLARE @r int; EXEC @r=sp_getapplock @Resource=:resource,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @r<0 THROW 51000,'Inquiry is busy.',1;",
      {
        resource: `contact:${createHash("sha256").update(b.email).digest("hex")}`,
      },
      tx,
    );
    const [duplicate] = await db.select(
      "SELECT ReferenceNumber,RequestHash FROM dbo.ContactMessages WHERE RequestKey=:key OR (Email=:email AND RequestHash=:hash AND CreatedAt>DATEADD(minute,-15,SYSUTCDATETIME()))",
      { key: b.requestKey, email: b.email, hash },
      tx,
    );
    if (duplicate) {
      if (duplicate.RequestHash !== hash)
        fail("This request key was already used.", 409);
      return {
        reference: duplicate.ReferenceNumber,
        message: "Your inquiry has been saved.",
      };
    }
    const id = randomUUID(),
      reference = `MN-${id.replaceAll("-", "")}`,
      names = b.fullName.split(/\s+/),
      first = names.shift();
    if (first.length > 100 || names.join(" ").length > 100)
      fail("Use a name with each part under 100 characters.");
    await insert(
      "ContactMessages",
      "Id",
      {
        Id: id,
        ReferenceNumber: reference,
        FullName: b.fullName,
        FirstName: first,
        LastName: names.join(" "),
        Email: b.email,
        Phone: b.phone || null,
        Subject: b.subject,
        Category: b.category,
        Message: b.message,
        Status: "New",
        ConsentedAt: new Date(),
        RequestKey: b.requestKey,
        RequestHash: hash,
      },
      tx,
    );
    const [recent] = await db.select(
      "SELECT COUNT(*) AS count FROM dbo.ContactInquiryEvents e JOIN dbo.ContactMessages c ON c.Id=e.InquiryId WHERE c.Email=:email AND e.EventType='Acknowledgement' AND e.DeliveryStatus<>'Disabled' AND e.CreatedAt>DATEADD(day,-1,SYSUTCDATETIME())",
      { email: b.email },
      tx,
    );
    await insert(
      "ContactInquiryEvents",
      "EventId",
      {
        InquiryId: id,
        EventType: "Acknowledgement",
        Body: `Your inquiry ${reference} has been saved. The team can use this reference for follow-up.`,
        DeliveryStatus:
          settings.acknowledgementEnabled &&
          mailConfigured() &&
          recent.count < 3
            ? "Pending"
            : "Disabled",
      },
      tx,
    );
    await notifyAdmins("CONTACT_INQUIRY_CREATED", "ContactInquiry", id, tx);
    return {
      reference,
      message:
        "Your inquiry has been saved. Keep this reference for follow-up.",
    };
  });
}
async function inquiry(id, tx) {
  z.guid().parse(id);
  const [row] = await db.select(
    `SELECT * FROM dbo.ContactMessages ${tx ? "WITH(UPDLOCK,HOLDLOCK)" : ""} WHERE Id=:id`,
    { id },
    tx,
  );
  if (!row) fail("Inquiry not found.", 404);
  return row;
}
export async function list(input, ctx) {
  admin(ctx);
  const b = validation.listInput.parse(input),
    p = {
      q: `%${b.q.replace(/[\[\]%_]/g, (c) => `[${c}]`)}%`,
      offset: (b.page - 1) * b.pageSize,
      size: b.pageSize,
    },
    where = [];
  if (b.q)
    where.push(
      "(c.FullName LIKE :q OR c.Email LIKE :q OR c.ReferenceNumber LIKE :q OR c.Subject LIKE :q)",
    );
  if (b.status) {
    where.push("c.Status=:status");
    p.status = z.enum(validation.statuses).parse(b.status);
  }
  if (b.category) {
    where.push("c.Category=:category");
    p.category = z.enum(validation.inquiryTypes).parse(b.category);
  }
  if (b.from) {
    where.push("c.CreatedAt>=:from");
    p.from = b.from;
  }
  if (b.to) {
    where.push("c.CreatedAt<DATEADD(day,1,CAST(:to AS date))");
    p.to = b.to;
  }
  const source = `FROM dbo.ContactMessages c LEFT JOIN dbo.Users a ON a.UserId=c.AssignedTo WHERE ${where.join(" AND ") || "1=1"}`;
  const [count] = await db.select(`SELECT COUNT_BIG(*) AS total ${source}`, p);
  const rows = await db.select(
    `SELECT c.Id AS id,c.ReferenceNumber AS reference,c.FullName AS name,c.Email AS email,c.Subject AS subject,c.Category AS category,c.Status AS status,c.AssignedTo AS assignedTo,CONCAT(a.FirstName,' ',a.LastName) AS assignee,c.CreatedAt AS createdAt ${source} ORDER BY c.CreatedAt DESC,c.Id OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    p,
  );
  return {
    rows,
    total: Number(count.total),
    page: b.page,
    pageSize: b.pageSize,
  };
}
export async function details(id, ctx) {
  admin(ctx);
  const row = await inquiry(id);
  return {
    ...row,
    events: await db.select(
      "SELECT e.*,CONCAT(u.FirstName,' ',u.LastName) AS administrator FROM dbo.ContactInquiryEvents e LEFT JOIN dbo.Users u ON u.UserId=e.CreatedBy WHERE InquiryId=:id ORDER BY e.CreatedAt DESC,e.EventId",
      { id },
    ),
  };
}
export async function staff(ctx) {
  admin(ctx);
  return db.select(
    "SELECT u.UserId AS id,CONCAT(u.FirstName,' ',u.LastName) AS name FROM dbo.Users u WHERE u.IsActive=1 AND u.IsBlocked=0 AND EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=u.UserId AND r.RoleCode='ADMIN' AND r.IsActive=1) ORDER BY name",
  );
}
export async function change(id, action, input, ctx) {
  const user = admin(ctx);
  return db.transaction(async (tx) => {
    const row = await inquiry(id, tx);
    let values = { UpdatedAt: new Date() },
      event = { InquiryId: id, CreatedBy: user.id };
    if (action === "status") {
      const b = validation.statusInput.parse(input);
      values = {
        ...values,
        Status: b.status,
        ResolvedAt: ["Resolved", "Closed"].includes(b.status)
          ? new Date()
          : null,
      };
      event = {
        ...event,
        EventType: "Status",
        PreviousStatus: row.Status,
        NewStatus: b.status,
        Body: b.reason,
      };
    } else if (action === "assign") {
      const b = z
        .object({ assignedTo: z.guid().nullable() })
        .strict()
        .parse(input);
      if (
        b.assignedTo &&
        !(await staff(ctx)).some(
          (s) => s.id.toLowerCase() === b.assignedTo.toLowerCase(),
        )
      )
        fail("Choose an active administrator.");
      values.AssignedTo = b.assignedTo;
      event = {
        ...event,
        EventType: "Assignment",
        Body: b.assignedTo
          ? `Assigned to ${b.assignedTo}`
          : "Assignment removed",
      };
    } else if (action === "notes") {
      const b = z
        .object({ note: z.string().trim().min(2).max(5000) })
        .strict()
        .parse(input);
      event = { ...event, EventType: "Note", Body: b.note };
    } else if (action === "reply") {
      const b = validation.replyInput.parse(input);
      if (row.Status === "Spam")
        fail("Reopen this inquiry before replying.", 409);
      if (!mailConfigured())
        fail("Configure SMTP before sending replies.", 503);
      const [old] = await db.select(
        "SELECT EventId,InquiryId,Body FROM dbo.ContactInquiryEvents WHERE CreatedBy=:user AND RequestKey=:key",
        { user: user.id, key: b.requestKey },
        tx,
      );
      if (old) {
        if (
          old.InquiryId.toLowerCase() !== id.toLowerCase() ||
          old.Body !== b.body
        )
          fail("This request key was used for a different reply.", 409);
        return { message: "This reply is already queued." };
      }
      event = {
        ...event,
        EventType: "Reply",
        Body: b.body,
        RequestKey: b.requestKey,
        DeliveryStatus: "Pending",
      };
    } else fail("Unsupported inquiry action.");
    await db.update({ table: "ContactMessages", id: "Id" }, id, values, tx);
    await insert("ContactInquiryEvents", "EventId", event, tx);
    await audit(
      ctx,
      `CONTACT_${action.toUpperCase()}`,
      "ContactInquiry",
      id,
      { status: row.Status },
      { status: values.Status || row.Status, event: event.EventType },
      tx,
    );
    return {
      message:
        action === "reply"
          ? "Reply queued. Delivery status is tracked in inquiry history."
          : "Inquiry updated.",
    };
  });
}
export async function privacySubmit(input, ctx) {
  const user = requireAuth(ctx),
    b = validation.privacyInput.parse(input);
  await limit(`privacy:${user.id}`, 5, 86400);
  return db.transaction(async (tx) => {
    const [old] = await db.select(
      "SELECT RequestId,RequestType,Description FROM dbo.PrivacyRequests WITH(UPDLOCK,HOLDLOCK) WHERE UserId=:user AND RequestKey=:key",
      { user: user.id, key: b.requestKey },
      tx,
    );
    if (old) {
      if (
        old.RequestType !== b.requestType ||
        old.Description !== b.description
      )
        fail("This request key was used for other content.", 409);
      return { id: old.RequestId, message: "Your request is already saved." };
    }
    const r = await insert(
      "PrivacyRequests",
      "RequestId",
      {
        UserId: user.id,
        RequestType: b.requestType,
        Description: b.description,
        RequestKey: b.requestKey,
      },
      tx,
    );
    await notifyAdmins("PRIVACY_REQUEST_CREATED", "PrivacyRequest", r.id, tx);
    return {
      id: r.id,
      message:
        "Your request is saved for review. This does not automatically delete data or change account settings.",
    };
  });
}
export async function privacyList(input, ctx, all = false) {
  const user = all ? admin(ctx) : requireAuth(ctx),
    b = validation.listInput.parse(input),
    where = all ? "1=1" : "p.UserId=:user",
    p = { user: user.id, offset: (b.page - 1) * b.pageSize, size: b.pageSize };
  const [count] = await db.select(
    `SELECT COUNT(*) AS total FROM dbo.PrivacyRequests p WHERE ${where}`,
    p,
  );
  const rows = await db.select(
    `SELECT p.RequestId AS id,p.RequestType AS type,p.Description AS description,p.Status AS status,p.AdminResponse AS response,p.CreatedAt AS createdAt,p.UpdatedAt AS updatedAt,p.ResolvedAt AS resolvedAt${all ? ",p.UserId AS userId,p.AssignedTo AS assignedTo,u.Email AS email" : ""} FROM dbo.PrivacyRequests p ${all ? "JOIN dbo.Users u ON u.UserId=p.UserId" : ""} WHERE ${where} ORDER BY p.CreatedAt DESC,p.RequestId OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    p,
  );
  return {
    rows,
    total: Number(count.total),
    page: b.page,
    pageSize: b.pageSize,
  };
}
export async function privacyChange(id, input, ctx) {
  const user = admin(ctx),
    b = z
      .object({
        status: z.enum(validation.statuses.filter((s) => s !== "Spam")),
        response: z.string().trim().max(5000),
        assignedTo: z.guid().nullable().optional(),
      })
      .strict()
      .parse(input);
  z.guid().parse(id);
  if (
    b.assignedTo &&
    !(await staff(ctx)).some(
      (s) => s.id.toLowerCase() === b.assignedTo.toLowerCase(),
    )
  )
    fail("Choose an active administrator.");
  return db.transaction(async (tx) => {
    const [row] = await db.select(
      "SELECT * FROM dbo.PrivacyRequests WITH(UPDLOCK,HOLDLOCK) WHERE RequestId=:id",
      { id },
      tx,
    );
    if (!row) fail("Privacy request not found.", 404);
    if (["Resolved", "Closed"].includes(b.status) && !b.response)
      fail("A response is required before resolving this request.");
    await db.update(
      { table: "PrivacyRequests", id: "RequestId" },
      id,
      {
        Status: b.status,
        AdminResponse: b.response,
        AssignedTo: b.assignedTo === undefined ? row.AssignedTo : b.assignedTo,
        UpdatedAt: new Date(),
        ResolvedAt: ["Resolved", "Closed"].includes(b.status)
          ? new Date()
          : null,
      },
      tx,
    );
    await audit(
      ctx,
      "PRIVACY_REQUEST_UPDATED",
      "PrivacyRequest",
      id,
      { status: row.Status },
      { status: b.status, response: b.response, administrator: user.id },
      tx,
    );
    await createNotification(
      {
        userId: row.UserId,
        title: "Your privacy request was updated",
        message: "Open your legal and privacy center to review the response.",
        referenceType: "PrivacyRequest",
        referenceId: id,
      },
      tx,
    );
    return {
      message: "Request updated. No account data was automatically deleted.",
    };
  });
}
export async function processMail({
  send = sendTransactionalMail,
  limit: count = 10,
} = {}) {
  if (!mailConfigured() && send === sendTransactionalMail)
    return { sent: 0, failed: 0 };
  await db.select(
    "UPDATE dbo.ContactInquiryEvents SET DeliveryStatus='Unknown',ErrorMessage='Delivery outcome uncertain; inspect provider logs before retrying.' WHERE DeliveryStatus='Sending' AND LeaseUntil<SYSUTCDATETIME()",
  );
  await db.select(
    "UPDATE e SET DeliveryStatus='Disabled',ErrorMessage='Inquiry marked as spam.' FROM dbo.ContactInquiryEvents e JOIN dbo.ContactMessages c ON c.Id=e.InquiryId WHERE e.DeliveryStatus='Pending' AND c.Status='Spam'",
  );
  const rows = await db.select(
    "SELECT TOP(:count) e.EventId,e.InquiryId,e.Body,c.Email,c.ReferenceNumber FROM dbo.ContactInquiryEvents e JOIN dbo.ContactMessages c ON c.Id=e.InquiryId WHERE e.DeliveryStatus='Pending' AND c.Status<>'Spam' ORDER BY e.CreatedAt",
    { count: Math.min(50, Math.max(1, count)) },
  );
  let sent = 0,
    failed = 0;
  for (const row of rows) {
    const claim = await db.select(
      "UPDATE dbo.ContactInquiryEvents SET DeliveryStatus='Sending',LeaseUntil=DATEADD(minute,2,SYSUTCDATETIME()) OUTPUT inserted.EventId AS id WHERE EventId=:id AND DeliveryStatus='Pending'",
      { id: row.EventId },
    );
    if (!claim.length) continue;
    try {
      await send({
        to: row.Email,
        subject: `MarryNest inquiry ${row.ReferenceNumber}`,
        text: row.Body,
      });
      await db.update(
        { table: "ContactInquiryEvents", id: "EventId" },
        row.EventId,
        { DeliveryStatus: "Sent", SentAt: new Date(), LeaseUntil: null },
      );
      sent++;
    } catch {
      await db.update(
        { table: "ContactInquiryEvents", id: "EventId" },
        row.EventId,
        {
          DeliveryStatus: "Unknown",
          ErrorMessage:
            "Email outcome uncertain. Check SMTP logs before creating another reply.",
          LeaseUntil: null,
        },
      );
      failed++;
    }
  }
  return { sent, failed };
}
