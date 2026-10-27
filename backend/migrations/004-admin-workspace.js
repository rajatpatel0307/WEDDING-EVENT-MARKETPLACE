export async function up(q, transaction) {
  await q.sequelize.query(
    `
    IF OBJECT_ID('dbo.EventGuests') IS NULL
    CREATE TABLE dbo.EventGuests(
      GuestId uniqueidentifier NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
      EventId uniqueidentifier NOT NULL REFERENCES dbo.Events(EventId),
      GuestName nvarchar(200) NOT NULL,Email varchar(320) NULL,Phone varchar(20) NULL,
      RsvpStatus varchar(20) NOT NULL DEFAULT 'Invited' CHECK(RsvpStatus IN ('Invited','Accepted','Declined','Attended')),
      CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),UpdatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    IF OBJECT_ID('dbo.PlatformSettings') IS NULL
    CREATE TABLE dbo.PlatformSettings(SettingKey varchar(100) NOT NULL PRIMARY KEY,SettingValue nvarchar(1000) NOT NULL,UpdatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
  `,
    { transaction },
  );
}
