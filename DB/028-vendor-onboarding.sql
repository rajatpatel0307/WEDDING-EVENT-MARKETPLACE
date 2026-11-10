IF COL_LENGTH('dbo.Vendors', 'ProfileDraftJson') IS NULL
    ALTER TABLE dbo.Vendors ADD ProfileDraftJson nvarchar(max) NULL;
