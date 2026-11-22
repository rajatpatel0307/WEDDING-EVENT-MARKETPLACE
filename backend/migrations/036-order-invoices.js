import { readFile } from "node:fs/promises";
export async function up(queryInterface, transaction) {
  await queryInterface.sequelize.query(await readFile(new URL("./036-order-invoices.sql", import.meta.url), "utf8"), { transaction });
}
