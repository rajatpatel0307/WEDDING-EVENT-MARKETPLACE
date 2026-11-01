import { sequelize } from "../src/config/database.js";
import { processCleanup } from "../src/modules/media/media.cleanup.js";
try {
  console.log(
    JSON.stringify(
      await processCleanup({ apply: process.argv.includes("--apply") }),
      null,
      2,
    ),
  );
} catch {
  console.error(
    "Media cleanup unavailable. Check migration 025 and storage configuration.",
  );
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
