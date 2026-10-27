import { Sequelize } from "sequelize";
import "dotenv/config";
// Server database configuration (preserved for switching back).
/*
export const sequelize = new Sequelize(
  process.env.DB_NAME || "",
  process.env.DB_USER || "",
  process.env.DB_PASSWORD || "",
  {
    dialect: "mssql",
    host: process.env.DB_HOST || process.env.DB_SERVER || "localhost",
    port: Number(process.env.DB_PORT || 1433),
    logging: false,
    dialectOptions: {
      options: {
        encrypt: process.env.DB_ENCRYPT !== "false",
        trustServerCertificate: process.env.DB_TRUST_CERT === "true",
      },
    },
    pool: { max: 10, min: 0, acquire: 15000 },
    define: { freezeTableName: true, timestamps: false, schema: "dbo" },
  },
);
*/

// Local SQL Express database using the current Windows account.
export const sequelize = new Sequelize({
  dialect: "mssql",
  dialectModulePath: "msnodesqlv8/lib/sequelize",
  host: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  logging: false,
  dialectOptions: {
    options: {
      connectionString: process.env.DB_CONNECTION_STRING,
      trustedConnection: true,
      encrypt: true,
      trustServerCertificate: true,
      requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 0),
    },
  },
  pool: { max: 1, min: 0, idle: 0, acquire: 15000 },
  define: { freezeTableName: true, timestamps: false, schema: "dbo" },
});
