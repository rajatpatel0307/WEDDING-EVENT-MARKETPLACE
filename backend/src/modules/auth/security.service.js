import { notifySignup } from "../notifications/admin-events.js";
import { createHash } from "node:crypto";
import { GraphQLError } from "graphql";
import { Transaction, TableHints } from "sequelize";
import { sequelize } from "../../config/database.js";
import { Limit, Audit } from "../../models/index.js";
export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");
export const fail = (message, code = "BAD_USER_INPUT") => {
  throw new GraphQLError(message, { extensions: { code } });
};
export async function limit(key, maximum = 10, seconds = 900) {
  const id = digest(key);
  const allowed = await sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
    async (transaction) => {
      let row = await Limit.findByPk(id, {
        transaction,
        tableHint: TableHints.UPDLOCK,
      });
      if (!row)
        row = await Limit.create(
          { id, count: 0, expiresAt: new Date(Date.now() + seconds * 1000) },
          { transaction },
        );
      if (row.expiresAt <= new Date()) {
        row.count = 0;
        row.expiresAt = new Date(Date.now() + seconds * 1000);
      }
      if (row.count >= maximum) return false;
      row.count++;
      await row.save({ transaction });
      return true;
    },
  );
  if (!allowed)
    fail("Too many attempts. Please try again later.", "RATE_LIMITED");
}
export const audit = async (
  action,
  ctx,
  userId = null,
  entityId = null,
  transaction,
) => {
  await Audit.create(
    { action, userId, entityId, ip: ctx.req.ip },
    { transaction },
  );
  if (action === "SIGNUP") await notifySignup(userId, transaction);
};
