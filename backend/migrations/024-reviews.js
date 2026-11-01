import { readFileSync } from "node:fs";
export async function up(q, transaction) {
  // Separate batches allow SQL Server to compile statements referencing new columns.
  for (const sql of readFileSync(
    new URL("./024-reviews.sql", import.meta.url),
    "utf8",
  ).split(/^GO\s*$/m)) {
    if (sql.trim()) await q.sequelize.query(sql, { transaction });
  }
}
