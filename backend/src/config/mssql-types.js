import { DataTypes } from "sequelize";
// Sequelize 6 maps UUID to CHAR(36) for MSSQL. Existing keys are native
// UNIQUEIDENTIFIER, so new foreign-key columns must use the same SQL type.
export class UniqueIdentifier extends DataTypes.UUID.prototype.constructor {
  toSql() {
    return "UNIQUEIDENTIFIER";
  }
}
UniqueIdentifier.prototype.key = "UNIQUEIDENTIFIER";
