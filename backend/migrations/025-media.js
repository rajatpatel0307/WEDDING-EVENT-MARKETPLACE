import { readFileSync } from "node:fs";
export async function up(q, transaction) {
  for (const sql of readFileSync(
    new URL("./025-media.sql", import.meta.url),
    "utf8",
  ).split(/^GO\s*$/m))
    if (sql.trim()) await q.sequelize.query(sql, { transaction });
}
