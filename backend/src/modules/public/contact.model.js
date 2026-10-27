import { DataTypes as D } from "sequelize";
import { sequelize } from "../../config/database.js";
import { UniqueIdentifier as UUID } from "../../config/mssql-types.js";
export const ContactMessage = sequelize.define("ContactMessages", {
  id: { type: UUID, primaryKey: true, defaultValue: D.UUIDV4, field: "Id" },
  firstName: { type: D.STRING(100), allowNull: false, field: "FirstName" },
  lastName: { type: D.STRING(100), allowNull: false, field: "LastName" },
  email: { type: D.STRING(320), allowNull: false, field: "Email" },
  phone: { type: D.STRING(20), field: "Phone" },
  subject: { type: D.STRING(200), allowNull: false, field: "Subject" },
  category: { type: D.STRING(30), allowNull: false, field: "Category" },
  message: { type: D.TEXT, allowNull: false, field: "Message" },
  status: { type: D.STRING(30), defaultValue: "New", field: "Status" },
  consentedAt: { type: D.DATE, allowNull: false, field: "ConsentedAt" },
  createdAt: { type: D.DATE, defaultValue: D.NOW, field: "CreatedAt" },
  updatedAt: { type: D.DATE, defaultValue: D.NOW, field: "UpdatedAt" },
});
