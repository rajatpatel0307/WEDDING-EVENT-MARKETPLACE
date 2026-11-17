import { readFile } from "node:fs/promises";

export async function up(q, transaction) {
  await q.sequelize.query(
    await readFile(new URL("./032-booking-numbers.sql", import.meta.url), "utf8"),
    { transaction },
  );
}
