import { readFile } from "node:fs/promises";

export async function up(queryInterface, transaction) {
  const sql = await readFile(new URL("./035-transactional-email.sql", import.meta.url), "utf8");
  await queryInterface.sequelize.query(sql, { transaction });
}
