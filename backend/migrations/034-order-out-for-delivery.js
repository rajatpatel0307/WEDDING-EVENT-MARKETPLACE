import { readFile } from "node:fs/promises";

export async function up(queryInterface, transaction) {
  await queryInterface.sequelize.query(await readFile(new URL("./034-order-out-for-delivery.sql", import.meta.url), "utf8"), { transaction });
}
