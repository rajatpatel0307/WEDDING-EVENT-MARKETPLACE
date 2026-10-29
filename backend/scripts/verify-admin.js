// Read-only smoke checks. Prints counts and test results, never customer records.
import { sequelize } from "../src/config/database.js";
import { dashboard } from "../src/modules/admin/admin.analytics.js";
import { resources } from "../src/modules/admin/admin.resources.js";
import { list, select } from "../src/modules/admin/admin.repository.js";
import { loadUser } from "../src/modules/auth/token.service.js";
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
  const [admin] = await select(
    "SELECT TOP(1) u.UserId AS id FROM dbo.Users u WHERE u.IsActive=1 AND u.IsBlocked=0 AND u.IsEmailVerified=1 AND EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=u.UserId AND r.RoleCode='ADMIN' AND r.IsActive=1)",
  );
  if (!admin)
    throw new Error(
      "A verified active administrator is required for dashboard verification.",
    );
  const result = await dashboard(
    { from: "2026-10-01", to: "2026-10-27" },
    { auth: { user: await loadUser(admin.id) } },
  );
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
