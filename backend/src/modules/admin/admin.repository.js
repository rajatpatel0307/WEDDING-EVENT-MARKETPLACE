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
export const select = (sql, replacements = {}, transaction) =>
  sequelize.query(sql, {
    replacements: sqlValues(replacements),
    type: QueryTypes.SELECT,
    transaction,
  });
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
    offset: (query.page - 1) * query.pageSize,
    size: query.pageSize,
  };
  const search = Object.values(r.fields)
    .map((v) => `CONVERT(nvarchar(max),${v}) LIKE :q`)
    .join(" OR ");
  const where = [
    r.where || "1=1",
    query.q ? `(${search})` : "1=1",
    query.status && r.fields.status ? `${r.fields.status}=:status` : "1=1",
    bounds.from ? "t.CreatedAt>=:from" : "1=1",
    bounds.to ? "t.CreatedAt< :to" : "1=1",
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
    rows,
    total: Number(count.total),
    page: query.page,
    pageSize: query.pageSize,
    columns: Object.keys(columns).filter((k) => k !== "id"),
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
    "INSERT INTO dbo.AuditLogs(UserId,ActionType,EntityType,EntityId,OldValue,NewValue,IPAddress) VALUES(:user,:action,:entity,:id,:old,:next,:ip)",
    {
      replacements: {
        user: ctx.auth.user.id,
        action,
        entity,
        id: String(id),
        old: JSON.stringify(oldValue),
        next: JSON.stringify(newValue),
        ip: ctx.req.ip,
      },
      transaction: tx,
    },
  );
}
export async function notifyVendor(userId, vendorId, status, reason, tx) {
  const label =
    status === "UnderReview" ? "under review" : status.toLowerCase();
  const message = reason || `Your application has been ${label}.`;
  await sequelize.query(
    "INSERT INTO dbo.Notifications(UserId,NotificationType,Title,Message,ReferenceType,ReferenceId) VALUES(:user,'VendorVerification',:title,:message,'Vendor',:id)",
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
}
