import { sequelize } from "../src/config/database.js";
import { User, Role, UserRole, Audit } from "../src/models/index.js";
import { email, password } from "../src/modules/auth/auth.validation.js";
import { hashPassword } from "../src/modules/auth/password.service.js";
// Supply secrets through the process environment, never command-line arguments.
try {
  const address = email.parse(process.env.ADMIN_EMAIL),
    secret = password.parse(process.env.ADMIN_PASSWORD);
  const hash = await hashPassword(secret);
  await sequelize.transaction(async (transaction) => {
    if (await User.findOne({ where: { email: address }, transaction }))
      throw Error("Account exists; refusing to promote an existing account.");
    const role = await Role.findOne({
      where: { code: "ADMIN", active: true },
      transaction,
    });
    if (!role) throw Error("Admin role missing");
    const user = await User.create(
      {
        firstName: process.env.ADMIN_FIRST_NAME || "Administrator",
        lastName: process.env.ADMIN_LAST_NAME || "",
        email: address,
        passwordHash: hash,
        emailVerified: true,
      },
      { transaction },
    );
    await UserRole.create(
      { userId: user.id, roleId: role.id },
      { transaction },
    );
    await Audit.create(
      { userId: user.id, action: "ADMIN_PROVISIONED" },
      { transaction },
    );
  });
  console.log("Administrator created.");
} catch (error) {
  console.error(
    "Administrator creation failed:",
    error.name === "ZodError"
      ? "Invalid administrator email or password."
      : error.message,
  );
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
