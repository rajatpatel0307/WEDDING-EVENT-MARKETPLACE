import assert from "node:assert/strict";
import { sequelize } from "../src/config/database.js";
import { up } from "../migrations/021-wishlist-locations.js";
const rollback = new Error("ROLLBACK");
try {
  await sequelize.transaction(async (transaction) => {
    await up(sequelize.getQueryInterface(), transaction);
    const [rows] = await sequelize.query(
      "SELECT COL_LENGTH('dbo.Events','LocationJson') AS eventLocation,COL_LENGTH('dbo.Addresses','FullName') AS contact",
      { transaction },
    );
    assert.ok(rows[0].eventLocation && rows[0].contact);
    throw rollback;
  });
} catch (e) {
  if (e === rollback)
    console.log(
      "Location migration passed against MSSQL; all schema changes rolled back.",
    );
  else {
    console.error(e.message);
    process.exitCode = 1;
  }
} finally {
  await sequelize.close();
}
