import { Op } from "sequelize";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { sequelize } from "../src/config/database.js";
import {
  Limit,
  Otp,
  Session,
  ResetGrant,
  VendorDocument,
} from "../src/models/index.js";
import { removeStoredFile } from "../src/modules/vendors/documents.service.js";
try {
  const now = new Date();
  for (const model of [Limit, Otp, Session, ResetGrant])
    await model.destroy({ where: { expiresAt: { [Op.lt]: now } } });
  const root = path.resolve(
    process.env.DOCUMENT_STORAGE_PATH || "private-documents",
  );
  const files = await readdir(root).catch((e) => {
    if (e.code === "ENOENT") return [];
    throw e;
  });
  for (const key of files) {
    if (!/^[a-f0-9-]{36}\.(pdf|png|jpg)$/.test(key)) continue;
    const info = await stat(path.join(root, key));
    if (
      info.mtimeMs < Date.now() - 48 * 3600000 &&
      !(await VendorDocument.findOne({ where: { key } }))
    )
      await removeStoredFile(key);
  }
  console.log("Expired authentication state and abandoned uploads cleaned.");
} catch {
  console.error("Cleanup failed.");
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
