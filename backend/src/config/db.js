
// import sql from "mssql"; // Server SQL authentication driver.
import sql from "mssql/msnodesqlv8.js";
import "dotenv/config";

// Server database configuration (preserved for switching back).
/*
const requiredVariables = [
    "DB_SERVER",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
];

for (const variable of requiredVariables) {
    if (!process.env[variable]) {
        throw new Error(
            `Missing environment variable: ${variable}`
        );
    }
}

const dbConfig = {
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    options: {
        encrypt: process.env.DB_ENCRYPT === "true",
        trustServerCertificate:
            process.env.DB_TRUST_CERT === "true",
    },

    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },

    connectionTimeout: 15000,
    requestTimeout: 15000,
};

*/

// Local SQL Express database using Windows authentication.
const dbConfig = {
    connectionString: process.env.DB_CONNECTION_STRING,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        trustedConnection: true,
        encrypt: true,
        trustServerCertificate: true,
    },
    pool: { max: 1, min: 0, idleTimeoutMillis: 1 },
    connectionTimeout: 15000,
    requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 0),
};

export const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then((pool) => {
        console.log("Microsoft SQL Server connected successfully");
        return pool;
    })
    .catch((error) => {
        console.error(
            "SQL Server connection failed:",
            error.message
        );
        throw error;
    });

export { sql };
