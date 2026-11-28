import { readFile } from "node:fs/promises";

export async function up(queryInterface, transaction) {
  const source = await readFile(new URL("./038-order-reviews.sql", import.meta.url), "utf8");
  for (const sql of source.split(/^GO\s*$/m)) {
    if (sql.trim()) await queryInterface.sequelize.query(sql, { transaction });
  }
}
