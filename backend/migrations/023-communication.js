import { readFileSync } from "node:fs";
export async function up(q, transaction) {
  await q.sequelize.query(
    readFileSync(new URL("./023-communication.sql", import.meta.url), "utf8"),
    { transaction },
  );
}
