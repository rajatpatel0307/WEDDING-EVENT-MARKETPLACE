export async function up(q, transaction) {
  const run = (sql) => q.sequelize.query(sql, { transaction });
  await run(`IF COL_LENGTH('dbo.Events','EndDate') IS NULL ALTER TABLE dbo.Events ADD EndDate date NULL,BrideName nvarchar(150) NULL,GroomName nvarchar(150) NULL;
 IF COL_LENGTH('dbo.EventGuests','GroupName') IS NULL ALTER TABLE dbo.EventGuests ADD GroupName nvarchar(100) NULL,InvitationStatus varchar(20) NULL,Attendees int NOT NULL DEFAULT 1,DietaryPreferences nvarchar(500) NULL,Notes nvarchar(1000) NULL;`);
  await run(`IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Events_EndDate') ALTER TABLE dbo.Events WITH CHECK ADD CONSTRAINT CK_Events_EndDate CHECK(EndDate IS NULL OR EndDate>=EventDate);
 IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Guests_Attendees') ALTER TABLE dbo.EventGuests WITH CHECK ADD CONSTRAINT CK_Guests_Attendees CHECK(Attendees BETWEEN 1 AND 100);
 IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='CK_Guests_Invitation') ALTER TABLE dbo.EventGuests WITH CHECK ADD CONSTRAINT CK_Guests_Invitation CHECK(InvitationStatus IS NULL OR InvitationStatus IN('NotSent','Sent'));`);
}
