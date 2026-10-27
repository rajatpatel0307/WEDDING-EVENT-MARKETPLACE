// Uses an existing admin with an ephemeral session, removed in finally.
// Does not print identities, cookies, JWTs, or response bodies.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import { sequelize } from "../src/config/database.js";
import { select } from "../src/modules/admin/admin.repository.js";
import adminRoutes from "../src/modules/admin/admin.routes.js";
import { sign } from "../src/config/jwt.js";
import { cookieNames } from "../src/modules/auth/token.service.js";
const id = randomUUID();
let server,
  sessionCreated = false;
try {
  const [admin] = await select(
    "SELECT TOP(1) u.UserId AS id FROM dbo.Users u WHERE u.IsActive=1 AND u.IsBlocked=0 AND u.IsEmailVerified=1 AND EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=u.UserId AND r.RoleCode='ADMIN' AND r.IsActive=1)",
  );
  if (!admin)
    throw new Error(
      "No verified admin account is available for the authenticated HTTP check.",
    );
  await sequelize.query(
    "INSERT INTO dbo.AuthSessions(id,userId,digest,expiresAt,createdAt) VALUES(:id,:user,:digest,DATEADD(minute,5,SYSUTCDATETIME()),SYSUTCDATETIME())",
    { replacements: { id, user: admin.id, digest: "0".repeat(64) } },
  );
  sessionCreated = true;
  const token = sign({ sub: admin.id, sid: id, purpose: "access" }, "5m");
  const app = express();
  app.use(cookieParser());
  app.use("/api/admin", adminRoutes);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/admin`;
  for (const path of [
    "/dashboard?from=2026-10-01&to=2026-10-27",
    "/categories?pageSize=10",
    "/applications?pageSize=5",
    "/settings",
  ]) {
    const response = await fetch(base + path, {
      headers: { Cookie: `${cookieNames.access}=${token}` },
    });
    assert.equal(response.status, 200, `Authenticated ${path}`);
    await response.json();
    console.log(`PASS authenticated GET ${path.split("?")[0]}`);
  }
} catch (error) {
  console.error("FAIL authenticated HTTP verification:", error.message);
  process.exitCode = 1;
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (sessionCreated)
    await sequelize.query("DELETE FROM dbo.AuthSessions WHERE id=:id", {
      replacements: { id },
    });
  await sequelize.close();
}
