export async function up(q, transaction) {
  await q.sequelize.query(
    `IF COL_LENGTH('dbo.BookingChangeRequests','RequestedLocationJson') IS NULL
    ALTER TABLE dbo.BookingChangeRequests ADD RequestedLocationJson nvarchar(max) NULL,OriginalLocationJson nvarchar(max) NULL;`,
    { transaction },
  );
}
