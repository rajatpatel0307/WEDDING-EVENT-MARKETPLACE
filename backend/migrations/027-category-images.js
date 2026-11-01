export async function up(q, transaction) {
  await q.sequelize.query("IF COL_LENGTH('dbo.Categories','ImageUrl') IS NULL ALTER TABLE dbo.Categories ADD ImageUrl nvarchar(1000) NULL;", { transaction });
}
