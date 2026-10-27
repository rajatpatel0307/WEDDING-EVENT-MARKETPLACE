// Read-only smoke checks. Prints counts and test results, never customer records.
import { sequelize } from "../src/config/database.js";
import { dashboard } from "../src/modules/admin/admin.analytics.js";
import { resources } from "../src/modules/admin/admin.resources.js";
import { list } from "../src/modules/admin/admin.repository.js";
import { listQuery } from "../src/modules/admin/admin.validation.js";
import { settings } from "../src/modules/admin/admin.service.js";
try {
  await sequelize.authenticate();
  for (const [name, resource] of Object.entries(resources)) {
    const result = await list(
      name,
      listQuery.parse({
        q: "admin-smoke-check",
        status: resource.statuses?.[0] || "",
        from: "2026-01-01",
        to: "2026-12-31",
        sort: Object.keys(resource.fields)[0],
        direction: "asc",
      }),
    );
    console.log(`PASS ${name}: filtered query, ${result.total} matches`);
  }
  const result = await dashboard({ from: "2026-10-01", to: "2026-10-27" });
  console.log(
    `PASS dashboard: ${Object.keys(result.kpis).length} KPIs, ${result.categories.length} categories`,
  );
  await settings();
  console.log("PASS platform settings");
} catch (error) {
  console.error("FAIL admin query verification:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
