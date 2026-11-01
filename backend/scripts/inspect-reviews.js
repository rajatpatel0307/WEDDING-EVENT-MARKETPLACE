import { sequelize } from '../src/config/database.js';
try {
  const [rows] = await sequelize.query("SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('Reviews','ReviewImages','Booking','BookingItems') ORDER BY TABLE_NAME,ORDINAL_POSITION");
  console.log(JSON.stringify(rows));
} catch { console.error('Database inspection unavailable.'); process.exitCode=1; }
finally { await sequelize.close(); }
