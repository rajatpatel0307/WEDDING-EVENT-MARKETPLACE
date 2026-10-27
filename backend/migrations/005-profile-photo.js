export async function up(queryInterface, transaction) {
  await queryInterface.sequelize.query(
    "IF COL_LENGTH('dbo.Users', 'ProfilePhotoUrl') IS NULL ALTER TABLE dbo.Users ADD ProfilePhotoUrl nvarchar(1000) NULL;",
    { transaction },
  );
}
