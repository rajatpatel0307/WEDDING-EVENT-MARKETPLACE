import { notifyAdmins } from "../notifications/admin-events.js";
import { publishInsertedNotifications } from '../notifications/notification-broadcast.js';
import { QueryTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { getResource } from "./admin.resources.js";
import { dateBounds } from "./admin.validation.js";
const sqlValues = (values) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      value instanceof Date
        ? value.toISOString().slice(0, 23).replace("T", " ")
        : value,
    ]),
  );
export const select = async (sql, replacements = {}, transaction) => {
  const notificationInsert=/^(INSERT INTO dbo.Notifications\([^)]*\))\s+(VALUES|SELECT)/i;
  const notifying=notificationInsert.test(sql);
  if(notifying)sql=sql.replace(notificationInsert,'$1 OUTPUT inserted.UserId AS notificationUserId $2');
  const rows=await sequelize.query(sql, {
    replacements: sqlValues(replacements),
    type: QueryTypes.SELECT,
    transaction,
  });
  if(notifying)publishInsertedNotifications(rows,transaction);
  return rows;
};
export const transaction = (fn) => sequelize.transaction(fn);
export async function list(name, query) {
  const r = getResource(name),
    columns = { id: `t.${r.id}`, ...r.fields, createdAt: "t.CreatedAt" };
  const sort = Object.hasOwn(columns, query.sort) ? query.sort : "createdAt";
  const bounds = dateBounds(query.from, query.to);
  const replacements = {
    ...bounds,
    status: query.status,
    q: `%${query.q.replace(/[\[\]%_]/g, (c) => `[${c}]`)}%`,
    category: query.category,
    location: `%${query.location.replace(/[\[\]%_]/g, (c) => `[${c}]`)}%`,
    gateway: query.gateway,
    offset: (query.page - 1) * query.pageSize,
    size: query.pageSize,
  };
  const search = [...Object.values(r.fields), `t.[${r.id}]`]
    .map((v) => `CONVERT(nvarchar(max),${v}) LIKE :q`)
    .join(" OR ");
  const where = [
    r.where || "1=1",
    query.q ? `(${search})` : "1=1",
    query.status && r.fields.status ? `${r.fields.status}=:status` : "1=1",
    bounds.from ? "t.CreatedAt>=:from" : "1=1",
    bounds.to ? "t.CreatedAt< :to" : "1=1",
    query.category && ["vendors", "applications"].includes(name)
      ? "EXISTS(SELECT 1 FROM dbo.VendorCategories vc WHERE vc.VendorId=t.VendorId AND vc.CategoryId=:category)"
      : "1=1",
    query.category && name === "sub-categories"
      ? "t.CategoryId=:category"
      : "1=1",
    query.category && name === "commission"
      ? "EXISTS(SELECT 1 FROM dbo.BookingItems bi JOIN dbo.Services s ON s.ServiceId=bi.ServiceId WHERE bi.BookingId=t.BookingId AND s.CategoryId=:category)"
      : "1=1",
    query.location && ["vendors", "applications"].includes(name)
      ? "EXISTS(SELECT 1 FROM dbo.VendorLocations l WHERE l.VendorId=t.VendorId AND (l.City LIKE :location OR l.State LIKE :location))"
      : "1=1",
    query.gateway && name === "payments" ? "t.GatewayName=:gateway" : "1=1",
  ].join(" AND ");
  const source = `FROM dbo.[${r.table}] t ${r.joins || ""} WHERE ${where}`;
  const [count] = await select(
    `SELECT COUNT_BIG(*) AS total ${source}`,
    replacements,
  );
  const rows = await select(
    `SELECT ${Object.entries(columns)
      .map(([key, value]) => `${value} AS [${key}]`)
      .join(
        ",",
      )}${r.updated === false ? "" : ["Payments", "Refunds", "VendorPayouts", "PlatformCommission", "Wishlists", "Messages", "Notifications", "Coupons", "Offers", "Media", "AuditLogs"].includes(r.table) ? "" : ", t.UpdatedAt AS updatedAt"} ${source} ORDER BY [${sort}] ${query.direction === "asc" ? "ASC" : "DESC"},t.[${r.id}] OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY`,
    replacements,
  );
  return {
    gatewayOptions:
      name === "payments"
        ? (
            await select(
              "SELECT DISTINCT GatewayName AS name FROM dbo.Payments WHERE GatewayName IS NOT NULL ORDER BY GatewayName",
            )
          ).map((row) => row.name)
        : [],
    rows,
    total: Number(count.total),
    page: query.page,
    pageSize: query.pageSize,
    columns: Object.keys(columns).filter(
      (k) => k !== "id" || ["customers", "vendors"].includes(name),
    ),
    statuses: r.statuses || [],
    actions: r.actions || [],
    editable: r.editable ? Object.keys(r.editable) : [],
  };
}
export async function lockRecord(r, id, tx) {
  const [row] = await select(
    `SELECT * FROM dbo.[${r.table}] WITH(UPDLOCK,HOLDLOCK) WHERE [${r.id}]=:id`,
    { id },
    tx,
  );
  if (!row)
    throw Object.assign(new Error("Record not found."), { status: 404 });
  return row;
}
export async function update(r, id, values, tx) {
  const assignments = Object.keys(values).map((k, i) => `[${k}]=:v${i}`);
  const replacements = Object.fromEntries(
    Object.values(values).map((v, i) => [`v${i}`, v]),
  );
  await sequelize.query(
    `UPDATE dbo.[${r.table}] SET ${assignments.join(",")} WHERE [${r.id}]=:id`,
    { replacements: sqlValues({ ...replacements, id }), transaction: tx },
  );
}
export async function insert(r, values, tx) {
  const replacements = Object.fromEntries(
    Object.values(values).map((v, i) => [`v${i}`, v]),
  );
  return select(
    `INSERT INTO dbo.[${r.table}] (${Object.keys(values)
      .map((k) => `[${k}]`)
      .join(",")}) OUTPUT INSERTED.[${r.id}] AS id VALUES (${Object.keys(values)
      .map((_, i) => `:v${i}`)
      .join(",")})`,
    replacements,
    tx,
  );
}
export async function auditAdmin(
  ctx,
  action,
  entity,
  id,
  oldValue,
  newValue,
  tx,
) {
  await sequelize.query(
    "INSERT INTO dbo.AuditLogs(UserId,ActionType,EntityType,EntityId,OldValue,NewValue,IPAddress,UserAgent) VALUES(:user,:action,:entity,:id,:old,:next,:ip,:agent)",
    {
      replacements: {
        user: ctx.auth.user.id,
        action,
        entity,
        id: String(id),
        old: JSON.stringify(oldValue),
        next: JSON.stringify(newValue),
        ip: ctx.req.ip,
        agent: String(ctx.req.get?.("user-agent") || "").slice(0, 1000),
      },
      transaction: tx,
    },
  );
  await notifyAdmins(action, entity, id, tx);
}
export async function notifyVendor(userId, vendorId, status, reason, tx) {
  const label =
    status === "UnderReview" ? "under review" : status.toLowerCase();
  const message = reason || `Your application has been ${label}.`;
  const [rows]=await sequelize.query(
    "INSERT INTO dbo.Notifications(UserId,NotificationType,Title,Message,ReferenceType,ReferenceId) OUTPUT inserted.UserId AS notificationUserId VALUES(:user,'VendorVerification',:title,:message,'Vendor',:id)",
    {
      replacements: {
        user: userId,
        title: `Vendor application ${label}`,
        message:
          message.length > 2000 ? `${message.slice(0, 1997)}...` : message,
        id: vendorId,
      },
      transaction: tx,
    },
  );
  publishInsertedNotifications(rows,tx);
}
