import { sequelize } from "../src/config/database.js";
try {
  const [rows] = await sequelize.query(
    "SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN('ContactMessages','CMSPages','CMSPageVersions','LegalDocumentAcceptances','PrivacyRequests') ORDER BY TABLE_NAME,ORDINAL_POSITION",
  );
  console.log(JSON.stringify(rows));
} finally {
  await sequelize.close();
}
