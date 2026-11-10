import { readFile } from "node:fs/promises";
export async function up(q, transaction) {
  const sql = await readFile(
    new URL("./030-sell-book.sql", import.meta.url),
    "utf8",
  );
  await q.sequelize.query(sql, { transaction });
}
