import "dotenv/config";
export const production = process.env.NODE_ENV === "production";
export function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
export function validateEnvironment() {
  if (process.env.DB_DIALECT && process.env.DB_DIALECT !== "mssql")
    throw new Error("DB_DIALECT must be mssql");
  for (const name of [
    "DB_NAME",
    // "DB_USER", // Server SQL authentication; unused with local Windows authentication.
    // "DB_PASSWORD",
    "JWT_SECRET",
    "OTP_SECRET",
    "SMTP_HOST",
    "SMTP_FROM",
    "FRONTEND_URL",
  ])
    required(name);
  if (!(process.env.DB_HOST || process.env.DB_SERVER))
    throw new Error("DB_HOST is required");
  for (const name of ["JWT_SECRET", "OTP_SECRET"])
    if (required(name).length < 32)
      throw new Error(`${name} must contain at least 32 random characters`);
  if (production && !required("FRONTEND_URL").startsWith("https://"))
    throw new Error("Production requires HTTPS");
}
