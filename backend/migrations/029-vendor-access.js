import { readFile } from "node:fs/promises";
export async function up(q, transaction) {
  await q.sequelize.query(await readFile(new URL("./029-vendor-access.sql", import.meta.url), "utf8"), { transaction });
}
