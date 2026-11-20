// Use the vendor's active business address automatically. Older profiles with no
// business address can still use their active administrator-assigned location.
export const approvedVendor = `v.IsActive=1 AND v.VerificationStatus='Approved'
  AND u.IsActive=1 AND u.IsBlocked=0 AND u.IsEmailVerified=1`;
export const activeRegisteredLocation = `(EXISTS(SELECT 1 FROM dbo.VendorLocations vl
  WHERE vl.VendorId=v.VendorId AND vl.IsActive=1 AND NULLIF(LTRIM(RTRIM(vl.City)), '') IS NOT NULL)
  OR EXISTS(SELECT 1 FROM dbo.AdminLocations al
  WHERE al.LocationId=v.AdminLocationId AND al.IsActive=1 AND al.DeletedAt IS NULL))`;
export const visibleVendor = `${approvedVendor} AND ${activeRegisteredLocation}`;

const clean = value => {
  let sql = `REPLACE(REPLACE(REPLACE(COALESCE(${value},N''),CHAR(9),' '),CHAR(10),' '),CHAR(13),' ')`;
  for (let index = 0; index < 7; index++) sql = `REPLACE(${sql},'  ',' ')`;
  return `LTRIM(RTRIM(${sql}))`;
};

export const registeredLocation = alias => {
  const city = clean("businessLocation.City");
  const countryText = clean("businessLocation.Country");
  const country = `CASE WHEN LOWER(${countryText}) IN ('','in','ind','india') THEN N'India' ELSE ${countryText} END`;
  const stateText = clean("businessLocation.State");
  const state = `CASE WHEN (${country})=N'India' AND LOWER(REPLACE(REPLACE(${stateText},'.',''),' ','')) IN ('up','uttarpradesh') THEN N'Uttar Pradesh' ELSE ${stateText} END`;
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
    WHERE normalized.City<>''
    ORDER BY businessLocation.priority,businessLocation.IsPrimary DESC,businessLocation.CreatedAt,businessLocation.SourceId) ${alias}`;
};
