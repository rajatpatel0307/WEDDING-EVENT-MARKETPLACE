import { readFileSync } from "node:fs";
import { template } from "../src/modules/cms/cms.templates.js";
export async function up(q, transaction) {
  for (const sql of readFileSync(
    new URL("./026-content-support.sql", import.meta.url),
    "utf8",
  ).split(/^GO\s*$/m))
    if (sql.trim()) await q.sequelize.query(sql, { transaction });
  for (const key of ["about-us", "contact", "terms", "privacy"])
    await q.sequelize.query(
      "IF NOT EXISTS(SELECT 1 FROM dbo.CMSPageVersions WHERE PageKey=:key) INSERT dbo.CMSPageVersions(PageKey,VersionNumber,ContentJson,Status,PublishedAt) VALUES(:key,1,:content,:status,CASE WHEN :status = 'Published' THEN SYSUTCDATETIME() ELSE NULL END)",
      {
        replacements: {
          key,
          content: JSON.stringify(template(key)),
          status: ["terms", "privacy"].includes(key) ? "Draft" : "Published",
        },
        transaction,
      },
    );
}
