// Only this relationship controls marketplace discovery. Addresses and service
// coverage remain independent of the vendor's registered marketplace location.
export const approvedVendor = `v.IsActive=1 AND v.VerificationStatus='Approved'
  AND u.IsActive=1 AND u.IsBlocked=0 AND u.IsEmailVerified=1`;
export const activeRegisteredLocation = `EXISTS(SELECT 1 FROM dbo.AdminLocations al
  WHERE al.LocationId=v.AdminLocationId AND al.IsActive=1 AND al.DeletedAt IS NULL)`;
export const visibleVendor = `${approvedVendor} AND ${activeRegisteredLocation}`;
export const registeredLocation = (
  alias,
) => `OUTER APPLY(SELECT al.LocationId,al.City,al.State,al.Country
  FROM dbo.AdminLocations al WHERE al.LocationId=v.AdminLocationId
  AND al.IsActive=1 AND al.DeletedAt IS NULL) ${alias}`;
