import { DataTypes as D } from "sequelize";
import { UniqueIdentifier as UUID } from "../src/config/mssql-types.js";
import { categories } from "../src/modules/auth/auth.validation.js";
export async function up(q, transaction) {
  const tables = (await q.showAllTables({ transaction })).map((t) =>
    typeof t === "string" ? t : t.tableName,
  );
  for (const name of [
    "Users",
    "Roles",
    "UserRoles",
    "Vendors",
    "VendorDocuments",
    "VendorCategories",
    "VendorLocations",
    "Categories",
    "AuditLogs",
  ])
    if (!tables.includes(name))
      throw Error(
        `Existing table ${name} is missing. Apply the reviewed base schema first.`,
      );
  const users = await q.describeTable("Users", { transaction });
  for (const name of ["TermsAcceptedAt", "PrivacyAcceptedAt"])
    if (!users[name])
      await q.addColumn(
        "Users",
        name,
        { type: D.DATE, allowNull: true },
        { transaction },
      );
  // Fail rather than silently delete or merge existing duplicate phone numbers.
  await q.sequelize.query(
    "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_Users_PhoneNumber' AND object_id=OBJECT_ID('dbo.Users')) CREATE UNIQUE INDEX UX_Users_PhoneNumber ON dbo.Users(PhoneNumber) WHERE PhoneNumber IS NOT NULL",
    { transaction },
  );
  const fk = { model: "Users", key: "UserId" };
  const definitions = {
    AuthOtps: {
      id: { type: D.STRING(64), primaryKey: true },
      userId: { type: UUID, allowNull: false, references: fk },
      purpose: { type: D.STRING(20), allowNull: false },
      digest: { type: D.STRING(64), allowNull: false },
      expiresAt: { type: D.DATE, allowNull: false },
      attempts: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
      sentAt: { type: D.DATE, allowNull: false },
      consumedAt: D.DATE,
    },
    AuthSessions: {
      id: { type: UUID, primaryKey: true },
      userId: { type: UUID, allowNull: false, references: fk },
      digest: { type: D.STRING(64), allowNull: false },
      expiresAt: { type: D.DATE, allowNull: false },
      revokedAt: D.DATE,
      createdAt: { type: D.DATE, allowNull: false },
    },
    AuthResetGrants: {
      id: { type: D.STRING(64), primaryKey: true },
      userId: { type: UUID, allowNull: false, references: fk },
      expiresAt: { type: D.DATE, allowNull: false },
      consumedAt: D.DATE,
    },
    AuthRateLimits: {
      id: { type: D.STRING(64), primaryKey: true },
      count: { type: D.INTEGER, allowNull: false },
      expiresAt: { type: D.DATE, allowNull: false },
    },
  };
  for (const [name, fields] of Object.entries(definitions))
    if (!tables.includes(name))
      await q.createTable(name, fields, { transaction });
  await q.addIndex("AuthSessions", ["userId", "expiresAt"], {
    name: "IX_AuthSessions_User",
    transaction,
  });
  await q.addIndex("AuthResetGrants", ["userId"], {
    name: "IX_AuthResetGrants_User",
    transaction,
  });
  await q.addIndex("AuthRateLimits", ["expiresAt"], {
    name: "IX_AuthRateLimits_Expiry",
    transaction,
  });
  for (let i = 0; i < categories.length; i++) {
    await q.sequelize.query(
      "IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE CategoryName=:name) INSERT INTO dbo.Categories(CategoryCode,CategoryName,SortOrder) VALUES (:code,:name,:sort)",
      {
        replacements: {
          name: categories[i],
          code: `AUTH_SERVICE_${i + 1}`,
          sort: i,
        },
        transaction,
      },
    );
  }
}
