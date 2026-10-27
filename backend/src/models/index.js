import { DataTypes as D } from "sequelize";
import { sequelize } from "../config/database.js";
import { UniqueIdentifier as UUID } from "../config/mssql-types.js";
const uuid = (field) => ({
  type: UUID,
  primaryKey: true,
  defaultValue: D.UUIDV4,
  field,
});
const col = (type, field, extra = {}) => ({ type, field, ...extra });
const dates = {
  createdAt: col(D.DATE, "CreatedAt", { defaultValue: D.NOW }),
  updatedAt: col(D.DATE, "UpdatedAt", { defaultValue: D.NOW }),
};
export const User = sequelize.define("Users", {
  id: uuid("UserId"),
  firstName: col(D.STRING(100), "FirstName"),
  lastName: col(D.STRING(100), "LastName"),
  email: col(D.STRING(320), "Email"),
  phone: col(D.STRING(20), "PhoneNumber"),
  profilePhotoUrl: col(D.STRING(1000), "ProfilePhotoUrl"),
  passwordHash: col(D.STRING(500), "PasswordHash"),
  emailVerified: col(D.BOOLEAN, "IsEmailVerified", { defaultValue: false }),
  active: col(D.BOOLEAN, "IsActive", { defaultValue: true }),
  blocked: col(D.BOOLEAN, "IsBlocked", { defaultValue: false }),
  termsAcceptedAt: col(D.DATE, "TermsAcceptedAt"),
  privacyAcceptedAt: col(D.DATE, "PrivacyAcceptedAt"),
  ...dates,
});
export const Role = sequelize.define("Roles", {
  id: {
    type: D.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: "RoleId",
  },
  code: col(D.STRING(30), "RoleCode"),
  name: col(D.STRING(100), "RoleName"),
  active: col(D.BOOLEAN, "IsActive"),
  ...dates,
});
export const UserRole = sequelize.define("UserRoles", {
  id: {
    type: D.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    field: "UserRoleId",
  },
  userId: col(UUID, "UserId"),
  roleId: col(D.INTEGER, "RoleId"),
  primary: col(D.BOOLEAN, "IsPrimary", { defaultValue: true }),
});
export const Vendor = sequelize.define("Vendors", {
  id: uuid("VendorId"),
  userId: col(UUID, "UserId"),
  businessName: col(D.STRING(200), "BusinessName"),
  slug: col(D.STRING(250), "BusinessSlug"),
  businessDescription: col(D.TEXT, "BusinessDescription"),
  businessEmail: col(D.STRING(320), "ContactEmail"),
  businessPhone: col(D.STRING(20), "ContactPhone"),
  verifiedAt: col(D.DATE, "VerifiedAt"),
  verifiedBy: col(UUID, "VerifiedBy"),
  verificationCycle: col(D.INTEGER, "VerificationCycle", { defaultValue: 1 }),
  verificationStatus: col(D.STRING(30), "VerificationStatus", {
    defaultValue: "Pending",
  }),
  rejectionReason: col(D.STRING(1000), "VerificationRemarks"),
  active: col(D.BOOLEAN, "IsActive", { defaultValue: true }),
  ...dates,
});
export const Category = sequelize.define("Categories", {
  id: {
    type: D.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: "CategoryId",
  },
  name: col(D.STRING(150), "CategoryName"),
  code: col(D.STRING(50), "CategoryCode"),
  active: col(D.BOOLEAN, "IsActive", { defaultValue: true }),
  ...dates,
});
export const VendorCategory = sequelize.define("VendorCategories", {
  id: {
    type: D.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    field: "VendorCategoryId",
  },
  vendorId: col(UUID, "VendorId"),
  categoryId: col(D.INTEGER, "CategoryId"),
  primary: col(D.BOOLEAN, "IsPrimary", { defaultValue: false }),
});
export const VendorLocation = sequelize.define("VendorLocations", {
  id: uuid("VendorLocationId"),
  vendorId: col(UUID, "VendorId"),
  address: col(D.STRING(300), "AddressLine1"),
  city: col(D.STRING(100), "City"),
  state: col(D.STRING(100), "State"),
  country: col(D.STRING(100), "Country"),
  postalCode: col(D.STRING(20), "PostalCode"),
  latitude: col(D.DECIMAL(10, 7), "Latitude"),
  longitude: col(D.DECIMAL(10, 7), "Longitude"),
  ...dates,
});
export const VendorDocument = sequelize.define("VendorDocuments", {
  id: uuid("VendorDocumentId"),
  vendorId: col(UUID, "VendorId"),
  type: col(D.STRING(50), "DocumentType"),
  key: col(D.STRING(1000), "DocumentUrl"),
  ...dates,
});
export const Otp = sequelize.define("AuthOtps", {
  id: { type: D.STRING(64), primaryKey: true },
  userId: UUID,
  purpose: D.STRING(20),
  digest: D.STRING(64),
  expiresAt: D.DATE,
  attempts: D.INTEGER,
  sentAt: D.DATE,
  consumedAt: D.DATE,
});
export const Session = sequelize.define("AuthSessions", {
  id: { type: UUID, primaryKey: true },
  userId: UUID,
  digest: D.STRING(64),
  expiresAt: D.DATE,
  revokedAt: D.DATE,
  createdAt: D.DATE,
});
export const ResetGrant = sequelize.define("AuthResetGrants", {
  id: { type: D.STRING(64), primaryKey: true },
  userId: UUID,
  expiresAt: D.DATE,
  consumedAt: D.DATE,
});
export const Limit = sequelize.define("AuthRateLimits", {
  id: { type: D.STRING(64), primaryKey: true },
  count: D.INTEGER,
  expiresAt: D.DATE,
});
export const Audit = sequelize.define("AuditLogs", {
  id: {
    type: D.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    field: "AuditLogId",
  },
  userId: col(UUID, "UserId"),
  action: col(D.STRING(100), "ActionType"),
  ip: col(D.STRING(45), "IPAddress"),
  entityId: col(D.STRING(100), "EntityId"),
  createdAt: col(D.DATE, "CreatedAt", { defaultValue: D.NOW }),
});
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: "userId",
  otherKey: "roleId",
  as: "roles",
});
Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: "roleId",
  otherKey: "userId",
  as: "users",
});
User.hasOne(Vendor, { foreignKey: "userId", as: "vendor" });
Vendor.belongsTo(User, { foreignKey: "userId", as: "user" });
Vendor.hasMany(VendorLocation, { foreignKey: "vendorId", as: "locations" });
Vendor.hasMany(VendorDocument, { foreignKey: "vendorId", as: "documents" });
Vendor.belongsToMany(Category, {
  through: VendorCategory,
  foreignKey: "vendorId",
  otherKey: "categoryId",
  as: "categories",
});
Category.belongsToMany(Vendor, {
  through: VendorCategory,
  foreignKey: "categoryId",
  otherKey: "vendorId",
});
