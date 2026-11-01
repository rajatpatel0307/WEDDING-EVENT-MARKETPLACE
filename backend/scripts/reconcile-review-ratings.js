import { sequelize } from "../src/config/database.js";
import { reconcile } from "../src/modules/reviews/reviews.service.js";
try {
  const [vendors] = await sequelize.query(
    "SELECT VendorId FROM dbo.Vendors ORDER BY VendorId",
  );
  for (const vendor of vendors)
    await sequelize.transaction((tx) => reconcile(vendor.VendorId, tx));
  console.log(`Reconciled ratings for ${vendors.length} vendors.`);
} catch {
  console.error(
    "Rating reconciliation failed. Check database connectivity and migration 024.",
  );
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
