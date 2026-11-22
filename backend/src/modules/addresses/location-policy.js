// Use the vendor's active business address automatically. Older profiles with no
// business address can still use their active administrator-assigned location.
export const approvedVendor = `v.IsActive=1 AND v.VerificationStatus='Approved'
  AND u.IsActive=1 AND u.IsBlocked=0 AND u.IsEmailVerified=1`;

const clean = (value) => {
  let sql = `REPLACE(REPLACE(REPLACE(COALESCE(${value},N''),CHAR(9),' '),CHAR(10),' '),CHAR(13),' ')`;
  for (let index = 0; index < 7; index++) sql = `REPLACE(${sql},'  ',' ')`;
  return `LTRIM(RTRIM(${sql}))`;
};

const normalizedFields = (cityColumn, stateColumn, countryColumn) => {
  const city = clean(cityColumn);
  const countryText = clean(countryColumn);
  const country = `CASE WHEN LOWER(${countryText}) IN ('','in','ind','india') THEN N'India' ELSE ${countryText} END`;
  const stateText = clean(stateColumn);
  const state = `CASE WHEN (${country})=N'India' AND LOWER(REPLACE(REPLACE(${stateText},'.',''),' ','')) IN ('up','uttarpradesh') THEN N'Uttar Pradesh' ELSE ${stateText} END`;
  return { city, state, country };
};

export const locationIdentitySql = (cityColumn, stateColumn, countryColumn) => {
  const { city, state, country } = normalizedFields(
    cityColumn,
    stateColumn,
    countryColumn,
  );
  return `CONVERT(varchar(64),HASHBYTES('SHA2_256',LOWER(CONCAT(CONVERT(nvarchar(max),${city}),NCHAR(31),${state},NCHAR(31),${country}))),2)`;
};

export const registeredLocation = (alias, includeHidden = false) => {
  const { city, state, country } = normalizedFields(
    "businessLocation.City",
    "businessLocation.State",
    "businessLocation.Country",
  );
  const catalogControl = includeHidden
    ? ""
    : `OUTER APPLY(SELECT TOP(1) control.LocationId,control.IsActive,control.DeletedAt
    FROM dbo.AdminLocations control
    WHERE ${locationIdentitySql("control.City", "control.State", "control.Country")}=CONVERT(varchar(64),HASHBYTES('SHA2_256',LOWER(CONCAT(CONVERT(nvarchar(max),normalized.City),NCHAR(31),normalized.State,NCHAR(31),normalized.Country))),2)
    ORDER BY CASE WHEN control.DeletedAt IS NULL THEN 0 ELSE 1 END,control.UpdatedAt DESC,control.LocationId) cityControl`;
  return `OUTER APPLY(SELECT TOP(1)
    CONVERT(varchar(64),HASHBYTES('SHA2_256',LOWER(CONCAT(CONVERT(nvarchar(max),normalized.City),NCHAR(31),normalized.State,NCHAR(31),normalized.Country))),2) AS LocationId,
    normalized.City,normalized.State,normalized.Country
    FROM (
      SELECT vl.VendorLocationId AS SourceId,vl.City,vl.State,vl.Country,0 AS priority,vl.IsPrimary,vl.CreatedAt
      FROM dbo.VendorLocations vl WHERE vl.VendorId=v.VendorId AND vl.IsActive=1
        AND NULLIF(LTRIM(RTRIM(vl.City)), '') IS NOT NULL
      UNION ALL
      SELECT al.LocationId,al.City,al.State,al.Country,1,0,al.CreatedAt
      FROM dbo.AdminLocations al WHERE al.LocationId=v.AdminLocationId AND al.IsActive=1 AND al.DeletedAt IS NULL
    ) businessLocation
    CROSS APPLY(SELECT ${city} AS City,${state} AS State,${country} AS Country) normalized
    ${catalogControl}
    WHERE normalized.City<>''
    ${includeHidden ? "" : "AND (cityControl.LocationId IS NULL OR (cityControl.IsActive=1 AND cityControl.DeletedAt IS NULL))"}
    ORDER BY businessLocation.priority,businessLocation.IsPrimary DESC,businessLocation.CreatedAt,businessLocation.SourceId) ${alias}`;
};

export const activeRegisteredLocation = `EXISTS(SELECT 1 FROM dbo.Vendors locationOwner
  ${registeredLocation("activeLocation")}
  WHERE locationOwner.VendorId=v.VendorId AND activeLocation.LocationId IS NOT NULL)`;
export const visibleVendor = `${approvedVendor} AND ${activeRegisteredLocation}`;
